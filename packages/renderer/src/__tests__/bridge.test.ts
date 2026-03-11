/**
 * Tests for the Engine-Renderer bridge.
 *
 * Uses a mock WildCardEngine that returns pre-built event JSON,
 * allowing us to test event routing without actual WASM.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  EngineBridge,
  WildCardApp,
  parseEngineEvents,
  extractWaitSeconds,
  createWildCardApp,
} from "../bridge";
import type { IWildCardEngine } from "../bridge";
import type { EngineEvent as _EngineEvent } from "@wildcard/types";

// ---------------------------------------------------------------------------
// Mock engine
// ---------------------------------------------------------------------------

function createMockEngine(overrides: Partial<IWildCardEngine> = {}): IWildCardEngine {
  return {
    version: vi.fn().mockReturnValue("0.0.1"),
    load_script: vi.fn().mockReturnValue("ok"),
    send_message: vi.fn().mockReturnValue("[]"),
    execute_line: vi.fn().mockReturnValue(""),
    load_stack: vi.fn().mockReturnValue("ok"),
    get_state: vi.fn().mockReturnValue('{"variables":{},"fields":{},"handlers":[]}'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock renderer (minimal RenderLoop interface)
// ---------------------------------------------------------------------------

function createMockRenderer() {
  const _state = {
    theme: null as unknown,
    stack: null,
    currentCardIndex: 0,
    objects: [] as Array<{
      type: string;
      id: string;
      name: string;
      visible: boolean;
      [k: string]: unknown;
    }>,
    activeTool: "browse",
    messageBoxVisible: false,
    messageBoxText: "",
    scriptEditorVisible: false,
    scriptEditorContent: "",
    scriptEditorTitle: "",
    userLevel: 1,
  };

  return {
    get state() {
      return _state;
    },
    setState: vi.fn((updates: Record<string, unknown>) => {
      Object.assign(_state, updates);
    }),
    start: vi.fn(),
    stop: vi.fn(),
    renderFrame: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Mock message box
// ---------------------------------------------------------------------------

function createMockMessageBox() {
  return {
    onExecute: null as ((cmd: string) => void) | null,
    setResult: vi.fn(),
    isVisible: false,
    text: "",
    result: "",
    show: vi.fn(),
    hide: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// parseEngineEvents
// ---------------------------------------------------------------------------

describe("parseEngineEvents", () => {
  it("parses an empty array", () => {
    expect(parseEngineEvents("[]")).toEqual([]);
  });

  it("parses GoToCard events", () => {
    const json = JSON.stringify([{ GoToCard: { direction: "next", card_name: null } }]);
    const events = parseEngineEvents(json);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("GoToCard");
    if (events[0].type === "GoToCard") {
      expect(events[0].payload.direction).toBe("next");
    }
  });

  it("parses SetField events", () => {
    const json = JSON.stringify([{ SetField: { field_name: "greeting", content: "Hello" } }]);
    const events = parseEngineEvents(json);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("SetField");
    if (events[0].type === "SetField") {
      expect(events[0].payload.fieldId).toBe("greeting");
      expect(events[0].payload.content).toBe("Hello");
    }
  });

  it("parses ShowMessage events", () => {
    const json = JSON.stringify([{ ShowMessage: { message: "Hello!", style: "answer" } }]);
    const events = parseEngineEvents(json);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("ShowMessage");
    if (events[0].type === "ShowMessage") {
      expect(events[0].payload.message).toBe("Hello!");
      expect(events[0].payload.style).toBe("answer");
    }
  });

  it("parses PlaySound events", () => {
    const json = JSON.stringify([{ PlaySound: { sound: "click.wav" } }]);
    const events = parseEngineEvents(json);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("PlaySound");
    if (events[0].type === "PlaySound") {
      expect(events[0].payload.sound).toBe("click.wav");
    }
  });

  it("parses SetProperty events", () => {
    const json = JSON.stringify([
      { SetProperty: { object: "submit", property: "color", value: "red" } },
    ]);
    const events = parseEngineEvents(json);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("SetProperty");
    if (events[0].type === "SetProperty") {
      expect(events[0].payload.objectId).toBe("submit");
      expect(events[0].payload.property).toBe("color");
      expect(events[0].payload.value).toBe("red");
    }
  });

  it("parses HideObject and ShowObject events", () => {
    const json = JSON.stringify([
      { HideObject: { target: "secret" } },
      { ShowObject: { target: "Go" } },
    ]);
    const events = parseEngineEvents(json);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("HideObject");
    expect(events[1].type).toBe("ShowObject");
  });

  it("parses ScriptError events", () => {
    const json = JSON.stringify([{ ScriptError: { message: "Unknown command", line: 3 } }]);
    const events = parseEngineEvents(json);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("ScriptError");
    if (events[0].type === "ScriptError") {
      expect(events[0].payload.message).toBe("Unknown command");
      expect(events[0].payload.line).toBe(3);
    }
  });

  it("handles multiple events", () => {
    const json = JSON.stringify([
      { SetField: { field_name: "a", content: "1" } },
      { GoToCard: { direction: "next", card_name: null } },
      { PlaySound: { sound: "beep" } },
    ]);
    const events = parseEngineEvents(json);
    expect(events).toHaveLength(3);
    expect(events[0].type).toBe("SetField");
    expect(events[1].type).toBe("GoToCard");
    expect(events[2].type).toBe("PlaySound");
  });

  it("handles invalid JSON gracefully", () => {
    expect(parseEngineEvents("not json")).toEqual([]);
    expect(parseEngineEvents("")).toEqual([]);
    expect(parseEngineEvents("null")).toEqual([]);
  });

  it("maps 'previous' direction to 'prev'", () => {
    const json = JSON.stringify([{ GoToCard: { direction: "previous", card_name: null } }]);
    const events = parseEngineEvents(json);
    if (events[0].type === "GoToCard") {
      expect(events[0].payload.direction).toBe("prev");
    }
  });
});

// ---------------------------------------------------------------------------
// extractWaitSeconds
// ---------------------------------------------------------------------------

describe("extractWaitSeconds", () => {
  it("extracts wait seconds from event array", () => {
    const json = JSON.stringify([
      { SetField: { field_name: "a", content: "1" } },
      { WaitSeconds: { seconds: 2.5 } },
      { GoToCard: { direction: "next", card_name: null } },
    ]);
    const waits = extractWaitSeconds(json);
    expect(waits).toHaveLength(1);
    expect(waits[0]).toEqual({ index: 1, seconds: 2.5 });
  });

  it("returns empty for no waits", () => {
    expect(extractWaitSeconds("[]")).toEqual([]);
  });

  it("handles invalid JSON", () => {
    expect(extractWaitSeconds("bad")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// EngineBridge — input routing
// ---------------------------------------------------------------------------

describe("EngineBridge", () => {
  let engine: IWildCardEngine;
  let bridge: EngineBridge;
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(() => {
    engine = createMockEngine();
    bridge = new EngineBridge(engine);
    renderer = createMockRenderer();
    bridge.setRenderer(renderer as unknown as import("../render-loop").RenderLoop);
  });

  it("exposes the engine", () => {
    expect(bridge.engine).toBe(engine);
  });

  it("routes sendMessage to engine.send_message", () => {
    bridge.sendMessage("mouseUp");
    expect(engine.send_message).toHaveBeenCalledWith("mouseUp");
  });

  it("routes mouseUp input event", () => {
    bridge.sendInputEvent({
      type: "mouseUp",
      payload: { objectId: "btn1", x: 100, y: 50 },
    });
    expect(engine.send_message).toHaveBeenCalledWith("mouseUp");
  });

  it("routes mouseDown input event", () => {
    bridge.sendInputEvent({
      type: "mouseDown",
      payload: { objectId: null, x: 0, y: 0 },
    });
    expect(engine.send_message).toHaveBeenCalledWith("mouseDown");
  });

  it("routes keyDown input event", () => {
    bridge.sendInputEvent({
      type: "keyDown",
      payload: { key: "a", modifiers: [] },
    });
    expect(engine.send_message).toHaveBeenCalledWith("keyDown");
  });

  it("routes openCard input event", () => {
    bridge.sendInputEvent({
      type: "openCard",
      payload: { cardId: "card_1" },
    });
    expect(engine.send_message).toHaveBeenCalledWith("openCard");
  });

  it("routes executeScript to execute_line", () => {
    bridge.sendInputEvent({
      type: "executeScript",
      payload: { script: "put 42" },
    });
    expect(engine.execute_line).toHaveBeenCalledWith("put 42");
  });

  it("routes idle input event", () => {
    bridge.sendInputEvent({
      type: "idle",
      payload: {},
    });
    expect(engine.send_message).toHaveBeenCalledWith("idle");
  });
});

// ---------------------------------------------------------------------------
// EngineBridge — output routing (event handling)
// ---------------------------------------------------------------------------

describe("EngineBridge output routing", () => {
  let engine: IWildCardEngine;
  let bridge: EngineBridge;
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(() => {
    engine = createMockEngine();
    bridge = new EngineBridge(engine);
    renderer = createMockRenderer();
    bridge.setRenderer(renderer as unknown as import("../render-loop").RenderLoop);
  });

  it("handles SetField by updating renderer objects", () => {
    // Set up objects in renderer state
    renderer.state.objects = [
      {
        type: "field",
        id: "f1",
        name: "greeting",
        visible: true,
        content: "old",
        style: "rectangle",
        rect: { x: 0, y: 0, width: 100, height: 30 },
        script: "",
        lockText: false,
        color: null,
      },
    ] as never[];

    const json = JSON.stringify([{ SetField: { field_name: "greeting", content: "Hello World" } }]);
    (engine.send_message as ReturnType<typeof vi.fn>).mockReturnValue(json);

    bridge.sendMessage("mouseUp");

    expect(renderer.setState).toHaveBeenCalled();
    const lastCall = renderer.setState.mock.calls[renderer.setState.mock.calls.length - 1][0];
    const updatedField = (lastCall.objects as Array<{ content: string }>).find(
      (o: { content: string }) => o.content === "Hello World",
    );
    expect(updatedField).toBeTruthy();
  });

  it("handles ShowMessage by updating renderer state", () => {
    const json = JSON.stringify([{ ShowMessage: { message: "Welcome!", style: "answer" } }]);
    (engine.send_message as ReturnType<typeof vi.fn>).mockReturnValue(json);

    bridge.sendMessage("mouseUp");

    expect(renderer.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        messageBoxVisible: true,
        messageBoxText: "Welcome!",
      }),
    );
  });

  it("handles HideObject by setting visible=false", () => {
    renderer.state.objects = [
      { type: "button", id: "b1", name: "secret", visible: true },
    ] as never[];

    const json = JSON.stringify([{ HideObject: { target: "secret" } }]);
    (engine.send_message as ReturnType<typeof vi.fn>).mockReturnValue(json);

    bridge.sendMessage("test");

    const lastCall = renderer.setState.mock.calls[renderer.setState.mock.calls.length - 1][0];
    const hidden = (lastCall.objects as Array<{ name: string; visible: boolean }>).find(
      (o) => o.name === "secret",
    );
    expect(hidden?.visible).toBe(false);
  });

  it("handles ShowObject by setting visible=true", () => {
    renderer.state.objects = [{ type: "button", id: "b1", name: "Go", visible: false }] as never[];

    const json = JSON.stringify([{ ShowObject: { target: "Go" } }]);
    (engine.send_message as ReturnType<typeof vi.fn>).mockReturnValue(json);

    bridge.sendMessage("test");

    const lastCall = renderer.setState.mock.calls[renderer.setState.mock.calls.length - 1][0];
    const shown = (lastCall.objects as Array<{ name: string; visible: boolean }>).find(
      (o) => o.name === "Go",
    );
    expect(shown?.visible).toBe(true);
  });

  it("handles SetProperty by updating object property", () => {
    renderer.state.objects = [
      { type: "button", id: "b1", name: "submit", visible: true, color: null },
    ] as never[];

    const json = JSON.stringify([
      { SetProperty: { object: "submit", property: "color", value: "red" } },
    ]);
    (engine.send_message as ReturnType<typeof vi.fn>).mockReturnValue(json);

    bridge.sendMessage("test");

    const lastCall = renderer.setState.mock.calls[renderer.setState.mock.calls.length - 1][0];
    const btn = (lastCall.objects as Array<{ name: string; color: string }>).find(
      (o) => o.name === "submit",
    );
    expect(btn?.color).toBe("red");
  });

  it("handles ScriptError by setting message box result", () => {
    const msgBox = createMockMessageBox();
    bridge.setMessageBox(msgBox as never);

    const json = JSON.stringify([{ ScriptError: { message: "Unknown variable", line: 5 } }]);
    (engine.send_message as ReturnType<typeof vi.fn>).mockReturnValue(json);

    bridge.sendMessage("test");

    expect(msgBox.setResult).toHaveBeenCalledWith("Script error: Unknown variable");
  });

  it("stores GoToCard payload for resolution by WildCardApp", () => {
    bridge.onCardChange(() => {});

    const json = JSON.stringify([{ GoToCard: { direction: "next", card_name: null } }]);
    (engine.send_message as ReturnType<typeof vi.fn>).mockReturnValue(json);

    bridge.sendMessage("mouseUp");

    expect(bridge.lastGoToPayload).toEqual({
      cardId: "",
      direction: "next",
    });
  });
});

// ---------------------------------------------------------------------------
// EngineBridge — message box integration
// ---------------------------------------------------------------------------

describe("EngineBridge message box", () => {
  it("wires message box onExecute to executeCommand", () => {
    const engine = createMockEngine();
    const bridge = new EngineBridge(engine);
    const msgBox = createMockMessageBox();

    bridge.setMessageBox(msgBox as never);

    // The bridge should have set onExecute
    expect(msgBox.onExecute).toBeTypeOf("function");

    // Simulate message box executing a command
    msgBox.onExecute!("put the date");
    expect(engine.execute_line).toHaveBeenCalledWith("put the date");
  });

  it("sets result on message box after execute", () => {
    const engine = createMockEngine({
      execute_line: vi.fn().mockReturnValue("March 10, 2026"),
    });
    const bridge = new EngineBridge(engine);
    const msgBox = createMockMessageBox();
    bridge.setMessageBox(msgBox as never);

    bridge.executeCommand("the date");

    expect(msgBox.setResult).toHaveBeenCalledWith("March 10, 2026");
  });

  it("sets error result on message box for errors", () => {
    const engine = createMockEngine({
      execute_line: vi.fn().mockReturnValue("error: Unknown command"),
    });
    const bridge = new EngineBridge(engine);
    const msgBox = createMockMessageBox();
    bridge.setMessageBox(msgBox as never);

    bridge.executeCommand("badcmd");

    expect(msgBox.setResult).toHaveBeenCalledWith("error: Unknown command");
  });
});

// ---------------------------------------------------------------------------
// WildCardApp
// ---------------------------------------------------------------------------

describe("WildCardApp", () => {
  let engine: IWildCardEngine;
  let bridge: EngineBridge;
  let app: WildCardApp;
  let renderer: ReturnType<typeof createMockRenderer>;

  const testStack = {
    version: "1.0" as const,
    name: "Test Stack",
    id: "stack_1",
    width: 512,
    height: 342,
    cards: [
      {
        id: "card_1",
        name: "Card 1",
        backgroundId: "bg_1",
        objects: [
          {
            type: "button" as const,
            id: "btn_1",
            name: "Go Next",
            rect: { x: 100, y: 100, width: 120, height: 30 },
            style: "roundRect" as const,
            script: "",
            visible: true,
            enabled: true,
            hilite: false,
            color: null,
          },
        ],
        script: "",
        paintData: null,
      },
      {
        id: "card_2",
        name: "Card 2",
        backgroundId: "bg_1",
        objects: [],
        script: "",
        paintData: null,
      },
      {
        id: "card_3",
        name: "Card 3",
        backgroundId: "bg_1",
        objects: [],
        script: "",
        paintData: null,
      },
    ],
    backgrounds: [
      {
        id: "bg_1",
        name: "",
        objects: [],
        script: "",
        paintData: null,
      },
    ],
    script: "",
    createdAt: "2026-01-01",
    modifiedAt: "2026-01-01",
  };

  beforeEach(() => {
    engine = createMockEngine();
    bridge = new EngineBridge(engine);
    app = new WildCardApp(bridge);
    renderer = createMockRenderer();
    app.setRenderer(renderer as unknown as import("../render-loop").RenderLoop);
  });

  it("starts with no stack", () => {
    expect(app.stack).toBeNull();
    expect(app.getCurrentCard()).toBeNull();
  });

  it("loads a stack from JSON", () => {
    const result = app.loadStack(JSON.stringify(testStack));
    expect(result).toBe(true);
    expect(app.stack).not.toBeNull();
    expect(app.stack!.name).toBe("Test Stack");
    expect(app.currentCardIndex).toBe(0);
  });

  it("displays the first card after loading", () => {
    app.loadStack(JSON.stringify(testStack));
    expect(renderer.setState).toHaveBeenCalled();
    // Check objects were set (card 1 has a button)
    const setCalls = renderer.setState.mock.calls;
    const lastWithObjects = setCalls.filter(
      (c: Array<Record<string, unknown>>) => c[0].objects !== undefined,
    );
    expect(lastWithObjects.length).toBeGreaterThan(0);
  });

  it("returns false for invalid JSON", () => {
    const result = app.loadStack("not json");
    expect(result).toBe(false);
  });

  it("returns false if engine rejects the stack", () => {
    (engine.load_stack as ReturnType<typeof vi.fn>).mockReturnValue(
      "error: Invalid JSON: expected value",
    );
    const result = app.loadStack(JSON.stringify(testStack));
    expect(result).toBe(false);
  });

  it("creates a new empty stack", () => {
    app.newStack("My Stack");
    expect(app.stack).not.toBeNull();
    expect(app.stack!.name).toBe("My Stack");
    expect(app.stack!.cards.length).toBe(1);
  });

  it("gets the current card", () => {
    app.loadStack(JSON.stringify(testStack));
    const card = app.getCurrentCard();
    expect(card).not.toBeNull();
    expect(card!.id).toBe("card_1");
  });

  describe("card navigation", () => {
    beforeEach(() => {
      app.loadStack(JSON.stringify(testStack));
    });

    it("navigates to card by index", () => {
      const result = app.goToCard(1);
      expect(result).toBe(true);
      expect(app.currentCardIndex).toBe(1);
      expect(app.getCurrentCard()!.id).toBe("card_2");
    });

    it("navigates to card by id", () => {
      const result = app.goToCard("card_3");
      expect(result).toBe(true);
      expect(app.currentCardIndex).toBe(2);
    });

    it("navigates to card by name", () => {
      const result = app.goToCard("Card 2");
      expect(result).toBe(true);
      expect(app.currentCardIndex).toBe(1);
    });

    it("returns false for invalid index", () => {
      expect(app.goToCard(99)).toBe(false);
      expect(app.goToCard(-1)).toBe(false);
    });

    it("returns false for unknown card id", () => {
      expect(app.goToCard("nonexistent")).toBe(false);
    });

    it("sends closeCard and openCard messages on navigation", () => {
      app.goToCard(1);
      expect(engine.send_message).toHaveBeenCalledWith("closeCard");
      expect(engine.send_message).toHaveBeenCalledWith("openCard");
    });

    it("resolves GoToCard with direction 'next'", () => {
      const result = app.resolveGoToCard({ cardId: "", direction: "next" });
      expect(result).toBe(true);
      expect(app.currentCardIndex).toBe(1);
    });

    it("resolves GoToCard with direction 'prev'", () => {
      app.goToCard(2); // go to card 3 first
      const result = app.resolveGoToCard({ cardId: "", direction: "prev" });
      expect(result).toBe(true);
      expect(app.currentCardIndex).toBe(1);
    });

    it("resolves GoToCard with direction 'first'", () => {
      app.goToCard(2);
      const result = app.resolveGoToCard({ cardId: "", direction: "first" });
      expect(result).toBe(true);
      expect(app.currentCardIndex).toBe(0);
    });

    it("resolves GoToCard with direction 'last'", () => {
      const result = app.resolveGoToCard({ cardId: "", direction: "last" });
      expect(result).toBe(true);
      expect(app.currentCardIndex).toBe(2);
    });

    it("resolves GoToCard with direction 'direct' by card id", () => {
      const result = app.resolveGoToCard({
        cardId: "card_2",
        direction: "direct",
      });
      expect(result).toBe(true);
      expect(app.currentCardIndex).toBe(1);
    });

    it("clamps 'next' at the last card", () => {
      app.goToCard(2); // already at last
      app.resolveGoToCard({ cardId: "", direction: "next" });
      expect(app.currentCardIndex).toBe(2); // stays at last
    });

    it("clamps 'prev' at the first card", () => {
      app.resolveGoToCard({ cardId: "", direction: "prev" });
      expect(app.currentCardIndex).toBe(0); // stays at first
    });
  });

  describe("sendMessage integration", () => {
    beforeEach(() => {
      app.loadStack(JSON.stringify(testStack));
    });

    it("auto-resolves GoToCard events from engine", () => {
      const goJson = JSON.stringify([{ GoToCard: { direction: "next", card_name: null } }]);
      (engine.send_message as ReturnType<typeof vi.fn>).mockReturnValue(goJson);

      // Need to register card change handler
      bridge.onCardChange(() => {});

      app.sendMessage("mouseUp");

      expect(app.currentCardIndex).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// createWildCardApp factory
// ---------------------------------------------------------------------------

describe("createWildCardApp", () => {
  it("creates an app with a mock engine factory", async () => {
    const engine = createMockEngine();
    const renderer = createMockRenderer();

    const app = await createWildCardApp({
      renderer: renderer as unknown as import("../render-loop").RenderLoop,
      engineFactory: async () => engine,
    });

    expect(app).toBeInstanceOf(WildCardApp);
    expect(app.engine).toBe(engine);
  });

  it("attaches message box if provided", async () => {
    const engine = createMockEngine();
    const renderer = createMockRenderer();
    const msgBox = createMockMessageBox();

    const app = await createWildCardApp({
      renderer: renderer as unknown as import("../render-loop").RenderLoop,
      engineFactory: async () => engine,
      messageBox: msgBox as never,
    });

    // Verify message box is wired
    expect(msgBox.onExecute).toBeTypeOf("function");
    expect(app).toBeTruthy();
  });
});
