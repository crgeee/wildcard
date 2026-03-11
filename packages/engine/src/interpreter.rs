use crate::ast::*;
use crate::runtime::{EngineOutput, Runtime, Value};

impl Runtime {
    pub fn execute_handler(
        &mut self,
        handler: &Handler,
        args: &[Value],
    ) -> Result<Option<Value>, String> {
        // Bind parameters
        for (i, param) in handler.params.iter().enumerate() {
            let val = args.get(i).cloned().unwrap_or(Value::Empty);
            self.set_variable(param, val);
        }

        for stmt in &handler.body {
            match self.execute_statement(stmt) {
                Ok(()) => {}
                Err(e) if e.starts_with("__return__:") => {
                    // Return value encoded in error message (simple control flow)
                    let val_str = &e["__return__:".len()..];
                    if val_str.is_empty() {
                        return Ok(None);
                    }
                    // Parse return value back
                    return Ok(Some(Value::Text(val_str.to_string())));
                }
                Err(e) => return Err(e),
            }
        }

        Ok(None)
    }

    pub fn execute_statement(&mut self, stmt: &Statement) -> Result<(), String> {
        match stmt {
            Statement::Put { value, target } => {
                let val = self.evaluate_expression(value)?;
                self.assign_target(target, val)?;
            }

            Statement::Go { destination } => {
                let (direction, card_name) = match destination {
                    GoDestination::Next => ("next".to_string(), None),
                    GoDestination::Prev => ("prev".to_string(), None),
                    GoDestination::First => ("first".to_string(), None),
                    GoDestination::Last => ("last".to_string(), None),
                    GoDestination::CardByName(name) => {
                        ("direct".to_string(), Some(name.clone()))
                    }
                    GoDestination::CardByExpr(expr) => {
                        let val = self.evaluate_expression(expr)?;
                        ("direct".to_string(), Some(val.to_text()))
                    }
                };
                self.events.push(EngineOutput::GoToCard {
                    direction,
                    card_name,
                });
            }

            Statement::If {
                condition,
                then_body,
                else_body,
            } => {
                let cond = self.evaluate_expression(condition)?;
                if cond.is_truthy() {
                    for s in then_body {
                        self.execute_statement(s)?;
                    }
                } else if let Some(else_stmts) = else_body {
                    for s in else_stmts {
                        self.execute_statement(s)?;
                    }
                }
            }

            Statement::Repeat {
                var,
                start,
                end,
                body,
            } => {
                let start_val = self.evaluate_expression(start)?.to_number() as i64;
                let end_val = self.evaluate_expression(end)?.to_number() as i64;

                let mut i = start_val;
                let max_iterations = 100_000; // Safety limit
                let mut count = 0;
                while i <= end_val && count < max_iterations {
                    self.set_variable(var, Value::Number(i as f64));
                    for s in body {
                        self.execute_statement(s)?;
                    }
                    i += 1;
                    count += 1;
                }
            }

            Statement::RepeatWhile { condition, body } => {
                let max_iterations = 100_000;
                let mut count = 0;
                loop {
                    let cond = self.evaluate_expression(condition)?;
                    if !cond.is_truthy() || count >= max_iterations {
                        break;
                    }
                    for s in body {
                        self.execute_statement(s)?;
                    }
                    count += 1;
                }
            }

            Statement::Set { property, value } => {
                let val = self.evaluate_expression(value)?;
                let obj_text = self.expression_to_object_id(&property.object);
                self.events.push(EngineOutput::SetProperty {
                    object: obj_text,
                    property: property.property.clone(),
                    value: val.to_text(),
                });
            }

            Statement::Show { target } => {
                let target_text = self.expression_to_object_id(target);
                self.events.push(EngineOutput::ShowObject {
                    target: target_text,
                });
            }

            Statement::Hide { target } => {
                let target_text = self.expression_to_object_id(target);
                self.events.push(EngineOutput::HideObject {
                    target: target_text,
                });
            }

            Statement::Answer { message } => {
                let msg = self.evaluate_expression(message)?;
                self.events.push(EngineOutput::ShowMessage {
                    message: msg.to_text(),
                    style: "answer".to_string(),
                });
            }

            Statement::Ask { prompt } => {
                let msg = self.evaluate_expression(prompt)?;
                self.events.push(EngineOutput::ShowMessage {
                    message: msg.to_text(),
                    style: "ask".to_string(),
                });
            }

            Statement::PlaySound { sound } => {
                let snd = self.evaluate_expression(sound)?;
                self.events.push(EngineOutput::PlaySound {
                    sound: snd.to_text(),
                });
            }

            Statement::Wait { duration } => {
                let dur = self.evaluate_expression(duration)?;
                self.events.push(EngineOutput::WaitSeconds {
                    seconds: dur.to_number(),
                });
            }

            Statement::Pass { message: _ } => {
                // Pass message up the hierarchy — for now, just a no-op
                // (message passing hierarchy will be implemented with full stack model)
            }

            Statement::Return { value } => {
                let val = if let Some(expr) = value {
                    self.evaluate_expression(expr)?.to_text()
                } else {
                    String::new()
                };
                return Err(format!("__return__:{}", val));
            }

            Statement::Send { message, target } => {
                let _target_text = self.expression_to_object_id(target);
                // For now, just dispatch the message to ourselves
                // Full hierarchy-based sending will come later
                if let Some(handler) = self.handlers.get(message).cloned() {
                    let saved_vars = self.variables.clone();
                    let saved_globals = self.current_globals.clone();
                    self.variables.clear();
                    self.current_globals.clear();
                    let _ = self.execute_handler(&handler, &[]);
                    self.variables = saved_vars;
                    self.current_globals = saved_globals;
                }
            }

            Statement::Global { names } => {
                for name in names {
                    self.current_globals.push(name.clone());
                    // If there's no global value yet, initialize from local or empty
                    let lower = name.to_lowercase();
                    if !self.globals.contains_key(&lower) {
                        if let Some(local) = self.variables.get(&lower) {
                            self.globals.insert(lower, local.clone());
                        } else {
                            self.globals.insert(lower, Value::Empty);
                        }
                    }
                }
            }

            Statement::Fetch { url, target } => {
                let url_val = self.evaluate_expression(url)?;
                let target_name = match target {
                    Expression::Variable(name) => name.clone(),
                    _ => "it".to_string(),
                };
                self.events.push(EngineOutput::FetchUrl {
                    url: url_val.to_text(),
                    variable: target_name,
                });
            }

            Statement::ExpressionStatement { expr } => {
                // Evaluate the expression (might be a function call)
                let val = self.evaluate_expression(expr)?;
                // Store result in "it"
                self.set_variable("it", val);
            }
        }

        Ok(())
    }

    pub fn evaluate_expression(&mut self, expr: &Expression) -> Result<Value, String> {
        match expr {
            Expression::StringLiteral(s) => Ok(Value::Text(s.clone())),
            Expression::NumberLiteral(n) => Ok(Value::Number(*n)),
            Expression::BoolLiteral(b) => Ok(Value::Boolean(*b)),

            Expression::Variable(name) => {
                let lower = name.to_lowercase();
                Ok(self.get_variable(&lower).unwrap_or(Value::Empty))
            }

            Expression::It => Ok(self.get_variable("it").unwrap_or(Value::Empty)),

            Expression::Empty => Ok(Value::Empty),

            Expression::FieldRef { name } => {
                let field_name = self.evaluate_expression(name)?.to_text();
                Ok(self.get_field(&field_name))
            }

            Expression::ButtonRef { name } => {
                let btn_name = self.evaluate_expression(name)?.to_text();
                // Buttons don't have a "value" per se — return the name as reference
                Ok(Value::Text(format!("button:{}", btn_name)))
            }

            Expression::BinaryOp { left, op, right } => {
                let lval = self.evaluate_expression(left)?;
                let rval = self.evaluate_expression(right)?;
                self.evaluate_binary_op(&lval, op, &rval)
            }

            Expression::UnaryOp { op, operand } => {
                let val = self.evaluate_expression(operand)?;
                match op {
                    UnaryOp::Not => Ok(Value::Boolean(!val.is_truthy())),
                    UnaryOp::Negate => Ok(Value::Number(-val.to_number())),
                }
            }

            Expression::FunctionCall { name, args } => {
                let mut arg_vals = Vec::new();
                for arg in args {
                    arg_vals.push(self.evaluate_expression(arg)?);
                }
                self.call_function(name, &arg_vals)
            }

            Expression::PropertyOf { property, object } => {
                let obj_val = self.evaluate_expression(object)?;
                self.get_property(property, &obj_val)
            }

            Expression::ChunkExpr {
                chunk_type,
                index,
                source,
            } => {
                let idx = self.evaluate_expression(index)?.to_number();
                let src = self.evaluate_expression(source)?.to_text();
                self.get_chunk(chunk_type, idx, &src)
            }
        }
    }

    fn evaluate_binary_op(
        &self,
        left: &Value,
        op: &BinaryOp,
        right: &Value,
    ) -> Result<Value, String> {
        match op {
            BinaryOp::Add => Ok(Value::Number(left.to_number() + right.to_number())),
            BinaryOp::Subtract => Ok(Value::Number(left.to_number() - right.to_number())),
            BinaryOp::Multiply => Ok(Value::Number(left.to_number() * right.to_number())),
            BinaryOp::Divide => {
                let r = right.to_number();
                if r == 0.0 {
                    Err("Division by zero".to_string())
                } else {
                    Ok(Value::Number(left.to_number() / r))
                }
            }
            BinaryOp::Mod => {
                let r = right.to_number();
                if r == 0.0 {
                    Err("Modulo by zero".to_string())
                } else {
                    Ok(Value::Number(left.to_number() % r))
                }
            }
            BinaryOp::Exponent => {
                Ok(Value::Number(left.to_number().powf(right.to_number())))
            }
            BinaryOp::Concat => {
                Ok(Value::Text(format!("{}{}", left.to_text(), right.to_text())))
            }
            BinaryOp::ConcatWithSpace => {
                Ok(Value::Text(format!("{} {}", left.to_text(), right.to_text())))
            }
            BinaryOp::Equal | BinaryOp::Is => {
                // HyperTalk comparison is case-insensitive for strings
                let result = left.to_text().to_lowercase() == right.to_text().to_lowercase();
                Ok(Value::Boolean(result))
            }
            BinaryOp::NotEqual => {
                let result = left.to_text().to_lowercase() != right.to_text().to_lowercase();
                Ok(Value::Boolean(result))
            }
            BinaryOp::LessThan => Ok(Value::Boolean(left.to_number() < right.to_number())),
            BinaryOp::GreaterThan => Ok(Value::Boolean(left.to_number() > right.to_number())),
            BinaryOp::LessOrEqual => Ok(Value::Boolean(left.to_number() <= right.to_number())),
            BinaryOp::GreaterOrEqual => {
                Ok(Value::Boolean(left.to_number() >= right.to_number()))
            }
            BinaryOp::And => Ok(Value::Boolean(left.is_truthy() && right.is_truthy())),
            BinaryOp::Or => Ok(Value::Boolean(left.is_truthy() || right.is_truthy())),
            BinaryOp::Contains => {
                let l = left.to_text().to_lowercase();
                let r = right.to_text().to_lowercase();
                Ok(Value::Boolean(l.contains(&r)))
            }
        }
    }

    fn assign_target(&mut self, target: &Expression, value: Value) -> Result<(), String> {
        match target {
            Expression::Variable(name) => {
                self.set_variable(name, value);
            }
            Expression::FieldRef { name } => {
                let field_name = self.evaluate_expression(name)?.to_text();
                self.set_field(&field_name, &value.to_text());
            }
            Expression::It => {
                self.set_variable("it", value);
            }
            _ => {
                // Try to evaluate as a variable name
                let text = self.evaluate_expression(target)?.to_text();
                self.set_variable(&text, value);
            }
        }
        Ok(())
    }

    fn expression_to_object_id(&mut self, expr: &Expression) -> String {
        match expr {
            Expression::FieldRef { name } => {
                let n = self.evaluate_expression(name).unwrap_or(Value::Empty);
                format!("field:{}", n.to_text())
            }
            Expression::ButtonRef { name } => {
                let n = self.evaluate_expression(name).unwrap_or(Value::Empty);
                format!("button:{}", n.to_text())
            }
            Expression::Variable(name) => name.clone(),
            Expression::StringLiteral(s) => s.clone(),
            _ => {
                self.evaluate_expression(expr)
                    .map(|v| v.to_text())
                    .unwrap_or_default()
            }
        }
    }

    fn call_function(&mut self, name: &str, args: &[Value]) -> Result<Value, String> {
        match name.to_lowercase().as_str() {
            "length" => {
                let s = args.first().unwrap_or(&Value::Empty).to_text();
                Ok(Value::Number(s.len() as f64))
            }
            "abs" => {
                let n = args.first().unwrap_or(&Value::Empty).to_number();
                Ok(Value::Number(n.abs()))
            }
            "round" => {
                let n = args.first().unwrap_or(&Value::Empty).to_number();
                Ok(Value::Number(n.round()))
            }
            "trunc" => {
                let n = args.first().unwrap_or(&Value::Empty).to_number();
                Ok(Value::Number(n.trunc()))
            }
            "random" => {
                let max = args.first().unwrap_or(&Value::Empty).to_number() as u64;
                if max == 0 {
                    Ok(Value::Number(0.0))
                } else {
                    // Simple deterministic "random" for now (proper RNG later)
                    Ok(Value::Number(1.0))
                }
            }
            "min" => {
                let mut result = f64::INFINITY;
                for arg in args {
                    let n = arg.to_number();
                    if n < result {
                        result = n;
                    }
                }
                Ok(Value::Number(result))
            }
            "max" => {
                let mut result = f64::NEG_INFINITY;
                for arg in args {
                    let n = arg.to_number();
                    if n > result {
                        result = n;
                    }
                }
                Ok(Value::Number(result))
            }
            "sqrt" => {
                let n = args.first().unwrap_or(&Value::Empty).to_number();
                Ok(Value::Number(n.sqrt()))
            }
            "sin" => {
                let n = args.first().unwrap_or(&Value::Empty).to_number();
                Ok(Value::Number(n.sin()))
            }
            "cos" => {
                let n = args.first().unwrap_or(&Value::Empty).to_number();
                Ok(Value::Number(n.cos()))
            }
            "tan" => {
                let n = args.first().unwrap_or(&Value::Empty).to_number();
                Ok(Value::Number(n.tan()))
            }
            "atan" => {
                let n = args.first().unwrap_or(&Value::Empty).to_number();
                Ok(Value::Number(n.atan()))
            }
            "exp" => {
                let n = args.first().unwrap_or(&Value::Empty).to_number();
                Ok(Value::Number(n.exp()))
            }
            "ln" => {
                let n = args.first().unwrap_or(&Value::Empty).to_number();
                Ok(Value::Number(n.ln()))
            }
            "offset" => {
                // offset(needle, haystack)
                let needle = args.first().unwrap_or(&Value::Empty).to_text();
                let haystack = args.get(1).unwrap_or(&Value::Empty).to_text();
                let pos = haystack.find(&needle).map(|p| p + 1).unwrap_or(0);
                Ok(Value::Number(pos as f64))
            }
            "numtochar" | "numToChar" => {
                let n = args.first().unwrap_or(&Value::Empty).to_number() as u32;
                let ch = char::from_u32(n).unwrap_or('\0');
                Ok(Value::Text(ch.to_string()))
            }
            "chartonum" | "charToNum" => {
                let s = args.first().unwrap_or(&Value::Empty).to_text();
                let n = s.chars().next().map(|c| c as u32).unwrap_or(0);
                Ok(Value::Number(n as f64))
            }
            "average" => {
                if args.is_empty() {
                    return Ok(Value::Number(0.0));
                }
                let sum: f64 = args.iter().map(|a| a.to_number()).sum();
                Ok(Value::Number(sum / args.len() as f64))
            }
            "number" => {
                // number of words/lines/items/chars in a string
                // For now just return string length
                let s = args.first().unwrap_or(&Value::Empty).to_text();
                Ok(Value::Number(s.len() as f64))
            }
            _ => {
                // Check if there's a user-defined handler with this name
                if let Some(handler) = self.handlers.get(&name.to_lowercase()).cloned() {
                    let saved_vars = self.variables.clone();
                    let saved_globals = self.current_globals.clone();
                    self.variables.clear();
                    self.current_globals.clear();

                    let result = self.execute_handler(&handler, args);

                    self.variables = saved_vars;
                    self.current_globals = saved_globals;

                    match result {
                        Ok(Some(val)) => Ok(val),
                        Ok(None) => Ok(Value::Empty),
                        Err(e) => Err(e),
                    }
                } else {
                    Err(format!("Unknown function: {}", name))
                }
            }
        }
    }

    fn get_property(&self, property: &str, object: &Value) -> Result<Value, String> {
        match property.to_lowercase().as_str() {
            "length" => Ok(Value::Number(object.to_text().len() as f64)),
            "number" => {
                // "the number of <chunk> of <text>" — parsed as property access
                Ok(Value::Number(object.to_text().len() as f64))
            }
            _ => {
                // Return empty for unknown properties — the renderer will resolve them
                Ok(Value::Empty)
            }
        }
    }

    fn get_chunk(&self, chunk_type: &ChunkType, index: f64, source: &str) -> Result<Value, String> {
        let idx = index as i64;

        match chunk_type {
            ChunkType::Word => {
                let words: Vec<&str> = source.split_whitespace().collect();
                let i = if idx < 0 {
                    // -1 = last
                    words.len() as i64 + idx
                } else {
                    idx - 1 // 1-based
                };
                Ok(words
                    .get(i as usize)
                    .map(|w| Value::Text(w.to_string()))
                    .unwrap_or(Value::Empty))
            }
            ChunkType::Line => {
                let lines: Vec<&str> = source.lines().collect();
                let i = if idx < 0 {
                    lines.len() as i64 + idx
                } else {
                    idx - 1
                };
                Ok(lines
                    .get(i as usize)
                    .map(|l| Value::Text(l.to_string()))
                    .unwrap_or(Value::Empty))
            }
            ChunkType::Item => {
                let items: Vec<&str> = source.split(',').collect();
                let i = if idx < 0 {
                    items.len() as i64 + idx
                } else {
                    idx - 1
                };
                Ok(items
                    .get(i as usize)
                    .map(|item| Value::Text(item.trim().to_string()))
                    .unwrap_or(Value::Empty))
            }
            ChunkType::Character => {
                let chars: Vec<char> = source.chars().collect();
                let i = if idx < 0 {
                    chars.len() as i64 + idx
                } else {
                    idx - 1
                };
                Ok(chars
                    .get(i as usize)
                    .map(|c| Value::Text(c.to_string()))
                    .unwrap_or(Value::Empty))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_put_into_variable() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  put 42 into x\nend test")
            .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Number(42.0)));
    }

    #[test]
    fn test_put_string_into_variable() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  put \"hello\" into msg\nend test")
            .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("msg"), Some(Value::Text("hello".into())));
    }

    #[test]
    fn test_if_true() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  put 1 into x\n  if x = 1 then\n    put \"yes\" into result\n  end if\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(
            rt.get_variable("result"),
            Some(Value::Text("yes".into()))
        );
    }

    #[test]
    fn test_if_false() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  put 1 into x\n  if x = 2 then\n    put \"yes\" into result\n  else\n    put \"no\" into result\n  end if\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(
            rt.get_variable("result"),
            Some(Value::Text("no".into()))
        );
    }

    #[test]
    fn test_repeat_loop() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  put 0 into sum\n  repeat with i = 1 to 5\n    put sum + i into sum\n  end repeat\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("sum"), Some(Value::Number(15.0)));
    }

    #[test]
    fn test_string_concat() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  put \"Hello\" & \" World\" into msg\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(
            rt.get_variable("msg"),
            Some(Value::Text("Hello World".into()))
        );
    }

    #[test]
    fn test_string_concat_with_space() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  put \"Hello\" && \"World\" into msg\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(
            rt.get_variable("msg"),
            Some(Value::Text("Hello World".into()))
        );
    }

    #[test]
    fn test_go_emits_event() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  go to next card\nend test")
            .unwrap();
        rt.send_message("test");
        assert!(rt
            .events()
            .iter()
            .any(|e| matches!(e, EngineOutput::GoToCard { .. })));
    }

    #[test]
    fn test_go_prev() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  go to prev card\nend test")
            .unwrap();
        rt.send_message("test");
        let event = &rt.events()[0];
        match event {
            EngineOutput::GoToCard { direction, .. } => assert_eq!(direction, "prev"),
            other => panic!("Expected GoToCard, got {:?}", other),
        }
    }

    #[test]
    fn test_answer_emits_event() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  answer \"Hello!\"\nend test")
            .unwrap();
        rt.send_message("test");
        assert!(rt
            .events()
            .iter()
            .any(|e| matches!(e, EngineOutput::ShowMessage { style, .. } if style == "answer")));
    }

    #[test]
    fn test_ask_emits_event() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  ask \"Name?\"\nend test")
            .unwrap();
        rt.send_message("test");
        assert!(rt
            .events()
            .iter()
            .any(|e| matches!(e, EngineOutput::ShowMessage { style, .. } if style == "ask")));
    }

    #[test]
    fn test_set_property_emits_event() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  set the color of button \"submit\" to \"red\"\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert!(rt.events().iter().any(
            |e| matches!(e, EngineOutput::SetProperty { property, value, .. } if property == "color" && value == "red")
        ));
    }

    #[test]
    fn test_show_emits_event() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  show button \"Go\"\nend test")
            .unwrap();
        rt.send_message("test");
        assert!(rt
            .events()
            .iter()
            .any(|e| matches!(e, EngineOutput::ShowObject { .. })));
    }

    #[test]
    fn test_hide_emits_event() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  hide button \"Secret\"\nend test")
            .unwrap();
        rt.send_message("test");
        assert!(rt
            .events()
            .iter()
            .any(|e| matches!(e, EngineOutput::HideObject { .. })));
    }

    #[test]
    fn test_play_sound_emits_event() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  play sound \"click.wav\"\nend test")
            .unwrap();
        rt.send_message("test");
        assert!(rt.events().iter().any(
            |e| matches!(e, EngineOutput::PlaySound { sound } if sound == "click.wav")
        ));
    }

    #[test]
    fn test_wait_emits_event() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  wait 2 seconds\nend test")
            .unwrap();
        rt.send_message("test");
        assert!(rt
            .events()
            .iter()
            .any(|e| matches!(e, EngineOutput::WaitSeconds { seconds } if *seconds == 2.0)));
    }

    #[test]
    fn test_arithmetic() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  put 10 + 5 * 2 into x\nend test")
            .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Number(20.0)));
    }

    #[test]
    fn test_arithmetic_subtraction() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  put 10 - 3 into x\nend test")
            .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Number(7.0)));
    }

    #[test]
    fn test_arithmetic_division() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  put 10 / 2 into x\nend test")
            .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Number(5.0)));
    }

    #[test]
    fn test_comparison_greater() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  if 5 > 3 then\n    put \"yes\" into x\n  end if\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Text("yes".into())));
    }

    #[test]
    fn test_comparison_less() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  if 2 < 5 then\n    put \"yes\" into x\n  end if\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Text("yes".into())));
    }

    #[test]
    fn test_boolean_and() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  if true and true then\n    put \"yes\" into x\n  end if\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Text("yes".into())));
    }

    #[test]
    fn test_boolean_or() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  if false or true then\n    put \"yes\" into x\n  end if\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Text("yes".into())));
    }

    #[test]
    fn test_boolean_not() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  if not false then\n    put \"yes\" into x\n  end if\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Text("yes".into())));
    }

    #[test]
    fn test_put_into_field() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  put \"Hello\" into field \"greeting\"\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(
            rt.fields.get("greeting"),
            Some(&"Hello".to_string())
        );
    }

    #[test]
    fn test_read_from_field() {
        let mut rt = Runtime::new_test();
        rt.fields.insert("name".to_string(), "Alice".to_string());
        rt.load_script(
            "on test\n  put field \"name\" into x\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Text("Alice".into())));
    }

    #[test]
    fn test_global_variables() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on setup\n  global gScore\n  put 100 into gScore\nend setup\n\non check\n  global gScore\n  put gScore into x\nend check",
        )
        .unwrap();
        rt.send_message("setup");
        rt.send_message("check");
        assert_eq!(rt.get_variable("x"), Some(Value::Number(100.0)));
    }

    #[test]
    fn test_function_length() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  put length(\"hello\") into n\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("n"), Some(Value::Number(5.0)));
    }

    #[test]
    fn test_function_abs() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  put abs(-5) into n\nend test")
            .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("n"), Some(Value::Number(5.0)));
    }

    #[test]
    fn test_chunk_word() {
        let mut rt = Runtime::new_test();
        rt.fields
            .insert("data".to_string(), "hello world foo".to_string());
        rt.load_script(
            "on test\n  put word 2 of field \"data\" into x\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Text("world".into())));
    }

    #[test]
    fn test_chunk_first_word() {
        let mut rt = Runtime::new_test();
        rt.fields
            .insert("data".to_string(), "hello world foo".to_string());
        rt.load_script(
            "on test\n  put the first word of field \"data\" into x\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Text("hello".into())));
    }

    #[test]
    fn test_chunk_last_word() {
        let mut rt = Runtime::new_test();
        rt.fields
            .insert("data".to_string(), "hello world foo".to_string());
        rt.load_script(
            "on test\n  put the last word of field \"data\" into x\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Text("foo".into())));
    }

    #[test]
    fn test_multiple_events() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  go to next card\n  answer \"Done\"\n  play sound \"beep\"\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.events().len(), 3);
    }

    #[test]
    fn test_nested_repeat() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  put 0 into total\n  repeat with i = 1 to 3\n    repeat with j = 1 to 2\n      put total + 1 into total\n    end repeat\n  end repeat\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("total"), Some(Value::Number(6.0)));
    }

    #[test]
    fn test_string_comparison_case_insensitive() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  if \"Hello\" = \"hello\" then\n    put \"yes\" into x\n  end if\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Text("yes".into())));
    }

    #[test]
    fn test_fetch_emits_event() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  fetch \"https://api.example.com\" into result\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert!(rt.events().iter().any(
            |e| matches!(e, EngineOutput::FetchUrl { url, .. } if url == "https://api.example.com")
        ));
    }

    #[test]
    fn test_execute_line() {
        let mut rt = Runtime::new_test();
        rt.execute_line("put 42 into x").unwrap();
        assert_eq!(rt.get_variable("x"), Some(Value::Number(42.0)));
    }

    #[test]
    fn test_drain_events() {
        let mut rt = Runtime::new_test();
        rt.load_script("on test\n  go to next card\nend test")
            .unwrap();
        rt.send_message("test");
        assert_eq!(rt.events().len(), 1);
        let events = rt.drain_events();
        assert_eq!(events.len(), 1);
        assert_eq!(rt.events().len(), 0);
    }

    #[test]
    fn test_value_coercion_text_to_number() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on test\n  put \"10\" into x\n  put x + 5 into y\nend test",
        )
        .unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("y"), Some(Value::Number(15.0)));
    }

    #[test]
    fn test_handler_with_params() {
        let mut rt = Runtime::new_test();
        rt.load_script(
            "on doAdd a, b\n  put a + b into result\nend doAdd",
        )
        .unwrap();
        rt.send_message_with_args("doAdd", &[Value::Number(3.0), Value::Number(4.0)]);
        assert_eq!(rt.get_variable("result"), Some(Value::Number(7.0)));
    }
}
