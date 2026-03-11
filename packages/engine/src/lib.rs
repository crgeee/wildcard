pub mod token;
pub mod lexer;
pub mod ast;
pub mod parser;
pub mod runtime;
pub mod interpreter;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn version() -> String {
    "0.0.1".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert_eq!(version(), "0.0.1");
    }
}
