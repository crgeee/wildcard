use std::collections::HashMap;

use serde::Serialize;

use crate::ast::Handler;

#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Text(String),
    Number(f64),
    Boolean(bool),
    Empty,
}

impl Value {
    pub fn to_text(&self) -> String {
        match self {
            Value::Text(s) => s.clone(),
            Value::Number(n) => {
                if *n == n.floor() && n.is_finite() {
                    format!("{}", *n as i64)
                } else {
                    format!("{}", n)
                }
            }
            Value::Boolean(b) => {
                if *b {
                    "true".to_string()
                } else {
                    "false".to_string()
                }
            }
            Value::Empty => String::new(),
        }
    }

    pub fn to_number(&self) -> f64 {
        match self {
            Value::Number(n) => *n,
            Value::Text(s) => s.trim().parse::<f64>().unwrap_or(0.0),
            Value::Boolean(b) => {
                if *b {
                    1.0
                } else {
                    0.0
                }
            }
            Value::Empty => 0.0,
        }
    }

    pub fn to_bool(&self) -> bool {
        match self {
            Value::Boolean(b) => *b,
            Value::Text(s) => s.to_lowercase() == "true" || !s.is_empty(),
            Value::Number(n) => *n != 0.0,
            Value::Empty => false,
        }
    }

    pub fn is_truthy(&self) -> bool {
        self.to_bool()
    }
}

impl std::fmt::Display for Value {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_text())
    }
}

#[derive(Debug, Clone, Serialize)]
pub enum EngineOutput {
    GoToCard {
        direction: String,
        card_name: Option<String>,
    },
    SetField {
        field_name: String,
        content: String,
    },
    ShowMessage {
        message: String,
        style: String,
    },
    PlaySound {
        sound: String,
    },
    SetProperty {
        object: String,
        property: String,
        value: String,
    },
    HideObject {
        target: String,
    },
    ShowObject {
        target: String,
    },
    WaitSeconds {
        seconds: f64,
    },
    FetchUrl {
        url: String,
        variable: String,
    },
    ScriptError {
        message: String,
        line: usize,
    },
}

pub struct Runtime {
    pub variables: HashMap<String, Value>,
    pub globals: HashMap<String, Value>,
    pub(crate) handlers: HashMap<String, Handler>,
    pub(crate) events: Vec<EngineOutput>,
    pub fields: HashMap<String, String>,
    /// Declared globals in current handler scope
    pub(crate) current_globals: Vec<String>,
}

impl Runtime {
    pub fn new() -> Self {
        Self {
            variables: HashMap::new(),
            globals: HashMap::new(),
            handlers: HashMap::new(),
            events: Vec::new(),
            fields: HashMap::new(),
            current_globals: Vec::new(),
        }
    }

    #[cfg(test)]
    pub fn new_test() -> Self {
        Self::new()
    }

    pub fn load_script(&mut self, source: &str) -> Result<(), String> {
        let tokens = crate::lexer::lex(source)?;
        let script = crate::parser::parse(tokens)?;
        for handler in script.handlers {
            self.handlers.insert(handler.name.clone(), handler);
        }
        Ok(())
    }

    pub fn send_message(&mut self, name: &str) {
        if let Some(handler) = self.handlers.get(name).cloned() {
            self.variables.clear();
            self.current_globals.clear();

            // Set handler params (not applicable for events, but for function calls)
            if let Err(e) = self.execute_handler(&handler, &[]) {
                self.events.push(EngineOutput::ScriptError {
                    message: e,
                    line: 0,
                });
            }
        }
    }

    pub fn send_message_with_args(&mut self, name: &str, args: &[Value]) {
        if let Some(handler) = self.handlers.get(name).cloned() {
            self.variables.clear();
            self.current_globals.clear();

            if let Err(e) = self.execute_handler(&handler, args) {
                self.events.push(EngineOutput::ScriptError {
                    message: e,
                    line: 0,
                });
            }
        }
    }

    pub fn execute_line(&mut self, line: &str) -> Result<String, String> {
        let tokens = crate::lexer::lex(line)?;
        let stmts = crate::parser::parse_statements(tokens)?;
        for stmt in &stmts {
            self.execute_statement(stmt)?;
        }
        // Return the value of "it" if set
        Ok(self
            .get_variable("it")
            .map(|v| v.to_text())
            .unwrap_or_default())
    }

    pub fn load_stack_json(&mut self, json: &str) -> Result<(), String> {
        // Parse JSON to extract scripts from stack objects
        let v: serde_json::Value =
            serde_json::from_str(json).map_err(|e| format!("Invalid JSON: {}", e))?;

        // Load stack-level script
        if let Some(script) = v.get("script").and_then(|s| s.as_str()) {
            if !script.is_empty() {
                self.load_script(script)?;
            }
        }

        // Load scripts from cards
        if let Some(cards) = v.get("cards").and_then(|c| c.as_array()) {
            for card in cards {
                if let Some(script) = card.get("script").and_then(|s| s.as_str()) {
                    if !script.is_empty() {
                        self.load_script(script)?;
                    }
                }
                // Load scripts from card objects
                if let Some(objects) = card.get("objects").and_then(|o| o.as_array()) {
                    for obj in objects {
                        if let Some(script) = obj.get("script").and_then(|s| s.as_str()) {
                            if !script.is_empty() {
                                self.load_script(script)?;
                            }
                        }
                    }
                }
            }
        }

        // Store field contents
        if let Some(cards) = v.get("cards").and_then(|c| c.as_array()) {
            for card in cards {
                if let Some(objects) = card.get("objects").and_then(|o| o.as_array()) {
                    for obj in objects {
                        if obj.get("type").and_then(|t| t.as_str()) == Some("field") {
                            if let (Some(name), Some(content)) = (
                                obj.get("name").and_then(|n| n.as_str()),
                                obj.get("content").and_then(|c| c.as_str()),
                            ) {
                                self.fields.insert(name.to_string(), content.to_string());
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }

    pub fn get_state_json(&self) -> String {
        let mut state = serde_json::Map::new();

        // Variables
        let mut vars = serde_json::Map::new();
        for (k, v) in &self.variables {
            vars.insert(k.clone(), serde_json::Value::String(v.to_text()));
        }
        state.insert("variables".to_string(), serde_json::Value::Object(vars));

        // Fields
        let mut fields = serde_json::Map::new();
        for (k, v) in &self.fields {
            fields.insert(k.clone(), serde_json::Value::String(v.clone()));
        }
        state.insert("fields".to_string(), serde_json::Value::Object(fields));

        // Handler names
        let handler_names: Vec<serde_json::Value> = self
            .handlers
            .keys()
            .map(|k| serde_json::Value::String(k.clone()))
            .collect();
        state.insert(
            "handlers".to_string(),
            serde_json::Value::Array(handler_names),
        );

        serde_json::to_string(&state).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn drain_events(&mut self) -> Vec<EngineOutput> {
        std::mem::take(&mut self.events)
    }

    pub fn events(&self) -> &[EngineOutput] {
        &self.events
    }

    pub fn get_variable(&self, name: &str) -> Option<Value> {
        let lower = name.to_lowercase();
        if self
            .current_globals
            .iter()
            .any(|g| g.to_lowercase() == lower)
        {
            self.globals.get(&lower).cloned()
        } else {
            self.variables.get(&lower).cloned()
        }
    }

    pub fn set_variable(&mut self, name: &str, value: Value) {
        let lower = name.to_lowercase();
        if self
            .current_globals
            .iter()
            .any(|g| g.to_lowercase() == lower)
        {
            self.globals.insert(lower, value);
        } else {
            self.variables.insert(lower, value);
        }
    }

    pub fn get_field(&self, name: &str) -> Value {
        self.fields
            .get(name)
            .map(|s| Value::Text(s.clone()))
            .unwrap_or(Value::Empty)
    }

    pub fn set_field(&mut self, name: &str, value: &str) {
        self.fields.insert(name.to_string(), value.to_string());
        self.events.push(EngineOutput::SetField {
            field_name: name.to_string(),
            content: value.to_string(),
        });
    }
}
