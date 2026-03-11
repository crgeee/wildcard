use crate::ast::*;
use crate::token::{Token, TokenKind};

pub fn parse(tokens: Vec<Token>) -> Result<Script, String> {
    let mut pos = 0;
    let mut handlers = Vec::new();

    skip_newlines(&tokens, &mut pos);

    while pos < tokens.len() && tokens[pos].kind != TokenKind::Eof {
        if tokens[pos].kind == TokenKind::On {
            handlers.push(parse_handler(&tokens, &mut pos)?);
        } else {
            return Err(format!(
                "Expected 'on' to start a handler at line {}, got {:?}",
                tokens[pos].line, tokens[pos].kind
            ));
        }
        skip_newlines(&tokens, &mut pos);
    }

    Ok(Script { handlers })
}

/// Parse a sequence of statements (for use in message box / execute_line).
/// Statements don't need to be inside a handler.
pub fn parse_statements(tokens: Vec<Token>) -> Result<Vec<Statement>, String> {
    let mut pos = 0;
    let mut stmts = Vec::new();

    skip_newlines(&tokens, &mut pos);

    while pos < tokens.len() && tokens[pos].kind != TokenKind::Eof {
        stmts.push(parse_statement(&tokens, &mut pos)?);
        skip_newlines(&tokens, &mut pos);
    }

    Ok(stmts)
}

fn skip_newlines(tokens: &[Token], pos: &mut usize) {
    while *pos < tokens.len() && tokens[*pos].kind == TokenKind::NewlineTok {
        *pos += 1;
    }
}

fn expect(tokens: &[Token], pos: &mut usize, kind: TokenKind) -> Result<Token, String> {
    if *pos >= tokens.len() {
        return Err(format!("Unexpected end of input, expected {:?}", kind));
    }
    if tokens[*pos].kind == kind {
        let tok = tokens[*pos].clone();
        *pos += 1;
        Ok(tok)
    } else {
        Err(format!(
            "Expected {:?}, got {:?} ('{}') at line {}",
            kind, tokens[*pos].kind, tokens[*pos].text, tokens[*pos].line
        ))
    }
}

fn peek(tokens: &[Token], pos: usize) -> &TokenKind {
    if pos < tokens.len() {
        &tokens[pos].kind
    } else {
        &TokenKind::Eof
    }
}

fn peek_text(tokens: &[Token], pos: usize) -> &str {
    if pos < tokens.len() {
        &tokens[pos].text
    } else {
        ""
    }
}

fn current_line(tokens: &[Token], pos: usize) -> usize {
    if pos < tokens.len() {
        tokens[pos].line
    } else {
        0
    }
}

fn at_end_of_statement(tokens: &[Token], pos: usize) -> bool {
    matches!(
        peek(tokens, pos),
        TokenKind::NewlineTok | TokenKind::Eof
    )
}

fn parse_handler(tokens: &[Token], pos: &mut usize) -> Result<Handler, String> {
    expect(tokens, pos, TokenKind::On)?;

    // Handler name is an identifier
    let name_tok = expect(tokens, pos, TokenKind::Identifier)?;
    let name = name_tok.text;

    // Optional parameters before newline
    let mut params = Vec::new();
    while !at_end_of_statement(tokens, *pos) {
        if tokens[*pos].kind == TokenKind::Comma {
            *pos += 1; // skip comma separator
            continue;
        }
        if tokens[*pos].kind == TokenKind::Identifier {
            params.push(tokens[*pos].text.clone());
            *pos += 1;
        } else {
            break;
        }
    }

    skip_newlines(tokens, pos);

    // Parse body until "end <name>"
    let mut body = Vec::new();
    loop {
        skip_newlines(tokens, pos);

        if *pos >= tokens.len() || tokens[*pos].kind == TokenKind::Eof {
            return Err(format!("Unterminated handler '{}' — expected 'end {}'", name, name));
        }

        // Check for "end <name>"
        if tokens[*pos].kind == TokenKind::End {
            *pos += 1;
            skip_newlines(tokens, pos);
            // The name after "end" should match
            if *pos < tokens.len()
                && tokens[*pos].kind == TokenKind::Identifier
                && tokens[*pos].text.to_lowercase() == name.to_lowercase()
            {
                *pos += 1;
            }
            // Also accept just "end" followed by newline (lenient)
            break;
        }

        body.push(parse_statement(tokens, pos)?);
    }

    Ok(Handler { name, params, body })
}

fn parse_statement(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    skip_newlines(tokens, pos);

    if *pos >= tokens.len() || tokens[*pos].kind == TokenKind::Eof {
        return Err("Unexpected end of input while parsing statement".to_string());
    }

    let result = match &tokens[*pos].kind {
        TokenKind::Put => parse_put(tokens, pos),
        TokenKind::Go => parse_go(tokens, pos),
        TokenKind::If => parse_if(tokens, pos),
        TokenKind::Repeat => parse_repeat(tokens, pos),
        TokenKind::Set => parse_set(tokens, pos),
        TokenKind::Show => parse_show(tokens, pos),
        TokenKind::Hide => parse_hide(tokens, pos),
        TokenKind::Answer => parse_answer(tokens, pos),
        TokenKind::Ask => parse_ask(tokens, pos),
        TokenKind::Play => parse_play(tokens, pos),
        TokenKind::Wait => parse_wait(tokens, pos),
        TokenKind::Pass => parse_pass(tokens, pos),
        TokenKind::Return => parse_return(tokens, pos),
        TokenKind::Send => parse_send(tokens, pos),
        TokenKind::Global => parse_global(tokens, pos),
        TokenKind::Fetch => parse_fetch(tokens, pos),
        _ => {
            // Try to parse as expression statement (function call, etc.)
            let expr = parse_expression(tokens, pos)?;
            Ok(Statement::ExpressionStatement { expr })
        }
    };

    // Skip to end of line
    while *pos < tokens.len()
        && tokens[*pos].kind != TokenKind::NewlineTok
        && tokens[*pos].kind != TokenKind::Eof
    {
        // If we're at a valid statement boundary already (e.g., after parsing
        // block statements like if/repeat that consume past newlines), break
        break;
    }

    result
}

// --- Statement parsers ---

fn parse_put(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Put)?;
    let value = parse_expression(tokens, pos)?;

    let target = if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Into {
        *pos += 1;
        parse_expression(tokens, pos)?
    } else if *pos < tokens.len() && tokens[*pos].kind == TokenKind::After {
        *pos += 1;
        parse_expression(tokens, pos)?
    } else if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Before {
        *pos += 1;
        parse_expression(tokens, pos)?
    } else {
        // put <expr> by itself — show in message box (put into "it")
        Expression::Variable("it".to_string())
    };

    Ok(Statement::Put { value, target })
}

fn parse_go(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Go)?;

    // Optional "to"
    if *pos < tokens.len() && tokens[*pos].kind == TokenKind::To {
        *pos += 1;
    }

    let destination = match peek(tokens, *pos) {
        TokenKind::Next => {
            *pos += 1;
            // Optional "card"
            if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Card {
                *pos += 1;
            }
            GoDestination::Next
        }
        TokenKind::Prev => {
            *pos += 1;
            if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Card {
                *pos += 1;
            }
            GoDestination::Prev
        }
        TokenKind::First => {
            *pos += 1;
            if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Card {
                *pos += 1;
            }
            GoDestination::First
        }
        TokenKind::Last => {
            *pos += 1;
            if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Card {
                *pos += 1;
            }
            GoDestination::Last
        }
        TokenKind::Card => {
            *pos += 1;
            // "go to card <name>"
            let expr = parse_expression(tokens, pos)?;
            match expr {
                Expression::StringLiteral(name) => GoDestination::CardByName(name),
                _ => GoDestination::CardByExpr(expr),
            }
        }
        TokenKind::StringLiteral => {
            // "go to "cardName""
            let name = tokens[*pos].text.clone();
            *pos += 1;
            GoDestination::CardByName(name)
        }
        _ => {
            // Try parsing as expression
            let expr = parse_expression(tokens, pos)?;
            GoDestination::CardByExpr(expr)
        }
    };

    Ok(Statement::Go { destination })
}

fn parse_if(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::If)?;
    let condition = parse_expression(tokens, pos)?;
    expect(tokens, pos, TokenKind::Then)?;

    // Check if this is a single-line if (statement on same line as then)
    let is_multiline = at_end_of_statement(tokens, *pos);

    let then_body;
    let else_body;

    if is_multiline {
        // Multi-line if/then/else/end if
        skip_newlines(tokens, pos);
        then_body = parse_block(tokens, pos, &[TokenKind::Else, TokenKind::End])?;

        if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Else {
            *pos += 1;
            skip_newlines(tokens, pos);
            else_body = Some(parse_block(tokens, pos, &[TokenKind::End])?);
        } else {
            else_body = None;
        }

        // Consume "end if"
        expect(tokens, pos, TokenKind::End)?;
        if *pos < tokens.len() && tokens[*pos].kind == TokenKind::If {
            *pos += 1;
        }
    } else {
        // Single-line: if <cond> then <stmt>
        then_body = vec![parse_statement(tokens, pos)?];

        // Check for "else" on same line
        if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Else {
            *pos += 1;
            else_body = Some(vec![parse_statement(tokens, pos)?]);
        } else {
            else_body = None;
        }
    }

    Ok(Statement::If {
        condition,
        then_body,
        else_body,
    })
}

fn parse_block(
    tokens: &[Token],
    pos: &mut usize,
    terminators: &[TokenKind],
) -> Result<Vec<Statement>, String> {
    let mut stmts = Vec::new();

    loop {
        skip_newlines(tokens, pos);

        if *pos >= tokens.len() || tokens[*pos].kind == TokenKind::Eof {
            return Err("Unexpected end of input in block".to_string());
        }

        if terminators.contains(&tokens[*pos].kind) {
            break;
        }

        stmts.push(parse_statement(tokens, pos)?);
    }

    Ok(stmts)
}

fn parse_repeat(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Repeat)?;

    if *pos < tokens.len() && tokens[*pos].kind == TokenKind::With {
        // repeat with i = start to end
        *pos += 1;
        let var_tok = expect(tokens, pos, TokenKind::Identifier)?;
        let var = var_tok.text;
        expect(tokens, pos, TokenKind::Equals)?;
        let start = parse_expression(tokens, pos)?;
        expect(tokens, pos, TokenKind::To)?;
        let end = parse_expression(tokens, pos)?;

        skip_newlines(tokens, pos);
        let body = parse_block(tokens, pos, &[TokenKind::End])?;
        expect(tokens, pos, TokenKind::End)?;
        // Consume "repeat" after "end"
        if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Repeat {
            *pos += 1;
        }

        Ok(Statement::Repeat {
            var,
            start,
            end,
            body,
        })
    } else if *pos < tokens.len() && tokens[*pos].kind == TokenKind::While {
        // repeat while <condition>
        *pos += 1;
        let condition = parse_expression(tokens, pos)?;

        skip_newlines(tokens, pos);
        let body = parse_block(tokens, pos, &[TokenKind::End])?;
        expect(tokens, pos, TokenKind::End)?;
        if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Repeat {
            *pos += 1;
        }

        Ok(Statement::RepeatWhile { condition, body })
    } else {
        Err(format!(
            "Expected 'with' or 'while' after 'repeat' at line {}",
            current_line(tokens, *pos)
        ))
    }
}

fn parse_set(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Set)?;

    // "set the <property> of <object> to <value>"
    if *pos < tokens.len() && tokens[*pos].kind == TokenKind::The {
        *pos += 1;
    }

    // Property name
    let property = if *pos < tokens.len()
        && (tokens[*pos].kind == TokenKind::Identifier || is_property_keyword(&tokens[*pos].kind))
    {
        let p = tokens[*pos].text.clone();
        *pos += 1;
        p
    } else {
        return Err(format!(
            "Expected property name after 'set' at line {}",
            current_line(tokens, *pos)
        ));
    };

    expect(tokens, pos, TokenKind::Of)?;
    let object = parse_expression(tokens, pos)?;
    expect(tokens, pos, TokenKind::To)?;
    let value = parse_expression(tokens, pos)?;

    Ok(Statement::Set {
        property: PropertyRef { property, object },
        value,
    })
}

fn is_property_keyword(kind: &TokenKind) -> bool {
    matches!(
        kind,
        TokenKind::Identifier
            | TokenKind::Show
            | TokenKind::Hide
            | TokenKind::Number
            | TokenKind::Line
            | TokenKind::Word
    )
}

fn parse_show(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Show)?;
    let target = parse_expression(tokens, pos)?;
    Ok(Statement::Show { target })
}

fn parse_hide(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Hide)?;
    let target = parse_expression(tokens, pos)?;
    Ok(Statement::Hide { target })
}

fn parse_answer(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Answer)?;
    let message = parse_expression(tokens, pos)?;
    Ok(Statement::Answer { message })
}

fn parse_ask(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Ask)?;
    let prompt = parse_expression(tokens, pos)?;
    Ok(Statement::Ask { prompt })
}

fn parse_play(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Play)?;

    // Optional "sound" keyword
    if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Sound {
        *pos += 1;
    }

    let sound = parse_expression(tokens, pos)?;
    Ok(Statement::PlaySound { sound })
}

fn parse_wait(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Wait)?;
    let duration = parse_expression(tokens, pos)?;

    // Optional "second" / "seconds"
    if *pos < tokens.len()
        && (tokens[*pos].kind == TokenKind::Second || tokens[*pos].kind == TokenKind::Seconds)
    {
        *pos += 1;
    }

    Ok(Statement::Wait { duration })
}

fn parse_pass(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Pass)?;
    let msg_tok = expect(tokens, pos, TokenKind::Identifier)?;
    Ok(Statement::Pass {
        message: msg_tok.text,
    })
}

fn parse_return(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Return)?;

    let value = if !at_end_of_statement(tokens, *pos) {
        Some(parse_expression(tokens, pos)?)
    } else {
        None
    };

    Ok(Statement::Return { value })
}

fn parse_send(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Send)?;

    // "send <message> to <target>"
    let msg_tok = if *pos < tokens.len() && tokens[*pos].kind == TokenKind::StringLiteral {
        let t = tokens[*pos].text.clone();
        *pos += 1;
        t
    } else if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Identifier {
        let t = tokens[*pos].text.clone();
        *pos += 1;
        t
    } else {
        return Err(format!(
            "Expected message name after 'send' at line {}",
            current_line(tokens, *pos)
        ));
    };

    expect(tokens, pos, TokenKind::To)?;
    let target = parse_expression(tokens, pos)?;

    Ok(Statement::Send {
        message: msg_tok,
        target,
    })
}

fn parse_global(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Global)?;

    let mut names = Vec::new();
    loop {
        if *pos >= tokens.len() || at_end_of_statement(tokens, *pos) {
            break;
        }
        if tokens[*pos].kind == TokenKind::Comma {
            *pos += 1;
            continue;
        }
        if tokens[*pos].kind == TokenKind::Identifier {
            names.push(tokens[*pos].text.clone());
            *pos += 1;
        } else {
            break;
        }
    }

    if names.is_empty() {
        return Err(format!(
            "Expected variable name after 'global' at line {}",
            current_line(tokens, *pos)
        ));
    }

    Ok(Statement::Global { names })
}

fn parse_fetch(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> {
    expect(tokens, pos, TokenKind::Fetch)?;
    let url = parse_expression(tokens, pos)?;
    expect(tokens, pos, TokenKind::Into)?;
    let target = parse_expression(tokens, pos)?;
    Ok(Statement::Fetch { url, target })
}

// --- Expression parsing (precedence climbing) ---

fn parse_expression(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> {
    parse_or(tokens, pos)
}

fn parse_or(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> {
    let mut left = parse_and(tokens, pos)?;

    while *pos < tokens.len() && tokens[*pos].kind == TokenKind::Or {
        *pos += 1;
        let right = parse_and(tokens, pos)?;
        left = Expression::BinaryOp {
            left: Box::new(left),
            op: BinaryOp::Or,
            right: Box::new(right),
        };
    }

    Ok(left)
}

fn parse_and(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> {
    let mut left = parse_not(tokens, pos)?;

    while *pos < tokens.len() && tokens[*pos].kind == TokenKind::And {
        *pos += 1;
        let right = parse_not(tokens, pos)?;
        left = Expression::BinaryOp {
            left: Box::new(left),
            op: BinaryOp::And,
            right: Box::new(right),
        };
    }

    Ok(left)
}

fn parse_not(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> {
    if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Not {
        *pos += 1;
        let operand = parse_not(tokens, pos)?;
        Ok(Expression::UnaryOp {
            op: UnaryOp::Not,
            operand: Box::new(operand),
        })
    } else {
        parse_comparison(tokens, pos)
    }
}

fn parse_comparison(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> {
    let mut left = parse_concat(tokens, pos)?;

    while *pos < tokens.len() {
        let op = match &tokens[*pos].kind {
            TokenKind::Equals => BinaryOp::Equal,
            TokenKind::NotEquals => BinaryOp::NotEqual,
            TokenKind::LessThan => BinaryOp::LessThan,
            TokenKind::GreaterThan => BinaryOp::GreaterThan,
            TokenKind::LessOrEqual => BinaryOp::LessOrEqual,
            TokenKind::GreaterOrEqual => BinaryOp::GreaterOrEqual,
            TokenKind::Is => {
                *pos += 1;
                // Check for "is not"
                if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Not {
                    *pos += 1;
                    let right = parse_concat(tokens, pos)?;
                    left = Expression::BinaryOp {
                        left: Box::new(left),
                        op: BinaryOp::NotEqual,
                        right: Box::new(right),
                    };
                    continue;
                } else {
                    let right = parse_concat(tokens, pos)?;
                    left = Expression::BinaryOp {
                        left: Box::new(left),
                        op: BinaryOp::Equal,
                        right: Box::new(right),
                    };
                    continue;
                }
            }
            TokenKind::Contains => BinaryOp::Contains,
            _ => break,
        };

        *pos += 1;
        let right = parse_concat(tokens, pos)?;
        left = Expression::BinaryOp {
            left: Box::new(left),
            op,
            right: Box::new(right),
        };
    }

    Ok(left)
}

fn parse_concat(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> {
    let mut left = parse_addition(tokens, pos)?;

    while *pos < tokens.len() {
        match &tokens[*pos].kind {
            TokenKind::Ampersand => {
                *pos += 1;
                let right = parse_addition(tokens, pos)?;
                left = Expression::BinaryOp {
                    left: Box::new(left),
                    op: BinaryOp::Concat,
                    right: Box::new(right),
                };
            }
            TokenKind::DoubleAmpersand => {
                *pos += 1;
                let right = parse_addition(tokens, pos)?;
                left = Expression::BinaryOp {
                    left: Box::new(left),
                    op: BinaryOp::ConcatWithSpace,
                    right: Box::new(right),
                };
            }
            _ => break,
        }
    }

    Ok(left)
}

fn parse_addition(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> {
    let mut left = parse_multiplication(tokens, pos)?;

    while *pos < tokens.len() {
        let op = match &tokens[*pos].kind {
            TokenKind::Plus => BinaryOp::Add,
            TokenKind::Minus => BinaryOp::Subtract,
            _ => break,
        };
        *pos += 1;
        let right = parse_multiplication(tokens, pos)?;
        left = Expression::BinaryOp {
            left: Box::new(left),
            op,
            right: Box::new(right),
        };
    }

    Ok(left)
}

fn parse_multiplication(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> {
    let mut left = parse_exponent(tokens, pos)?;

    while *pos < tokens.len() {
        let op = match &tokens[*pos].kind {
            TokenKind::Star => BinaryOp::Multiply,
            TokenKind::Slash => BinaryOp::Divide,
            TokenKind::Mod => BinaryOp::Mod,
            TokenKind::Divide => BinaryOp::Divide,
            _ => break,
        };
        *pos += 1;
        let right = parse_exponent(tokens, pos)?;
        left = Expression::BinaryOp {
            left: Box::new(left),
            op,
            right: Box::new(right),
        };
    }

    Ok(left)
}

fn parse_exponent(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> {
    let left = parse_unary(tokens, pos)?;

    if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Caret {
        *pos += 1;
        let right = parse_exponent(tokens, pos)?; // right-associative
        Ok(Expression::BinaryOp {
            left: Box::new(left),
            op: BinaryOp::Exponent,
            right: Box::new(right),
        })
    } else {
        Ok(left)
    }
}

fn parse_unary(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> {
    if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Minus {
        *pos += 1;
        let operand = parse_unary(tokens, pos)?;
        Ok(Expression::UnaryOp {
            op: UnaryOp::Negate,
            operand: Box::new(operand),
        })
    } else {
        parse_primary(tokens, pos)
    }
}

fn parse_primary(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> {
    if *pos >= tokens.len() || tokens[*pos].kind == TokenKind::Eof {
        return Err("Unexpected end of input while parsing expression".to_string());
    }

    match &tokens[*pos].kind {
        TokenKind::NumberLiteral => {
            let val: f64 = tokens[*pos]
                .text
                .parse()
                .map_err(|_| format!("Invalid number '{}' at line {}", tokens[*pos].text, tokens[*pos].line))?;
            *pos += 1;
            Ok(Expression::NumberLiteral(val))
        }

        TokenKind::StringLiteral => {
            let s = tokens[*pos].text.clone();
            *pos += 1;
            Ok(Expression::StringLiteral(s))
        }

        TokenKind::True => {
            *pos += 1;
            Ok(Expression::BoolLiteral(true))
        }

        TokenKind::False => {
            *pos += 1;
            Ok(Expression::BoolLiteral(false))
        }

        TokenKind::It => {
            *pos += 1;
            Ok(Expression::It)
        }

        TokenKind::Empty => {
            *pos += 1;
            Ok(Expression::Empty)
        }

        TokenKind::Field => {
            *pos += 1;
            let name = parse_primary(tokens, pos)?;
            Ok(Expression::FieldRef {
                name: Box::new(name),
            })
        }

        TokenKind::Button => {
            *pos += 1;
            let name = parse_primary(tokens, pos)?;
            Ok(Expression::ButtonRef {
                name: Box::new(name),
            })
        }

        TokenKind::The => {
            *pos += 1;
            // "the <property> of <object>" or "the <function>"
            // Check for chunk expressions: "the first word of ..."
            if *pos < tokens.len() {
                match &tokens[*pos].kind {
                    TokenKind::First | TokenKind::Last | TokenKind::Second => {
                        return parse_chunk_with_ordinal(tokens, pos);
                    }
                    _ => {}
                }
            }

            // "the <property> of <object>"
            if *pos < tokens.len() && is_identifier_like(&tokens[*pos].kind) {
                let prop = tokens[*pos].text.clone();
                *pos += 1;

                if *pos < tokens.len() && tokens[*pos].kind == TokenKind::Of {
                    *pos += 1;
                    let obj = parse_expression(tokens, pos)?;
                    Ok(Expression::PropertyOf {
                        property: prop,
                        object: Box::new(obj),
                    })
                } else {
                    // "the <function>" — treat as function call with no args
                    Ok(Expression::FunctionCall {
                        name: prop,
                        args: vec![],
                    })
                }
            } else {
                Err(format!(
                    "Expected property or function after 'the' at line {}",
                    current_line(tokens, *pos)
                ))
            }
        }

        // Chunk expressions: "word 1 of ..." / "line 2 of ..."
        TokenKind::Word | TokenKind::Line | TokenKind::Item | TokenKind::Character => {
            let chunk_type = match &tokens[*pos].kind {
                TokenKind::Word => ChunkType::Word,
                TokenKind::Line => ChunkType::Line,
                TokenKind::Item => ChunkType::Item,
                TokenKind::Character => ChunkType::Character,
                _ => unreachable!(),
            };
            *pos += 1;
            let index = parse_expression(tokens, pos)?;
            expect(tokens, pos, TokenKind::Of)?;
            let source = parse_expression(tokens, pos)?;
            Ok(Expression::ChunkExpr {
                chunk_type,
                index: Box::new(index),
                source: Box::new(source),
            })
        }

        TokenKind::LeftParen => {
            *pos += 1;
            let expr = parse_expression(tokens, pos)?;
            expect(tokens, pos, TokenKind::RightParen)?;
            Ok(expr)
        }

        TokenKind::Identifier => {
            let name = tokens[*pos].text.clone();
            *pos += 1;

            // Check for function call: identifier followed by (
            if *pos < tokens.len() && tokens[*pos].kind == TokenKind::LeftParen {
                *pos += 1;
                let mut args = Vec::new();
                if *pos < tokens.len() && tokens[*pos].kind != TokenKind::RightParen {
                    args.push(parse_expression(tokens, pos)?);
                    while *pos < tokens.len() && tokens[*pos].kind == TokenKind::Comma {
                        *pos += 1;
                        args.push(parse_expression(tokens, pos)?);
                    }
                }
                expect(tokens, pos, TokenKind::RightParen)?;
                Ok(Expression::FunctionCall { name, args })
            } else {
                Ok(Expression::Variable(name))
            }
        }

        // Card/Background/Stack as identifiers in expressions
        TokenKind::Card | TokenKind::Background | TokenKind::Stack => {
            let name = tokens[*pos].text.clone();
            *pos += 1;
            Ok(Expression::Variable(name))
        }

        TokenKind::Me => {
            *pos += 1;
            Ok(Expression::Variable("me".to_string()))
        }

        _ => Err(format!(
            "Unexpected token {:?} ('{}') at line {} while parsing expression",
            tokens[*pos].kind, tokens[*pos].text, tokens[*pos].line
        )),
    }
}

fn parse_chunk_with_ordinal(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> {
    // We're past "the", now at first/last/second
    let ordinal = match &tokens[*pos].kind {
        TokenKind::First => {
            *pos += 1;
            Expression::NumberLiteral(1.0)
        }
        TokenKind::Last => {
            *pos += 1;
            Expression::NumberLiteral(-1.0) // -1 signals "last"
        }
        TokenKind::Second => {
            *pos += 1;
            Expression::NumberLiteral(2.0)
        }
        _ => {
            return Err(format!(
                "Expected ordinal at line {}",
                current_line(tokens, *pos)
            ));
        }
    };

    // Now expect a chunk type keyword
    let chunk_type = match peek(tokens, *pos) {
        TokenKind::Word => {
            *pos += 1;
            ChunkType::Word
        }
        TokenKind::Line => {
            *pos += 1;
            ChunkType::Line
        }
        TokenKind::Item => {
            *pos += 1;
            ChunkType::Item
        }
        TokenKind::Character => {
            *pos += 1;
            ChunkType::Character
        }
        _ => {
            return Err(format!(
                "Expected 'word', 'line', 'item', or 'character' at line {}",
                current_line(tokens, *pos)
            ));
        }
    };

    expect(tokens, pos, TokenKind::Of)?;
    let source = parse_expression(tokens, pos)?;

    Ok(Expression::ChunkExpr {
        chunk_type,
        index: Box::new(ordinal),
        source: Box::new(source),
    })
}

fn is_identifier_like(kind: &TokenKind) -> bool {
    matches!(
        kind,
        TokenKind::Identifier
            | TokenKind::Number
            | TokenKind::Line
            | TokenKind::Word
            | TokenKind::Item
            | TokenKind::Character
            | TokenKind::Sound
            | TokenKind::Message
            | TokenKind::Screen
            | TokenKind::Visual
            | TokenKind::Effect
            | TokenKind::Stack
            | TokenKind::Card
            | TokenKind::Background
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lexer::lex;

    #[test]
    fn test_parse_handler() {
        let tokens = lex("on mouseUp\n  go to next card\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        assert_eq!(script.handlers.len(), 1);
        assert_eq!(script.handlers[0].name, "mouseUp");
        assert_eq!(script.handlers[0].body.len(), 1);
    }

    #[test]
    fn test_parse_handler_with_params() {
        let tokens = lex("on doStuff x, y\n  put x into y\nend doStuff").unwrap();
        let script = parse(tokens).unwrap();
        assert_eq!(script.handlers[0].name, "doStuff");
        assert_eq!(script.handlers[0].params, vec!["x", "y"]);
    }

    #[test]
    fn test_parse_put_into() {
        let tokens =
            lex("on mouseUp\n  put \"hello\" into field \"name\"\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Put { value, target } => {
                match value {
                    Expression::StringLiteral(s) => assert_eq!(s, "hello"),
                    other => panic!("Expected StringLiteral value, got {:?}", other),
                }
                match target {
                    Expression::FieldRef { .. } => {} // ok
                    other => panic!("Expected FieldRef target, got {:?}", other),
                }
            }
            other => panic!("Expected Put, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_put_into_variable() {
        let tokens = lex("on test\n  put 42 into x\nend test").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Put { value, target } => {
                match value {
                    Expression::NumberLiteral(n) => assert_eq!(*n, 42.0),
                    other => panic!("Expected NumberLiteral, got {:?}", other),
                }
                match target {
                    Expression::Variable(name) => assert_eq!(name, "x"),
                    other => panic!("Expected Variable, got {:?}", other),
                }
            }
            other => panic!("Expected Put, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_go_next() {
        let tokens = lex("on mouseUp\n  go to next card\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Go { destination } => match destination {
                GoDestination::Next => {} // ok
                other => panic!("Expected Next, got {:?}", other),
            },
            other => panic!("Expected Go, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_go_prev() {
        let tokens = lex("on mouseUp\n  go to prev card\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Go { destination } => match destination {
                GoDestination::Prev => {}
                other => panic!("Expected Prev, got {:?}", other),
            },
            other => panic!("Expected Go, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_go_card_by_name() {
        let tokens = lex("on mouseUp\n  go to card \"winner\"\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Go { destination } => match destination {
                GoDestination::CardByName(name) => assert_eq!(name, "winner"),
                other => panic!("Expected CardByName, got {:?}", other),
            },
            other => panic!("Expected Go, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_if_then() {
        let tokens = lex(
            "on mouseUp\n  if x > 10 then\n    go to next card\n  end if\nend mouseUp",
        )
        .unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::If {
                then_body,
                else_body,
                ..
            } => {
                assert_eq!(then_body.len(), 1);
                assert!(else_body.is_none());
            }
            other => panic!("Expected If, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_if_else() {
        let tokens = lex(
            "on mouseUp\n  if x > 10 then\n    go to next card\n  else\n    answer \"nope\"\n  end if\nend mouseUp",
        )
        .unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::If {
                else_body, ..
            } => {
                assert!(else_body.is_some());
                assert_eq!(else_body.as_ref().unwrap().len(), 1);
            }
            other => panic!("Expected If, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_repeat() {
        let tokens = lex(
            "on mouseUp\n  repeat with i = 1 to 5\n    show i\n  end repeat\nend mouseUp",
        )
        .unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Repeat {
                var, body, ..
            } => {
                assert_eq!(var, "i");
                assert_eq!(body.len(), 1);
            }
            other => panic!("Expected Repeat, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_repeat_while() {
        let tokens = lex(
            "on test\n  repeat while x > 0\n    put x - 1 into x\n  end repeat\nend test",
        )
        .unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::RepeatWhile { body, .. } => {
                assert_eq!(body.len(), 1);
            }
            other => panic!("Expected RepeatWhile, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_set() {
        let tokens = lex(
            "on mouseUp\n  set the color of button \"submit\" to \"red\"\nend mouseUp",
        )
        .unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Set { property, value } => {
                assert_eq!(property.property, "color");
                match value {
                    Expression::StringLiteral(s) => assert_eq!(s, "red"),
                    other => panic!("Expected StringLiteral, got {:?}", other),
                }
            }
            other => panic!("Expected Set, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_answer() {
        let tokens = lex("on mouseUp\n  answer \"Hello!\"\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Answer { message } => match message {
                Expression::StringLiteral(s) => assert_eq!(s, "Hello!"),
                other => panic!("Expected StringLiteral, got {:?}", other),
            },
            other => panic!("Expected Answer, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_ask() {
        let tokens = lex("on mouseUp\n  ask \"What is your name?\"\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Ask { prompt } => match prompt {
                Expression::StringLiteral(s) => assert_eq!(s, "What is your name?"),
                other => panic!("Expected StringLiteral, got {:?}", other),
            },
            other => panic!("Expected Ask, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_play_sound() {
        let tokens =
            lex("on mouseUp\n  play sound \"click.wav\"\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::PlaySound { sound } => match sound {
                Expression::StringLiteral(s) => assert_eq!(s, "click.wav"),
                other => panic!("Expected StringLiteral, got {:?}", other),
            },
            other => panic!("Expected PlaySound, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_wait() {
        let tokens = lex("on mouseUp\n  wait 1 second\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Wait { duration } => match duration {
                Expression::NumberLiteral(n) => assert_eq!(*n, 1.0),
                other => panic!("Expected NumberLiteral, got {:?}", other),
            },
            other => panic!("Expected Wait, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_pass() {
        let tokens = lex("on mouseUp\n  pass mouseUp\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Pass { message } => assert_eq!(message, "mouseUp"),
            other => panic!("Expected Pass, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_return_value() {
        let tokens = lex("on test\n  return 42\nend test").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Return { value } => {
                assert!(value.is_some());
            }
            other => panic!("Expected Return, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_return_empty() {
        let tokens = lex("on test\n  return\nend test").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Return { value } => {
                assert!(value.is_none());
            }
            other => panic!("Expected Return, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_global() {
        let tokens = lex("on test\n  global x, y, z\nend test").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Global { names } => {
                assert_eq!(names, &["x", "y", "z"]);
            }
            other => panic!("Expected Global, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_fetch() {
        let tokens = lex(
            "on mouseUp\n  fetch \"https://api.example.com\" into result\nend mouseUp",
        )
        .unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Fetch { url, target } => {
                match url {
                    Expression::StringLiteral(s) => {
                        assert_eq!(s, "https://api.example.com")
                    }
                    other => panic!("Expected StringLiteral url, got {:?}", other),
                }
                match target {
                    Expression::Variable(name) => assert_eq!(name, "result"),
                    other => panic!("Expected Variable target, got {:?}", other),
                }
            }
            other => panic!("Expected Fetch, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_show() {
        let tokens = lex("on test\n  show field \"greeting\"\nend test").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Show { target } => match target {
                Expression::FieldRef { .. } => {}
                other => panic!("Expected FieldRef, got {:?}", other),
            },
            other => panic!("Expected Show, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_hide() {
        let tokens = lex("on test\n  hide button \"secret\"\nend test").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Hide { target } => match target {
                Expression::ButtonRef { .. } => {}
                other => panic!("Expected ButtonRef, got {:?}", other),
            },
            other => panic!("Expected Hide, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_arithmetic_expression() {
        let tokens = lex("on test\n  put 1 + 2 * 3 into x\nend test").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Put { value, .. } => {
                // Should be 1 + (2 * 3) due to precedence
                match value {
                    Expression::BinaryOp { op, .. } => assert_eq!(*op, BinaryOp::Add),
                    other => panic!("Expected BinaryOp Add, got {:?}", other),
                }
            }
            other => panic!("Expected Put, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_string_concat() {
        let tokens =
            lex("on test\n  put \"Hello\" & \" World\" into msg\nend test").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Put { value, .. } => match value {
                Expression::BinaryOp { op, .. } => assert_eq!(*op, BinaryOp::Concat),
                other => panic!("Expected BinaryOp Concat, got {:?}", other),
            },
            other => panic!("Expected Put, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_function_call() {
        let tokens =
            lex("on test\n  put length(\"hello\") into n\nend test").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Put { value, .. } => match value {
                Expression::FunctionCall { name, args } => {
                    assert_eq!(name, "length");
                    assert_eq!(args.len(), 1);
                }
                other => panic!("Expected FunctionCall, got {:?}", other),
            },
            other => panic!("Expected Put, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_nested_if() {
        let input = "on test\n  if x > 0 then\n    if y > 0 then\n      put 1 into z\n    end if\n  end if\nend test";
        let tokens = lex(input).unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::If { then_body, .. } => {
                assert_eq!(then_body.len(), 1);
                match &then_body[0] {
                    Statement::If { .. } => {} // nested if OK
                    other => panic!("Expected nested If, got {:?}", other),
                }
            }
            other => panic!("Expected If, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_multiple_statements() {
        let input =
            "on test\n  put 1 into x\n  put 2 into y\n  put x + y into z\nend test";
        let tokens = lex(input).unwrap();
        let script = parse(tokens).unwrap();
        assert_eq!(script.handlers[0].body.len(), 3);
    }

    #[test]
    fn test_parse_multiple_handlers() {
        let input = "on mouseUp\n  go to next card\nend mouseUp\n\non mouseDown\n  answer \"clicked\"\nend mouseDown";
        let tokens = lex(input).unwrap();
        let script = parse(tokens).unwrap();
        assert_eq!(script.handlers.len(), 2);
        assert_eq!(script.handlers[0].name, "mouseUp");
        assert_eq!(script.handlers[1].name, "mouseDown");
    }

    #[test]
    fn test_parse_boolean_expression() {
        let tokens =
            lex("on test\n  if true and not false then\n    put 1 into x\n  end if\nend test")
                .unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::If { condition, .. } => match condition {
                Expression::BinaryOp { op, .. } => assert_eq!(*op, BinaryOp::And),
                other => panic!("Expected And, got {:?}", other),
            },
            other => panic!("Expected If, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_parenthesized_expression() {
        let tokens =
            lex("on test\n  put (1 + 2) * 3 into x\nend test").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Put { value, .. } => match value {
                Expression::BinaryOp { op, .. } => assert_eq!(*op, BinaryOp::Multiply),
                other => panic!("Expected Multiply, got {:?}", other),
            },
            other => panic!("Expected Put, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_statements_no_handler() {
        let tokens = lex("put 42 into x").unwrap();
        let stmts = parse_statements(tokens).unwrap();
        assert_eq!(stmts.len(), 1);
        match &stmts[0] {
            Statement::Put { .. } => {}
            other => panic!("Expected Put, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_send() {
        let tokens =
            lex("on test\n  send \"mouseUp\" to button \"Go\"\nend test").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Send { message, target } => {
                assert_eq!(message, "mouseUp");
                match target {
                    Expression::ButtonRef { .. } => {}
                    other => panic!("Expected ButtonRef target, got {:?}", other),
                }
            }
            other => panic!("Expected Send, got {:?}", other),
        }
    }
}
