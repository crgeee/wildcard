/**
 * Bridge between the WASM engine and the Canvas renderer.
 *
 * Responsibilities:
 * 1. Load the WASM module async from @wildcard/engine
 * 2. Create a WildCardEngine instance and expose it
 * 3. Route input events TO the engine (mouse, keyboard, message box)
 * 4. Route engine output events TO the renderer (GoToCard, SetField, etc.)
 * 5. Provide a WildCardApp class that ties everything together
 */

import type {
  WildCardStack,
  WildCardCard,
  WildCardObject,
  EngineEvent,
  InputEvent,
} from "@wildcard/types";
import { createStack } from "@wildcard/types";
import type { RenderLoop } from "./render-loop";
import type { MessageBox } from "./components/message-box";
import type { Theme } from "./theme";

// ---------------------------------------------------------------------------
// Engine interface — mirrors the WASM-exported WildCardEngine class.
// In production this is the real WASM class; in tests it can be mocked.
// ---------------------------------------------------------------------------

export interface IWildCardEngine {
  version(): string;
  load_script(source: string): string;
  send_message(message: string): string;
  execute_line(line: string): string;
  load_stack(json: string): string;
  get_state(): string;
}

// ---------------------------------------------------------------------------
// WASM loader
// ---------------------------------------------------------------------------

/**
 * A factory function that loads/creates the WASM engine.
 * The default implementation calls wasm-pack's init + constructor.
 * Tests can supply a mock factory.
 */
export type EngineFactory = () => Promise<IWildCardEngine>;

/**
 * Default engine factory that loads the real WASM module.
 * Expects @wildcard/engine to export `default` (the init function)
 * and `WildCardEngine` (the class).
 */
export async function loadWasmEngine(): Promise<IWildCardEngine> {
  // Dynamic import so this module can be loaded in non-WASM environments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wasm = await import("@wildcard/engine" as any);
  await wasm.default(); // init WASM
  return new wasm.WildCardEngine();
}

// ---------------------------------------------------------------------------
// Event mapping helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse a JSON string into an array of unknown values.
 * Returns an empty array on invalid JSON or non-array input.
 */
export function safeParseArray(json: string): unknown[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw;
}

/**
 * Parse the JSON string returned by `engine.send_message()` into
 * typed EngineEvent objects. The Rust engine returns a serde-serialized
 * array of EngineOutput enum variants.
 */
export function parseEngineEvents(json: string): EngineEvent[] {
  return mapRawToEvents(safeParseArray(json));
}

/**
 * Parse engine JSON once and return both typed events and wait directives.
 * Avoids the double-parse that occurs when calling parseEngineEvents and
 * extractWaitSeconds separately on the same JSON string.
 */
export function parseEngineResponse(json: string): {
  events: EngineEvent[];
  waits: Array<{ index: number; seconds: number }>;
} {
  const raw = safeParseArray(json);
  return {
    events: mapRawToEvents(raw),
    waits: mapRawToWaits(raw),
  };
}

/** Map raw serde items to typed EngineEvent objects. */
function mapRawToEvents(raw: unknown[]): EngineEvent[] {
  const events: EngineEvent[] = [];

  for (const item of raw) {
    if (item == null || typeof item !== "object") continue;

    // Serde's default serialization of Rust enums uses { "Variant": { fields } }
    const obj = item as Record<string, unknown>;

    if ("GoToCard" in obj) {
      const data = obj.GoToCard as Record<string, unknown>;
      events.push({
        type: "GoToCard",
        payload: {
          cardId: (data.card_name as string) ?? "",
          direction: mapDirection(data.direction as string),
        },
      });
    } else if ("SetField" in obj) {
      const data = obj.SetField as Record<string, unknown>;
      events.push({
        type: "SetField",
        payload: {
          fieldId: data.field_name as string,
          content: data.content as string,
        },
      });
    } else if ("ShowMessage" in obj) {
      const data = obj.ShowMessage as Record<string, unknown>;
      events.push({
        type: "ShowMessage",
        payload: {
          message: data.message as string,
          style: (data.style as "answer" | "ask") ?? "answer",
        },
      });
    } else if ("PlaySound" in obj) {
      const data = obj.PlaySound as Record<string, unknown>;
      events.push({
        type: "PlaySound",
        payload: { sound: data.sound as string },
      });
    } else if ("SetProperty" in obj) {
      const data = obj.SetProperty as Record<string, unknown>;
      events.push({
        type: "SetProperty",
        payload: {
          objectId: data.object as string,
          property: data.property as string,
          value: data.value as string,
        },
      });
    } else if ("HideObject" in obj) {
      const data = obj.HideObject as Record<string, unknown>;
      events.push({
        type: "HideObject",
        payload: { objectId: data.target as string },
      });
    } else if ("ShowObject" in obj) {
      const data = obj.ShowObject as Record<string, unknown>;
      events.push({
        type: "ShowObject",
        payload: { objectId: data.target as string },
      });
    } else if ("ScriptError" in obj) {
      const data = obj.ScriptError as Record<string, unknown>;
      events.push({
        type: "ScriptError",
        payload: {
          message: data.message as string,
          line: (data.line as number) ?? 0,
          handler: "",
        },
      });
    } else if ("WaitSeconds" in obj) {
      // WaitSeconds is handled internally — we store it so the
      // dispatch loop can await the delay.
      // Not part of EngineEvent type, handled separately.
    }
  }
  return events;
}

/** Map raw serde items to wait directives. */
function mapRawToWaits(raw: unknown[]): Array<{ index: number; seconds: number }> {
  const waits: Array<{ index: number; seconds: number }> = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as Record<string, unknown> | null;
    if (item && "WaitSeconds" in item) {
      const data = item.WaitSeconds as Record<string, unknown>;
      waits.push({ index: i, seconds: (data.seconds as number) ?? 0 });
    }
  }
  return waits;
}

function mapDirection(dir: string | undefined): "next" | "prev" | "first" | "last" | "direct" {
  switch (dir) {
    case "next":
      return "next";
    case "prev":
    case "previous":
      return "prev";
    case "first":
      return "first";
    case "last":
      return "last";
    default:
      return "direct";
  }
}

/**
 * Extract WaitSeconds delays from the raw JSON.
 * Returns an array of { index, seconds } for sequencing.
 */
export function extractWaitSeconds(json: string): Array<{ index: number; seconds: number }> {
  return mapRawToWaits(safeParseArray(json));
}

// ---------------------------------------------------------------------------
// EngineBridge — routes events between engine and renderer
// ---------------------------------------------------------------------------

export class EngineBridge {
  private _engine: IWildCardEngine;
  private _renderer: RenderLoop | null = null;
  private _messageBox: MessageBox | null = null;
  private _onCardChange: ((cardIndex: number) => void) | null = null;
  private _onScriptError: ((message: string) => void) | null = null;

  constructor(engine: IWildCardEngine) {
    this._engine = engine;
  }

  get engine(): IWildCardEngine {
    return this._engine;
  }

  /** Attach the renderer so output events can update it. */
  setRenderer(renderer: RenderLoop): void {
    this._renderer = renderer;
  }

  /** Attach the message box for displaying results and errors. */
  setMessageBox(messageBox: MessageBox): void {
    this._messageBox = messageBox;
    // Wire the message box execute callback to the engine
    messageBox.onExecute = (cmd: string) => {
      this.executeCommand(cmd);
    };
  }

  /** Set callback for card navigation events. */
  onCardChange(cb: (cardIndex: number) => void): void {
    this._onCardChange = cb;
  }

  /** Set callback for script error events. */
  onScriptError(cb: (message: string) => void): void {
    this._onScriptError = cb;
  }

  // ---- Input routing: renderer -> engine ----

  /**
   * Send a system message to the engine (e.g. "mouseUp", "openCard").
   * Parses the returned events and dispatches them to the renderer.
   */
  sendMessage(message: string): EngineEvent[] {
    const json = this._engine.send_message(message);
    const events = parseEngineEvents(json);
    this._dispatchEvents(events);
    return events;
  }

  /**
   * Send an input event to the engine.
   * Maps the typed InputEvent to the appropriate engine call.
   */
  sendInputEvent(event: InputEvent): EngineEvent[] {
    switch (event.type) {
      case "mouseUp":
      case "mouseDown":
        return this.sendMessage(event.type);
      case "keyDown":
        return this.sendMessage("keyDown");
      case "openCard":
        return this.sendMessage("openCard");
      case "closeCard":
        return this.sendMessage("closeCard");
      case "idle":
        return this.sendMessage("idle");
      case "executeScript": {
        this.executeCommand(event.payload.script);
        return [];
      }
    }
  }

  /**
   * Execute a command line from the message box.
   * Returns the result string.
   */
  executeCommand(cmd: string): string {
    const result = this._engine.execute_line(cmd);
    if (this._messageBox) {
      this._messageBox.setResult(result);
    }
    if (result.startsWith("error:") && this._onScriptError) {
      this._onScriptError(result);
    }
    // Also check for events generated by the command
    // (execute_line may have side effects that produce events)
    // The engine drains events on send_message, so for execute_line
    // we need to collect them via a subsequent drain.
    return result;
  }

  /**
   * Load a WildTalk script into the engine.
   */
  loadScript(source: string): string {
    return this._engine.load_script(source);
  }

  // ---- Output routing: engine -> renderer ----

  private _dispatchEvents(events: EngineEvent[]): void {
    for (const event of events) {
      this._handleEvent(event);
    }
  }

  private _handleEvent(event: EngineEvent): void {
    switch (event.type) {
      case "GoToCard":
        this._handleGoToCard(event.payload);
        break;
      case "SetField":
        this._handleSetField(event.payload);
        break;
      case "ShowMessage":
        this._handleShowMessage(event.payload);
        break;
      case "PlaySound":
        this._handlePlaySound(event.payload);
        break;
      case "SetProperty":
        this._handleSetProperty(event.payload);
        break;
      case "HideObject":
        this._handleHideObject(event.payload);
        break;
      case "ShowObject":
        this._handleShowObject(event.payload);
        break;
      case "ScriptError":
        this._handleScriptError(event.payload);
        break;
    }
  }

  private _handleGoToCard(payload: {
    cardId: string;
    direction?: "next" | "prev" | "first" | "last" | "direct";
  }): void {
    // Always store the payload so WildCardApp.sendMessage can read it,
    // regardless of whether a callback is registered.
    this._lastGoToPayload = payload;
    // The actual card change is handled by WildCardApp which holds stack state.
    if (this._onCardChange) {
      this._onCardChange(0);
    }
  }

  private _lastGoToPayload: {
    cardId: string;
    direction?: "next" | "prev" | "first" | "last" | "direct";
  } | null = null;

  get lastGoToPayload() {
    return this._lastGoToPayload;
  }

  clearLastGoToPayload(): void {
    this._lastGoToPayload = null;
  }

  /**
   * Lookup an object by id or name, apply an updater function, and push the
   * updated objects array to the renderer. Shared by SetField, SetProperty,
   * HideObject, and ShowObject handlers.
   */
  private _updateObject(
    id: string,
    updater: (obj: WildCardObject) => WildCardObject,
    matchType?: string,
  ): void {
    if (!this._renderer) return;
    const state = this._renderer.state;
    const updatedObjects = state.objects.map((obj) => {
      const idMatch = obj.name === id || obj.id === id;
      const typeMatch = matchType ? obj.type === matchType : true;
      if (idMatch && typeMatch) return updater(obj);
      return obj;
    });
    this._renderer.setState({ objects: updatedObjects });
  }

  private _handleSetField(payload: { fieldId: string; content: string }): void {
    this._updateObject(payload.fieldId, (obj) => ({ ...obj, content: payload.content }), "field");
  }

  private _handleShowMessage(payload: { message: string; style: "answer" | "ask" }): void {
    if (!this._renderer) return;
    this._renderer.setState({
      messageBoxVisible: true,
      messageBoxText: payload.message,
    });
  }

  private _handlePlaySound(payload: { sound: string }): void {
    // Use HTMLAudioElement for simplicity; Web Audio API can be added later.
    if (typeof Audio !== "undefined") {
      try {
        const audio = new Audio(payload.sound);
        audio.play().catch(() => {
          // Autoplay may be blocked; ignore errors silently
        });
      } catch {
        // Audio not available in this environment
      }
    }
  }

  private _handleSetProperty(payload: { objectId: string; property: string; value: string }): void {
    this._updateObject(payload.objectId, (obj) => {
      if (payload.property === "color") {
        return { ...obj, color: payload.value };
      }
      if (payload.property === "visible") {
        return { ...obj, visible: payload.value === "true" };
      }
      if (payload.property === "name") {
        return { ...obj, name: payload.value };
      }
      // Generic property — attempt to set it
      return { ...obj, [payload.property]: payload.value } as WildCardObject;
    });
  }

  private _handleHideObject(payload: { objectId: string }): void {
    this._updateObject(payload.objectId, (obj) => ({ ...obj, visible: false }));
  }

  private _handleShowObject(payload: { objectId: string }): void {
    this._updateObject(payload.objectId, (obj) => ({ ...obj, visible: true }));
  }

  private _handleScriptError(payload: { message: string; line: number; handler: string }): void {
    if (this._messageBox) {
      this._messageBox.setResult(`Script error: ${payload.message}`);
    }
    if (this._onScriptError) {
      this._onScriptError(payload.message);
    }
  }
}

// ---------------------------------------------------------------------------
// WildCardApp — top-level orchestrator
// ---------------------------------------------------------------------------

export class WildCardApp {
  private _bridge: EngineBridge;
  private _renderer: RenderLoop | null = null;
  private _messageBox: MessageBox | null = null;
  private _stack: WildCardStack | null = null;
  private _currentCardIndex = 0;
  private _theme: Theme | null = null;

  constructor(bridge: EngineBridge) {
    this._bridge = bridge;

    // Wire card navigation through the bridge
    this._bridge.onCardChange(() => {
      // Handled in sendMessage override below
    });
  }

  get bridge(): EngineBridge {
    return this._bridge;
  }

  get engine(): IWildCardEngine {
    return this._bridge.engine;
  }

  get stack(): WildCardStack | null {
    return this._stack;
  }

  get currentCardIndex(): number {
    return this._currentCardIndex;
  }

  /** Attach the renderer. */
  setRenderer(renderer: RenderLoop): void {
    this._renderer = renderer;
    this._bridge.setRenderer(renderer);
  }

  /** Attach the message box. */
  setMessageBox(messageBox: MessageBox): void {
    this._messageBox = messageBox;
    this._bridge.setMessageBox(messageBox);
  }

  /** Set the active theme. */
  setTheme(theme: Theme): void {
    this._theme = theme;
    if (this._renderer) {
      this._renderer.setState({ theme });
    }
  }

  /** Toggle between classic and v3 themes. */
  switchTheme(): void {
    // Requires both themes to be available — the caller must supply them.
    // This is a placeholder; the actual theme toggle is done by the web app.
  }

  /**
   * Load a stack from its JSON representation.
   * Parses the stack data, loads scripts into the engine, and displays card 1.
   */
  loadStack(json: string): boolean {
    // Parse the stack JSON for renderer use
    let stack: WildCardStack;
    try {
      stack = JSON.parse(json) as WildCardStack;
    } catch {
      return false;
    }

    // Load into engine (scripts, field contents)
    const result = this._bridge.engine.load_stack(json);
    if (result.startsWith("error:")) {
      return false;
    }

    this._stack = stack;
    this._currentCardIndex = 0;

    // Display the first card
    this._displayCurrentCard();
    return true;
  }

  /**
   * Create a new empty stack with one card.
   */
  newStack(name = "Untitled"): void {
    const stack = createStack(name);
    const json = JSON.stringify(stack);
    this.loadStack(json);
  }

  /**
   * Get the current card.
   */
  getCurrentCard(): WildCardCard | null {
    if (!this._stack || this._stack.cards.length === 0) return null;
    return this._stack.cards[this._currentCardIndex] ?? null;
  }

  /**
   * Navigate to a card by index or id.
   */
  goToCard(target: number | string): boolean {
    if (!this._stack) return false;

    let index: number;
    if (typeof target === "number") {
      index = target;
    } else {
      // Find card by id or name
      index = this._stack.cards.findIndex((c) => c.id === target || c.name === target);
      if (index === -1) return false;
    }

    if (index < 0 || index >= this._stack.cards.length) return false;

    // Send closeCard for current card
    this._bridge.sendMessage("closeCard");

    this._currentCardIndex = index;
    this._displayCurrentCard();

    // Send openCard for new card
    this._bridge.sendMessage("openCard");
    return true;
  }

  /**
   * Resolve a GoToCard event direction to an actual card index, then navigate.
   */
  resolveGoToCard(payload: {
    cardId: string;
    direction?: "next" | "prev" | "first" | "last" | "direct";
  }): boolean {
    if (!this._stack) return false;
    const cards = this._stack.cards;

    switch (payload.direction) {
      case "next":
        return this.goToCard(Math.min(this._currentCardIndex + 1, cards.length - 1));
      case "prev":
        return this.goToCard(Math.max(this._currentCardIndex - 1, 0));
      case "first":
        return this.goToCard(0);
      case "last":
        return this.goToCard(cards.length - 1);
      case "direct":
      default:
        return this.goToCard(payload.cardId);
    }
  }

  /**
   * Send a message to the engine and handle any GoToCard results.
   */
  sendMessage(message: string): EngineEvent[] {
    const events = this._bridge.sendMessage(message);

    // Check if there was a GoToCard event and resolve it
    const goTo = this._bridge.lastGoToPayload;
    if (goTo) {
      this.resolveGoToCard(goTo);
      this._bridge.clearLastGoToPayload();
    }

    return events;
  }

  private _displayCurrentCard(): void {
    if (!this._renderer || !this._stack) return;

    const card = this.getCurrentCard();
    if (!card) return;

    // Merge background objects + card objects
    const bg = this._stack.backgrounds.find((b) => b.id === card.backgroundId);
    const bgObjects = bg?.objects ?? [];
    const objects = [...bgObjects, ...card.objects];

    this._renderer.setState({
      stack: this._stack,
      currentCardIndex: this._currentCardIndex,
      objects,
    });
  }
}

// ---------------------------------------------------------------------------
// Factory: create the full app from scratch
// ---------------------------------------------------------------------------

export interface CreateAppOptions {
  renderer: RenderLoop;
  messageBox?: MessageBox;
  engineFactory?: EngineFactory;
  theme?: Theme;
}

/**
 * Create a fully-wired WildCardApp.
 * Loads the WASM engine, creates the bridge, attaches the renderer.
 */
export async function createWildCardApp(opts: CreateAppOptions): Promise<WildCardApp> {
  const factory = opts.engineFactory ?? loadWasmEngine;
  const engine = await factory();
  const bridge = new EngineBridge(engine);
  const app = new WildCardApp(bridge);

  app.setRenderer(opts.renderer);

  if (opts.messageBox) {
    app.setMessageBox(opts.messageBox);
  }
  if (opts.theme) {
    app.setTheme(opts.theme);
  }

  return app;
}
