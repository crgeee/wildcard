import { describe, it, expect } from "vitest";
import { classicTheme } from "../themes/classic";
import { v3Theme } from "../themes/v3";
import type { Theme } from "../theme";

describe("Theme system", () => {
  it("classic theme has B&W colors only", () => {
    expect(classicTheme.colors.background).toBe("#ffffff");
    expect(classicTheme.colors.foreground).toBe("#000000");
    expect(classicTheme.name).toBe("classic");
  });

  it("v3 theme has color support", () => {
    expect(v3Theme.colors.accent).toBeDefined();
    expect(v3Theme.name).toBe("v3");
  });

  it("both themes implement Theme interface", () => {
    const themes: Theme[] = [classicTheme, v3Theme];
    for (const theme of themes) {
      expect(theme.colors).toBeDefined();
      expect(theme.fonts).toBeDefined();
      expect(theme.metrics).toBeDefined();
    }
  });

  it("classic theme has System 7 metrics", () => {
    expect(classicTheme.metrics.menuBarHeight).toBe(20);
    expect(classicTheme.metrics.titleBarHeight).toBe(18);
    expect(classicTheme.metrics.borderWidth).toBe(1);
    expect(classicTheme.metrics.scrollbarWidth).toBe(15);
    expect(classicTheme.metrics.closeBoxSize).toBe(11);
  });

  it("classic theme uses Chicago-style bitmap font", () => {
    expect(classicTheme.fonts.system).toContain("Chicago");
    expect(classicTheme.fonts.systemSize).toBe(12);
    expect(classicTheme.fonts.monospace).toBeDefined();
  });

  it("v3 theme preserves same chrome metrics as classic", () => {
    expect(v3Theme.metrics.menuBarHeight).toBe(classicTheme.metrics.menuBarHeight);
    expect(v3Theme.metrics.titleBarHeight).toBe(classicTheme.metrics.titleBarHeight);
    expect(v3Theme.metrics.scrollbarWidth).toBe(classicTheme.metrics.scrollbarWidth);
  });

  it("classic theme has no accent color (B&W only)", () => {
    expect(classicTheme.colors.accent).toBeNull();
  });

  it("v3 theme has color accent", () => {
    expect(v3Theme.colors.accent).toBe("#0066cc");
  });

  it("themes define button rendering styles", () => {
    for (const theme of [classicTheme, v3Theme] as Theme[]) {
      expect(theme.metrics.buttonBorderRadius).toBeDefined();
      expect(theme.metrics.buttonPadding).toBeDefined();
    }
  });

  it("themes define card dimensions", () => {
    expect(classicTheme.metrics.cardWidth).toBe(512);
    expect(classicTheme.metrics.cardHeight).toBe(342);
  });

  it("classic theme has fill patterns", () => {
    expect(classicTheme.patterns).toBeDefined();
    expect(classicTheme.patterns!.length).toBeGreaterThanOrEqual(40);
  });

  it("themes define cursor types", () => {
    expect(classicTheme.cursors.browse).toBeDefined();
    expect(classicTheme.cursors.ibeam).toBeDefined();
    expect(classicTheme.cursors.crosshair).toBeDefined();
    expect(classicTheme.cursors.watch).toBeDefined();
  });
});
