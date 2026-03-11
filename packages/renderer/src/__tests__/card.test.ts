import { describe, it, expect } from "vitest";
import { CardCanvas } from "../components/card";
import { ButtonRenderer } from "../components/button";
import { FieldRenderer } from "../components/field";
import { classicTheme } from "../themes/classic";
import { v3Theme } from "../themes/v3";
import type { ButtonStyle, FieldStyle } from "@wildcard/types";
import { createButton, createField } from "@wildcard/types";

describe("CardCanvas", () => {
  it("has classic dimensions 512x342", () => {
    const card = new CardCanvas(classicTheme);
    expect(card.width).toBe(512);
    expect(card.height).toBe(342);
  });

  it("tracks dirty regions", () => {
    const card = new CardCanvas(classicTheme);
    expect(card.isDirty).toBe(true); // initially dirty
    card.clearDirty();
    expect(card.isDirty).toBe(false);
    card.markDirty({ x: 10, y: 10, width: 50, height: 50 });
    expect(card.isDirty).toBe(true);
  });

  it("hit-tests objects by position", () => {
    const card = new CardCanvas(classicTheme);
    const btn = createButton({ rect: { x: 100, y: 100, width: 120, height: 30 } });
    card.setObjects([btn]);
    const hit = card.hitTest(110, 110);
    expect(hit).not.toBeNull();
    expect(hit!.id).toBe(btn.id);
  });

  it("returns null for misses", () => {
    const card = new CardCanvas(classicTheme);
    const btn = createButton({ rect: { x: 100, y: 100, width: 120, height: 30 } });
    card.setObjects([btn]);
    const hit = card.hitTest(0, 0);
    expect(hit).toBeNull();
  });

  it("tests objects front-to-back", () => {
    const card = new CardCanvas(classicTheme);
    const btn1 = createButton({
      name: "back",
      rect: { x: 100, y: 100, width: 120, height: 30 },
    });
    const btn2 = createButton({
      name: "front",
      rect: { x: 110, y: 110, width: 120, height: 30 },
    });
    card.setObjects([btn1, btn2]);
    // Front object (later in array) should be hit first
    const hit = card.hitTest(115, 115);
    expect(hit!.name).toBe("front");
  });
});

describe("ButtonRenderer", () => {
  const renderer = new ButtonRenderer(classicTheme);

  it("computes render state for roundRect button", () => {
    const btn = createButton({ style: "roundRect", name: "OK" });
    const state = renderer.getRenderState(btn);
    expect(state.style).toBe("roundRect");
    expect(state.borderRadius).toBe(classicTheme.metrics.buttonBorderRadius);
    expect(state.label).toBe("OK");
  });

  it("computes render state for rectangle button", () => {
    const btn = createButton({ style: "rectangle", name: "Cancel" });
    const state = renderer.getRenderState(btn);
    expect(state.style).toBe("rectangle");
    expect(state.borderRadius).toBe(0);
  });

  it("inverts colors when hilited in classic mode", () => {
    const btn = createButton({ hilite: true });
    const state = renderer.getRenderState(btn);
    expect(state.fillColor).toBe(classicTheme.colors.buttonHilite);
    expect(state.textColor).toBe(classicTheme.colors.buttonHiliteText);
  });

  it("uses accent color when hilited in v3 mode", () => {
    const r = new ButtonRenderer(v3Theme);
    const btn = createButton({ hilite: true });
    const state = r.getRenderState(btn);
    expect(state.fillColor).toBe(v3Theme.colors.buttonHilite);
  });

  it("handles all 6 button styles", () => {
    const styles: ButtonStyle[] = [
      "rectangle",
      "roundRect",
      "checkbox",
      "radioButton",
      "transparent",
      "shadow",
    ];
    for (const style of styles) {
      const btn = createButton({ style });
      const state = renderer.getRenderState(btn);
      expect(state.style).toBe(style);
    }
  });

  it("checkbox has check indicator when hilited", () => {
    const btn = createButton({ style: "checkbox", hilite: true });
    const state = renderer.getRenderState(btn);
    expect(state.checked).toBe(true);
  });

  it("radioButton has filled circle when hilited", () => {
    const btn = createButton({ style: "radioButton", hilite: true });
    const state = renderer.getRenderState(btn);
    expect(state.checked).toBe(true);
  });
});

describe("FieldRenderer", () => {
  const renderer = new FieldRenderer(classicTheme);

  it("computes render state for rectangle field", () => {
    const field = createField({ style: "rectangle", content: "Hello" });
    const state = renderer.getRenderState(field);
    expect(state.style).toBe("rectangle");
    expect(state.lines).toEqual(["Hello"]);
  });

  it("wraps text into lines", () => {
    const field = createField({
      content: "This is a long text that should wrap to multiple lines",
      rect: { x: 0, y: 0, width: 100, height: 200 },
    });
    const state = renderer.getRenderState(field);
    expect(state.lines.length).toBeGreaterThan(1);
  });

  it("handles all 4 field styles", () => {
    const styles: FieldStyle[] = ["rectangle", "scrolling", "transparent", "shadow"];
    for (const style of styles) {
      const field = createField({ style });
      const state = renderer.getRenderState(field);
      expect(state.style).toBe(style);
    }
  });

  it("scrolling field has scroll indicators", () => {
    const field = createField({
      style: "scrolling",
      content: "Line1\nLine2\nLine3\nLine4\nLine5\nLine6\nLine7\nLine8\nLine9\nLine10",
      rect: { x: 0, y: 0, width: 200, height: 40 },
    });
    const state = renderer.getRenderState(field);
    expect(state.showScrollArrows).toBe(true);
  });

  it("field has inset border in classic mode", () => {
    const field = createField({ style: "rectangle" });
    const state = renderer.getRenderState(field);
    expect(state.borderColor).toBe(classicTheme.colors.fieldBorder);
  });

  it("invisible field returns hidden state", () => {
    const field = createField({ visible: false });
    const state = renderer.getRenderState(field);
    expect(state.visible).toBe(false);
  });
});
