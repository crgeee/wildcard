import { describe, it, expect } from "vitest";
import type { EngineEvent } from "../events";

describe("Engine events", () => {
  it("defines GoToCard event", () => {
    const event: EngineEvent = {
      type: "GoToCard",
      payload: { cardId: "card_1", direction: "next" },
    };
    expect(event.type).toBe("GoToCard");
  });

  it("defines SetField event", () => {
    const event: EngineEvent = {
      type: "SetField",
      payload: { fieldId: "field_1", content: "Hello" },
    };
    expect(event.type).toBe("SetField");
  });

  it("defines PlaySound event", () => {
    const event: EngineEvent = {
      type: "PlaySound",
      payload: { sound: "click.wav" },
    };
    expect(event.type).toBe("PlaySound");
  });

  it("defines ShowMessage event", () => {
    const event: EngineEvent = {
      type: "ShowMessage",
      payload: { message: "Hello!", style: "answer" },
    };
    expect(event.type).toBe("ShowMessage");
  });

  it("defines SetProperty event", () => {
    const event: EngineEvent = {
      type: "SetProperty",
      payload: { objectId: "btn_1", property: "color", value: "red" },
    };
    expect(event.type).toBe("SetProperty");
  });
});
