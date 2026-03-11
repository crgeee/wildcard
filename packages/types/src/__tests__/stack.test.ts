import { describe, it, expect } from "vitest";
import { createStack, createCard, createButton, createField } from "../index";

describe("Stack format", () => {
  it("creates a default stack", () => {
    const stack = createStack("My Stack");
    expect(stack.name).toBe("My Stack");
    expect(stack.cards).toHaveLength(1);
    expect(stack.version).toBe("1.0");
  });

  it("creates a card with default background", () => {
    const card = createCard();
    expect(card.id).toBeDefined();
    expect(card.objects).toEqual([]);
    expect(card.backgroundId).toBeDefined();
  });

  it("creates a button with script", () => {
    const btn = createButton({
      name: "Go",
      script: "on mouseUp\n  go to next card\nend mouseUp",
    });
    expect(btn.type).toBe("button");
    expect(btn.name).toBe("Go");
    expect(btn.script).toContain("mouseUp");
  });

  it("creates a text field", () => {
    const field = createField({ name: "greeting", content: "Hello" });
    expect(field.type).toBe("field");
    expect(field.content).toBe("Hello");
  });
});
