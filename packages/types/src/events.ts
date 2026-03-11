// Engine events: WASM engine → JS renderer
export type EngineEvent =
  | { type: "GoToCard"; payload: { cardId: string; direction?: "next" | "prev" | "first" | "last" | "direct" } }
  | { type: "SetField"; payload: { fieldId: string; content: string } }
  | { type: "PlaySound"; payload: { sound: string } }
  | { type: "ShowMessage"; payload: { message: string; style: "answer" | "ask" } }
  | { type: "SetProperty"; payload: { objectId: string; property: string; value: string } }
  | { type: "VisualEffect"; payload: { effect: string; speed?: "fast" | "slow" | "normal" } }
  | { type: "HideObject"; payload: { objectId: string } }
  | { type: "ShowObject"; payload: { objectId: string } }
  | { type: "ScriptError"; payload: { message: string; line: number; handler: string } };

// Input events: JS renderer → WASM engine
export type InputEvent =
  | { type: "mouseUp"; payload: { objectId: string | null; x: number; y: number } }
  | { type: "mouseDown"; payload: { objectId: string | null; x: number; y: number } }
  | { type: "keyDown"; payload: { key: string; modifiers: string[] } }
  | { type: "openCard"; payload: { cardId: string } }
  | { type: "closeCard"; payload: { cardId: string } }
  | { type: "idle"; payload: Record<string, never> }
  | { type: "executeScript"; payload: { script: string } };
