use crate::token::{Token, TokenKind};

pub fn lex(input: &str) -> Result<Vec<Token>, String> {
    let mut tokens = Vec::new();
    let mut chars = input.chars().peekable();
    let mut line = 1usize;
    let mut col = 1usize;

    while let Some(&ch) = chars.peek() {
        match ch {
            // Skip spaces and tabs (horizontal whitespace)
            ' ' | '\t' => {
                chars.next();
                col += 1;
            }

            // Line continuation: backslash before newline
            '\\' => {
                let mut peek = chars.clone();
                peek.next();
                if peek.peek() == Some(&'\n') || peek.peek() == Some(&'\r') {
                    chars.next(); // skip backslash
                    if chars.peek() == Some(&'\r') {
                        chars.next();
                    }
                    if chars.peek() == Some(&'\n') {
                        chars.next();
                    }
                    line += 1;
                    col = 1;
                } else {
                    return Err(format!(
                        "Unexpected character '\\' at line {}, col {}",
                        line, col
                    ));
                }
            }

            // Unicode special: non-breaking continuation character
            '\u{00AC}' => {
                // HyperCard used the logical-not sign as line continuation
                chars.next();
                col += 1;
                // Skip to next line
                while let Some(&c) = chars.peek() {
                    if c == '\n' || c == '\r' {
                        break;
                    }
                    chars.next();
                }
            }

            // Newlines
            '\n' => {
                tokens.push(Token::new(TokenKind::NewlineTok, "\n", line, col));
                chars.next();
                line += 1;
                col = 1;
            }
            '\r' => {
                chars.next();
                if chars.peek() == Some(&'\n') {
                    chars.next();
                }
                tokens.push(Token::new(TokenKind::NewlineTok, "\n", line, col));
                line += 1;
                col = 1;
            }

            // Comments: -- to end of line
            '-' => {
                let mut peek = chars.clone();
                peek.next();
                if peek.peek() == Some(&'-') {
                    // Skip the entire comment line
                    chars.next();
                    chars.next();
                    col += 2;
                    while let Some(&c) = chars.peek() {
                        if c == '\n' || c == '\r' {
                            break;
                        }
                        chars.next();
                        col += 1;
                    }
                } else {
                    // Minus operator
                    tokens.push(Token::new(TokenKind::Minus, "-", line, col));
                    chars.next();
                    col += 1;
                }
            }

            // String literals
            '"' => {
                chars.next(); // skip opening quote
                let start_col = col;
                col += 1;
                let mut s = String::new();
                loop {
                    match chars.next() {
                        Some('"') => {
                            col += 1;
                            break;
                        }
                        Some(c) => {
                            s.push(c);
                            if c == '\n' {
                                line += 1;
                                col = 1;
                            } else {
                                col += 1;
                            }
                        }
                        None => {
                            return Err(format!("Unterminated string at line {}", line));
                        }
                    }
                }
                tokens.push(Token::new(TokenKind::StringLiteral, s, line, start_col));
            }

            // Numbers
            '0'..='9' => {
                let start_col = col;
                let mut num = String::new();
                let mut has_dot = false;
                while let Some(&c) = chars.peek() {
                    if c.is_ascii_digit() {
                        num.push(c);
                        chars.next();
                        col += 1;
                    } else if c == '.' && !has_dot {
                        has_dot = true;
                        num.push(c);
                        chars.next();
                        col += 1;
                    } else {
                        break;
                    }
                }
                tokens.push(Token::new(TokenKind::NumberLiteral, num, line, start_col));
            }

            // Identifiers and keywords
            'a'..='z' | 'A'..='Z' | '_' => {
                let start_col = col;
                let mut word = String::new();
                while let Some(&c) = chars.peek() {
                    if c.is_alphanumeric() || c == '_' {
                        word.push(c);
                        chars.next();
                        col += 1;
                    } else {
                        break;
                    }
                }
                let kind = keyword_from_str(&word);
                tokens.push(Token::new(kind, word, line, start_col));
            }

            // Operators
            '+' => {
                tokens.push(Token::new(TokenKind::Plus, "+", line, col));
                chars.next();
                col += 1;
            }
            '*' => {
                tokens.push(Token::new(TokenKind::Star, "*", line, col));
                chars.next();
                col += 1;
            }
            '/' => {
                tokens.push(Token::new(TokenKind::Slash, "/", line, col));
                chars.next();
                col += 1;
            }
            '&' => {
                chars.next();
                col += 1;
                if chars.peek() == Some(&'&') {
                    chars.next();
                    col += 1;
                    tokens.push(Token::new(
                        TokenKind::DoubleAmpersand,
                        "&&",
                        line,
                        col - 2,
                    ));
                } else {
                    tokens.push(Token::new(TokenKind::Ampersand, "&", line, col - 1));
                }
            }
            '(' => {
                tokens.push(Token::new(TokenKind::LeftParen, "(", line, col));
                chars.next();
                col += 1;
            }
            ')' => {
                tokens.push(Token::new(TokenKind::RightParen, ")", line, col));
                chars.next();
                col += 1;
            }
            ',' => {
                tokens.push(Token::new(TokenKind::Comma, ",", line, col));
                chars.next();
                col += 1;
            }
            '^' => {
                tokens.push(Token::new(TokenKind::Caret, "^", line, col));
                chars.next();
                col += 1;
            }
            '=' => {
                tokens.push(Token::new(TokenKind::Equals, "=", line, col));
                chars.next();
                col += 1;
            }
            '<' => {
                chars.next();
                col += 1;
                if chars.peek() == Some(&'=') {
                    chars.next();
                    col += 1;
                    tokens.push(Token::new(TokenKind::LessOrEqual, "<=", line, col - 2));
                } else if chars.peek() == Some(&'>') {
                    chars.next();
                    col += 1;
                    tokens.push(Token::new(TokenKind::NotEquals, "<>", line, col - 2));
                } else {
                    tokens.push(Token::new(TokenKind::LessThan, "<", line, col - 1));
                }
            }
            '>' => {
                chars.next();
                col += 1;
                if chars.peek() == Some(&'=') {
                    chars.next();
                    col += 1;
                    tokens.push(Token::new(TokenKind::GreaterOrEqual, ">=", line, col - 2));
                } else {
                    tokens.push(Token::new(TokenKind::GreaterThan, ">", line, col - 1));
                }
            }
            ':' => {
                tokens.push(Token::new(TokenKind::Colon, ":", line, col));
                chars.next();
                col += 1;
            }

            _ => {
                return Err(format!(
                    "Unexpected character '{}' at line {}, col {}",
                    ch, line, col
                ));
            }
        }
    }

    tokens.push(Token::new(TokenKind::Eof, "", line, col));
    Ok(tokens)
}

fn keyword_from_str(word: &str) -> TokenKind {
    match word.to_lowercase().as_str() {
        "on" => TokenKind::On,
        "end" => TokenKind::End,
        "if" => TokenKind::If,
        "then" => TokenKind::Then,
        "else" => TokenKind::Else,
        "repeat" => TokenKind::Repeat,
        "with" => TokenKind::With,
        "to" => TokenKind::To,
        "put" => TokenKind::Put,
        "into" => TokenKind::Into,
        "get" => TokenKind::Get,
        "set" => TokenKind::Set,
        "the" => TokenKind::The,
        "of" => TokenKind::Of,
        "go" => TokenKind::Go,
        "next" => TokenKind::Next,
        "prev" | "previous" => TokenKind::Prev,
        "first" => TokenKind::First,
        "last" => TokenKind::Last,
        "card" => TokenKind::Card,
        "field" => TokenKind::Field,
        "button" => TokenKind::Button,
        "show" => TokenKind::Show,
        "hide" => TokenKind::Hide,
        "answer" => TokenKind::Answer,
        "ask" => TokenKind::Ask,
        "play" => TokenKind::Play,
        "sound" => TokenKind::Sound,
        "wait" => TokenKind::Wait,
        "second" => TokenKind::Second,
        "seconds" => TokenKind::Seconds,
        "pass" => TokenKind::Pass,
        "send" => TokenKind::Send,
        "global" => TokenKind::Global,
        "return" => TokenKind::Return,
        "not" => TokenKind::Not,
        "and" => TokenKind::And,
        "or" => TokenKind::Or,
        "is" => TokenKind::Is,
        "true" => TokenKind::True,
        "false" => TokenKind::False,
        "fetch" => TokenKind::Fetch,
        "sort" => TokenKind::Sort,
        "by" => TokenKind::By,
        "each" => TokenKind::Each,
        "lines" => TokenKind::Lines,
        "words" => TokenKind::Words,
        "items" => TokenKind::Items,
        "characters" | "chars" => TokenKind::Characters,
        "line" => TokenKind::Line,
        "word" => TokenKind::Word,
        "item" => TokenKind::Item,
        "character" | "char" => TokenKind::Character,
        "while" => TokenKind::While,
        "do" => TokenKind::Do,
        "add" => TokenKind::Add,
        "subtract" => TokenKind::Subtract,
        "multiply" => TokenKind::Multiply,
        "divide" => TokenKind::Divide,
        "mod" => TokenKind::Mod,
        "contains" => TokenKind::Contains,
        "there" => TokenKind::There,
        "in" => TokenKind::In,
        "after" => TokenKind::After,
        "before" => TokenKind::Before,
        "it" => TokenKind::It,
        "me" => TokenKind::Me,
        "empty" => TokenKind::Empty,
        "space" => TokenKind::Space,
        "tab" => TokenKind::Tab,
        "newline" | "linefeed" | "return" => {
            // "return" is already handled above as Return keyword
            // This handles newline/linefeed as constant keywords
            if word.to_lowercase() == "return" {
                TokenKind::Return
            } else {
                TokenKind::Newline
            }
        }
        "quote" => TokenKind::Quote,
        "number" => TokenKind::Number,
        "delete" => TokenKind::Delete,
        "select" => TokenKind::Select,
        "visual" => TokenKind::Visual,
        "effect" => TokenKind::Effect,
        "lock" => TokenKind::Lock,
        "unlock" => TokenKind::Unlock,
        "screen" => TokenKind::Screen,
        "message" => TokenKind::Message,
        "box" => TokenKind::Box,
        "background" | "bkgnd" | "bg" => TokenKind::Background,
        "stack" => TokenKind::Stack,
        "down" => TokenKind::Down,
        "up" => TokenKind::Up,
        "colon" => TokenKind::Colon,
        _ => TokenKind::Identifier,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lex_simple_handler() {
        let input = "on mouseUp\n  go to next card\nend mouseUp";
        let tokens = lex(input).unwrap();
        assert_eq!(tokens[0].kind, TokenKind::On);
        assert_eq!(tokens[1].kind, TokenKind::Identifier);
        assert_eq!(tokens[1].text, "mouseUp");
        assert_eq!(tokens[2].kind, TokenKind::NewlineTok);
        assert_eq!(tokens[3].kind, TokenKind::Go);
        assert_eq!(tokens[4].kind, TokenKind::To);
        assert_eq!(tokens[5].kind, TokenKind::Next);
        assert_eq!(tokens[6].kind, TokenKind::Card);
        assert_eq!(tokens[7].kind, TokenKind::NewlineTok);
        assert_eq!(tokens[8].kind, TokenKind::End);
        assert_eq!(tokens[9].kind, TokenKind::Identifier);
        assert_eq!(tokens[9].text, "mouseUp");
        assert_eq!(tokens[10].kind, TokenKind::Eof);
    }

    #[test]
    fn test_lex_string_literal() {
        let input = r#"put "Hello, World" into field "name""#;
        let tokens = lex(input).unwrap();
        assert_eq!(tokens[0].kind, TokenKind::Put);
        assert_eq!(tokens[1].kind, TokenKind::StringLiteral);
        assert_eq!(tokens[1].text, "Hello, World");
        assert_eq!(tokens[2].kind, TokenKind::Into);
        assert_eq!(tokens[3].kind, TokenKind::Field);
        assert_eq!(tokens[4].kind, TokenKind::StringLiteral);
        assert_eq!(tokens[4].text, "name");
    }

    #[test]
    fn test_lex_number() {
        let input = "put 42 into x";
        let tokens = lex(input).unwrap();
        assert_eq!(tokens[0].kind, TokenKind::Put);
        assert_eq!(tokens[1].kind, TokenKind::NumberLiteral);
        assert_eq!(tokens[1].text, "42");
        assert_eq!(tokens[2].kind, TokenKind::Into);
        assert_eq!(tokens[3].kind, TokenKind::Identifier);
        assert_eq!(tokens[3].text, "x");
    }

    #[test]
    fn test_lex_float() {
        let input = "put 3.14 into pi";
        let tokens = lex(input).unwrap();
        assert_eq!(tokens[1].kind, TokenKind::NumberLiteral);
        assert_eq!(tokens[1].text, "3.14");
    }

    #[test]
    fn test_lex_comment() {
        let input = "-- this is a comment\nput 1 into x";
        let tokens = lex(input).unwrap();
        // Comments are skipped, but we get the newline after the comment line
        assert_eq!(tokens[0].kind, TokenKind::NewlineTok);
        assert_eq!(tokens[1].kind, TokenKind::Put);
    }

    #[test]
    fn test_lex_operators() {
        let input = "if x > 10 then";
        let tokens = lex(input).unwrap();
        assert_eq!(tokens[0].kind, TokenKind::If);
        assert_eq!(tokens[1].kind, TokenKind::Identifier);
        assert_eq!(tokens[2].kind, TokenKind::GreaterThan);
        assert_eq!(tokens[3].kind, TokenKind::NumberLiteral);
        assert_eq!(tokens[4].kind, TokenKind::Then);
    }

    #[test]
    fn test_lex_comparison_operators() {
        let tokens = lex("<= >= <> =").unwrap();
        assert_eq!(tokens[0].kind, TokenKind::LessOrEqual);
        assert_eq!(tokens[1].kind, TokenKind::GreaterOrEqual);
        assert_eq!(tokens[2].kind, TokenKind::NotEquals);
        assert_eq!(tokens[3].kind, TokenKind::Equals);
    }

    #[test]
    fn test_lex_ampersand_operators() {
        let tokens = lex("\"a\" & \"b\" && \"c\"").unwrap();
        assert_eq!(tokens[0].kind, TokenKind::StringLiteral);
        assert_eq!(tokens[1].kind, TokenKind::Ampersand);
        assert_eq!(tokens[2].kind, TokenKind::StringLiteral);
        assert_eq!(tokens[3].kind, TokenKind::DoubleAmpersand);
        assert_eq!(tokens[4].kind, TokenKind::StringLiteral);
    }

    #[test]
    fn test_lex_case_insensitive_keywords() {
        let tokens = lex("ON mouseUp\n  GO TO NEXT CARD\nEND mouseUp").unwrap();
        assert_eq!(tokens[0].kind, TokenKind::On);
        assert_eq!(tokens[3].kind, TokenKind::Go);
        assert_eq!(tokens[4].kind, TokenKind::To);
        assert_eq!(tokens[5].kind, TokenKind::Next);
        assert_eq!(tokens[6].kind, TokenKind::Card);
        assert_eq!(tokens[8].kind, TokenKind::End);
    }

    #[test]
    fn test_lex_all_statement_keywords() {
        let tokens = lex("put into set show hide answer ask play sound wait pass send global return fetch").unwrap();
        assert_eq!(tokens[0].kind, TokenKind::Put);
        assert_eq!(tokens[1].kind, TokenKind::Into);
        assert_eq!(tokens[2].kind, TokenKind::Set);
        assert_eq!(tokens[3].kind, TokenKind::Show);
        assert_eq!(tokens[4].kind, TokenKind::Hide);
        assert_eq!(tokens[5].kind, TokenKind::Answer);
        assert_eq!(tokens[6].kind, TokenKind::Ask);
        assert_eq!(tokens[7].kind, TokenKind::Play);
        assert_eq!(tokens[8].kind, TokenKind::Sound);
        assert_eq!(tokens[9].kind, TokenKind::Wait);
        assert_eq!(tokens[10].kind, TokenKind::Pass);
        assert_eq!(tokens[11].kind, TokenKind::Send);
        assert_eq!(tokens[12].kind, TokenKind::Global);
        assert_eq!(tokens[13].kind, TokenKind::Return);
        assert_eq!(tokens[14].kind, TokenKind::Fetch);
    }

    #[test]
    fn test_lex_control_flow_keywords() {
        let tokens = lex("if then else repeat with to end while do").unwrap();
        assert_eq!(tokens[0].kind, TokenKind::If);
        assert_eq!(tokens[1].kind, TokenKind::Then);
        assert_eq!(tokens[2].kind, TokenKind::Else);
        assert_eq!(tokens[3].kind, TokenKind::Repeat);
        assert_eq!(tokens[4].kind, TokenKind::With);
        assert_eq!(tokens[5].kind, TokenKind::To);
        assert_eq!(tokens[6].kind, TokenKind::End);
        assert_eq!(tokens[7].kind, TokenKind::While);
        assert_eq!(tokens[8].kind, TokenKind::Do);
    }

    #[test]
    fn test_lex_chunk_keywords() {
        let tokens = lex("first last line word item character lines words items characters").unwrap();
        assert_eq!(tokens[0].kind, TokenKind::First);
        assert_eq!(tokens[1].kind, TokenKind::Last);
        assert_eq!(tokens[2].kind, TokenKind::Line);
        assert_eq!(tokens[3].kind, TokenKind::Word);
        assert_eq!(tokens[4].kind, TokenKind::Item);
        assert_eq!(tokens[5].kind, TokenKind::Character);
        assert_eq!(tokens[6].kind, TokenKind::Lines);
        assert_eq!(tokens[7].kind, TokenKind::Words);
        assert_eq!(tokens[8].kind, TokenKind::Items);
        assert_eq!(tokens[9].kind, TokenKind::Characters);
    }

    #[test]
    fn test_lex_boolean_and_logic() {
        let tokens = lex("true false not and or is contains").unwrap();
        assert_eq!(tokens[0].kind, TokenKind::True);
        assert_eq!(tokens[1].kind, TokenKind::False);
        assert_eq!(tokens[2].kind, TokenKind::Not);
        assert_eq!(tokens[3].kind, TokenKind::And);
        assert_eq!(tokens[4].kind, TokenKind::Or);
        assert_eq!(tokens[5].kind, TokenKind::Is);
        assert_eq!(tokens[6].kind, TokenKind::Contains);
    }

    #[test]
    fn test_lex_object_references() {
        let tokens = lex("card field button background stack").unwrap();
        assert_eq!(tokens[0].kind, TokenKind::Card);
        assert_eq!(tokens[1].kind, TokenKind::Field);
        assert_eq!(tokens[2].kind, TokenKind::Button);
        assert_eq!(tokens[3].kind, TokenKind::Background);
        assert_eq!(tokens[4].kind, TokenKind::Stack);
    }

    #[test]
    fn test_lex_previous_aliases() {
        let tokens = lex("prev previous").unwrap();
        assert_eq!(tokens[0].kind, TokenKind::Prev);
        assert_eq!(tokens[1].kind, TokenKind::Prev);
    }

    #[test]
    fn test_lex_unterminated_string() {
        let result = lex(r#"put "hello"#);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unterminated string"));
    }

    #[test]
    fn test_lex_unexpected_character() {
        let result = lex("put @invalid");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unexpected character"));
    }

    #[test]
    fn test_lex_arithmetic_operators() {
        let tokens = lex("1 + 2 - 3 * 4 / 5").unwrap();
        assert_eq!(tokens[1].kind, TokenKind::Plus);
        assert_eq!(tokens[3].kind, TokenKind::Minus);
        assert_eq!(tokens[5].kind, TokenKind::Star);
        assert_eq!(tokens[7].kind, TokenKind::Slash);
    }

    #[test]
    fn test_lex_parens_comma() {
        let tokens = lex("myFunc(a, b)").unwrap();
        assert_eq!(tokens[0].kind, TokenKind::Identifier);
        assert_eq!(tokens[1].kind, TokenKind::LeftParen);
        assert_eq!(tokens[2].kind, TokenKind::Identifier);
        assert_eq!(tokens[3].kind, TokenKind::Comma);
        assert_eq!(tokens[4].kind, TokenKind::Identifier);
        assert_eq!(tokens[5].kind, TokenKind::RightParen);
    }

    #[test]
    fn test_lex_multiline_handler() {
        let input = "on mouseUp\n  put 42 into x\n  put x + 1 into y\n  answer y\nend mouseUp";
        let tokens = lex(input).unwrap();
        // Count newlines
        let newlines = tokens
            .iter()
            .filter(|t| t.kind == TokenKind::NewlineTok)
            .count();
        assert_eq!(newlines, 4);
    }

    #[test]
    fn test_lex_empty_input() {
        let tokens = lex("").unwrap();
        assert_eq!(tokens.len(), 1);
        assert_eq!(tokens[0].kind, TokenKind::Eof);
    }

    #[test]
    fn test_lex_only_whitespace() {
        let tokens = lex("   \t  ").unwrap();
        assert_eq!(tokens.len(), 1);
        assert_eq!(tokens[0].kind, TokenKind::Eof);
    }

    #[test]
    fn test_lex_tracks_line_numbers() {
        let tokens = lex("on mouseUp\ngo to next card\nend mouseUp").unwrap();
        assert_eq!(tokens[0].line, 1); // on
        assert_eq!(tokens[3].line, 2); // go
        assert_eq!(tokens[7].line, 3); // end
    }
}
