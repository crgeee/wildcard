import { describe, it, expect, beforeEach } from "vitest";
import { TouchHandler } from "../input/touch";
import { MouseHandler } from "../input/mouse";
import { KeyboardHandler } from "../input/keyboard";
import { ResponsiveLayout } from "../layout/responsive";
import { classicTheme } from "../themes/classic";

describe("MouseHandler", () => {
  let handler: MouseHandler;

  beforeEach(() => {
    handler = new MouseHandler();
  });

  it("tracks mouse state", () => {
    expect(handler.isDown).toBe(false);
    handler.handleMouseDown(100, 200, 0);
    expect(handler.isDown).toBe(true);
    expect(handler.x).toBe(100);
    expect(handler.y).toBe(200);
    handler.handleMouseUp(110, 210, 0);
    expect(handler.isDown).toBe(false);
  });

  it("fires callbacks on events", () => {
    let downFired = false;
    let upFired = false;
    handler.onMouseDown = () => {
      downFired = true;
    };
    handler.onMouseUp = () => {
      upFired = true;
    };
    handler.handleMouseDown(10, 10, 0);
    handler.handleMouseUp(10, 10, 0);
    expect(downFired).toBe(true);
    expect(upFired).toBe(true);
  });

  it("tracks drag state", () => {
    handler.handleMouseDown(10, 10, 0);
    handler.handleMouseMove(20, 20);
    expect(handler.isDragging).toBe(true);
  });

  it("detects double-click within time window", () => {
    let dblClickCount = 0;
    handler.onDoubleClick = () => {
      dblClickCount++;
    };
    handler.handleMouseDown(10, 10, 0);
    handler.handleMouseUp(10, 10, 0);
    handler.handleMouseDown(10, 10, 0); // second click within 400ms
    handler.handleMouseUp(10, 10, 0);
    expect(dblClickCount).toBe(1);
  });
});

describe("TouchHandler", () => {
  let handler: TouchHandler;

  beforeEach(() => {
    handler = new TouchHandler();
  });

  it("maps single touch to mouse events", () => {
    let downFired = false;
    handler.onMouseDown = () => {
      downFired = true;
    };
    handler.handleTouchStart([{ x: 100, y: 200, id: 0 }]);
    expect(downFired).toBe(true);
    expect(handler.lastX).toBe(100);
    expect(handler.lastY).toBe(200);
  });

  it("detects pinch-to-zoom", () => {
    handler.handleTouchStart([
      { x: 100, y: 100, id: 0 },
      { x: 200, y: 200, id: 1 },
    ]);
    expect(handler.isPinching).toBe(true);
  });

  it("computes pinch scale", () => {
    handler.handleTouchStart([
      { x: 100, y: 100, id: 0 },
      { x: 200, y: 200, id: 1 },
    ]);
    const initialDist = handler.pinchStartDistance;
    expect(initialDist).toBeGreaterThan(0);

    // Move fingers apart
    handler.handleTouchMove([
      { x: 50, y: 50, id: 0 },
      { x: 250, y: 250, id: 1 },
    ]);
    expect(handler.pinchScale).toBeGreaterThan(1);
  });

  it("maps touch end to mouse up", () => {
    let upFired = false;
    handler.onMouseUp = () => {
      upFired = true;
    };
    handler.handleTouchStart([{ x: 100, y: 200, id: 0 }]);
    handler.handleTouchEnd([]);
    expect(upFired).toBe(true);
  });
});

describe("KeyboardHandler", () => {
  let handler: KeyboardHandler;

  beforeEach(() => {
    handler = new KeyboardHandler();
  });

  it("tracks modifier keys", () => {
    handler.handleKeyDown("Shift", []);
    expect(handler.shiftKey).toBe(true);
    handler.handleKeyUp("Shift");
    expect(handler.shiftKey).toBe(false);
  });

  it("fires shortcut callbacks", () => {
    let shortcutFired = "";
    handler.registerShortcut("m", ["Meta"], () => {
      shortcutFired = "Cmd+M";
    });
    handler.handleKeyDown("m", ["Meta"]);
    expect(shortcutFired).toBe("Cmd+M");
  });

  it("tracks command key state", () => {
    handler.handleKeyDown("Meta", []);
    expect(handler.commandKey).toBe(true);
    handler.handleKeyUp("Meta");
    expect(handler.commandKey).toBe(false);
  });

  it("fires generic keydown callback", () => {
    let lastKey = "";
    handler.onKeyDown = (key) => {
      lastKey = key;
    };
    handler.handleKeyDown("a", []);
    expect(lastKey).toBe("a");
  });
});

describe("ResponsiveLayout", () => {
  let layout: ResponsiveLayout;

  beforeEach(() => {
    layout = new ResponsiveLayout(classicTheme);
  });

  it("computes scale for viewport", () => {
    const result = layout.computeLayout(1024, 768);
    expect(result.scale).toBeGreaterThan(1);
    expect(result.canvasWidth).toBe(512);
    expect(result.canvasHeight).toBeGreaterThan(342); // includes menu bar + message box
  });

  it("maintains logical resolution", () => {
    const result = layout.computeLayout(1024, 768);
    expect(result.canvasWidth).toBe(classicTheme.metrics.cardWidth);
  });

  it("scales with nearest-neighbor", () => {
    expect(layout.imageRendering).toBe("pixelated");
  });

  it("detects mobile viewport", () => {
    const result = layout.computeLayout(375, 667);
    expect(result.isMobile).toBe(true);
  });

  it("detects desktop viewport", () => {
    const result = layout.computeLayout(1920, 1080);
    expect(result.isMobile).toBe(false);
  });

  it("positions tool palette differently on mobile", () => {
    const mobile = layout.computeLayout(375, 667);
    expect(mobile.toolPaletteMode).toBe("drawer");

    const desktop = layout.computeLayout(1920, 1080);
    expect(desktop.toolPaletteMode).toBe("floating");
  });

  it("computes display dimensions", () => {
    const result = layout.computeLayout(1024, 768);
    expect(result.displayWidth).toBeGreaterThan(0);
    expect(result.displayHeight).toBeGreaterThan(0);
    expect(result.displayWidth).toBeLessThanOrEqual(1024);
    expect(result.displayHeight).toBeLessThanOrEqual(768);
  });
});
