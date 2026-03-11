pub mod ast;
pub mod interpreter;
pub mod lexer;
pub mod parser;
pub mod runtime;
pub mod token;

use runtime::Runtime;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct WildCardEngine {
    runtime: Runtime,
}

#[wasm_bindgen]
impl WildCardEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            runtime: Runtime::new(),
        }
    }

    /// Returns the engine version string.
    pub fn version(&self) -> String {
        "0.0.1".to_string()
    }

    /// Load a WildTalk script (compiles handlers into the runtime).
    /// Returns "ok" on success or "error: <message>" on failure.
    pub fn load_script(&mut self, source: &str) -> String {
        match self.runtime.load_script(source) {
            Ok(()) => "ok".to_string(),
            Err(e) => format!("error: {}", e),
        }
    }

    /// Send a message (e.g. "mouseUp") to the runtime.
    /// Returns a JSON array of engine output events.
    pub fn send_message(&mut self, message: &str) -> String {
        self.runtime.send_message(message);
        let events = self.runtime.drain_events();
        serde_json::to_string(&events).unwrap_or_else(|_| "[]".to_string())
    }

    /// Execute a single line from the message box.
    /// Returns the result string (value of "it").
    pub fn execute_line(&mut self, line: &str) -> String {
        match self.runtime.execute_line(line) {
            Ok(result) => result,
            Err(e) => format!("error: {}", e),
        }
    }

    /// Load a stack from its JSON representation.
    /// Extracts and compiles all scripts, loads field contents.
    pub fn load_stack(&mut self, json: &str) -> String {
        match self.runtime.load_stack_json(json) {
            Ok(()) => "ok".to_string(),
            Err(e) => format!("error: {}", e),
        }
    }

    /// Get the current runtime state as JSON.
    /// Includes variables, field contents, and handler names.
    pub fn get_state(&self) -> String {
        self.runtime.get_state_json()
    }
}

impl Default for WildCardEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        let engine = WildCardEngine::new();
        assert_eq!(engine.version(), "0.0.1");
    }

    #[test]
    fn test_wasm_create_runtime() {
        let engine = WildCardEngine::new();
        assert_eq!(engine.version(), "0.0.1");
    }

    #[test]
    fn test_wasm_load_and_execute() {
        let mut engine = WildCardEngine::new();
        let result = engine.load_script("on mouseUp\n  put 42 into x\nend mouseUp");
        assert_eq!(result, "ok");
        let events_json = engine.send_message("mouseUp");
        // put into variable doesn't emit events
        assert_eq!(events_json, "[]");
    }

    #[test]
    fn test_wasm_go_event() {
        let mut engine = WildCardEngine::new();
        engine.load_script("on mouseUp\n  go to next card\nend mouseUp");
        let events_json = engine.send_message("mouseUp");
        assert!(events_json.contains("GoToCard"));
    }

    #[test]
    fn test_wasm_answer_event() {
        let mut engine = WildCardEngine::new();
        engine.load_script("on mouseUp\n  answer \"Hello!\"\nend mouseUp");
        let events_json = engine.send_message("mouseUp");
        assert!(events_json.contains("ShowMessage"));
        assert!(events_json.contains("Hello!"));
    }

    #[test]
    fn test_wasm_execute_line() {
        let mut engine = WildCardEngine::new();
        let result = engine.execute_line("put 42 into x");
        assert!(result.is_empty() || !result.contains("error"));
    }

    #[test]
    fn test_wasm_load_script_error() {
        let mut engine = WildCardEngine::new();
        let result = engine.load_script("this is not valid");
        assert!(result.starts_with("error:"));
    }

    #[test]
    fn test_wasm_get_state() {
        let mut engine = WildCardEngine::new();
        engine.load_script("on test\n  put 1 into x\nend test");
        engine.send_message("test");
        let state = engine.get_state();
        assert!(state.contains("handlers"));
        assert!(state.contains("variables"));
    }

    #[test]
    fn test_wasm_load_stack() {
        let mut engine = WildCardEngine::new();
        let stack_json = r#"{
            "version": "1.0",
            "name": "Test Stack",
            "id": "stack_1",
            "width": 512,
            "height": 342,
            "cards": [{
                "id": "card_1",
                "name": "",
                "backgroundId": "bg_1",
                "objects": [{
                    "type": "field",
                    "id": "field_1",
                    "name": "greeting",
                    "content": "Hello World",
                    "script": ""
                }],
                "script": "on mouseUp\n  go to next card\nend mouseUp",
                "paintData": null
            }],
            "backgrounds": [],
            "script": "",
            "createdAt": "2026-01-01",
            "modifiedAt": "2026-01-01"
        }"#;
        let result = engine.load_stack(stack_json);
        assert_eq!(result, "ok");

        // Should have loaded the mouseUp handler
        let events = engine.send_message("mouseUp");
        assert!(events.contains("GoToCard"));
    }

    #[test]
    fn test_wasm_multiple_messages() {
        let mut engine = WildCardEngine::new();
        engine.load_script("on mouseUp\n  go to next card\nend mouseUp\n\non mouseDown\n  answer \"clicked\"\nend mouseDown");

        let events1 = engine.send_message("mouseUp");
        assert!(events1.contains("GoToCard"));

        let events2 = engine.send_message("mouseDown");
        assert!(events2.contains("ShowMessage"));
    }

    #[test]
    fn test_wasm_set_property_event() {
        let mut engine = WildCardEngine::new();
        engine.load_script("on test\n  set the color of button \"submit\" to \"red\"\nend test");
        let events = engine.send_message("test");
        assert!(events.contains("SetProperty"));
        assert!(events.contains("color"));
        assert!(events.contains("red"));
    }

    #[test]
    fn test_wasm_play_sound_event() {
        let mut engine = WildCardEngine::new();
        engine.load_script("on test\n  play sound \"click.wav\"\nend test");
        let events = engine.send_message("test");
        assert!(events.contains("PlaySound"));
        assert!(events.contains("click.wav"));
    }

    #[test]
    fn test_wasm_show_hide_events() {
        let mut engine = WildCardEngine::new();
        engine.load_script("on test\n  show button \"Go\"\n  hide field \"secret\"\nend test");
        let events = engine.send_message("test");
        assert!(events.contains("ShowObject"));
        assert!(events.contains("HideObject"));
    }

    #[test]
    fn test_default_trait() {
        let engine = WildCardEngine::default();
        assert_eq!(engine.version(), "0.0.1");
    }
}
