import { describe, it, expect, beforeEach, vi } from "vitest";

// Polyfill ImageData for Node/Vitest (not available outside browser)
if (typeof globalThis.ImageData === "undefined") {
  (globalThis as any).ImageData = class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  };
}
import type { Tool, ToolEvent, PaintConfig } from "../tools/tool";
import { TOOL_ORDER, TOOL_DISPLAY_NAMES, defaultPaintConfig } from "../tools/tool";
import { BrowseTool } from "../tools/browse";
import { ButtonTool } from "../tools/button-tool";
import { FieldTool } from "../tools/field-tool";
import { SelectTool } from "../tools/select";
import { LassoTool } from "../tools/lasso";
import { PencilTool } from "../tools/pencil";
import { BrushTool } from "../tools/brush";
import { EraserTool } from "../tools/eraser";
import { LineTool } from "../tools/line";
import { SprayTool } from "../tools/spray";
import { RectTool } from "../tools/rect";
import { RoundRectTool } from "../tools/round-rect";
import { BucketTool } from "../tools/bucket";
import { OvalTool } from "../tools/oval";
import { CurveTool } from "../tools/curve";
import { RegularPolygonTool } from "../tools/regular-polygon";
import { TextTool } from "../tools/text";
import { ToolPalette } from "../components/palette";
import { classicTheme } from "../themes/classic";
import { CardCanvas } from "../components/card";

describe("Tool interface", () => {
  it("has all 17 tools in TOOL_ORDER", () => {
    expect(TOOL_ORDER.length).toBe(17);
  });

  it("has display names for all tools", () => {
    for (const tool of TOOL_ORDER) {
      expect(TOOL_DISPLAY_NAMES[tool]).toBeDefined();
    }
  });

  it("default paint config is valid", () => {
    const config = defaultPaintConfig();
    expect(config.patternIndex).toBe(1);
    expect(config.lineSize).toBe(1);
    expect(config.foregroundColor).toBe("#000000");
  });
});

describe("All 17 tools implement Tool interface", () => {
  const allTools: Tool[] = [
    new BrowseTool(),
    new ButtonTool(),
    new FieldTool(),
    new SelectTool(),
    new LassoTool(),
    new PencilTool(),
    new BrushTool(),
    new EraserTool(),
    new LineTool(),
    new SprayTool(),
    new RectTool(),
    new RoundRectTool(),
    new BucketTool(),
    new OvalTool(),
    new CurveTool(),
    new RegularPolygonTool(),
    new TextTool(),
  ];

  for (const tool of allTools) {
    it(`${tool.displayName} has required properties`, () => {
      expect(tool.name).toBeDefined();
      expect(tool.displayName).toBeDefined();
      expect(tool.category).toBeDefined();
      expect(tool.cursor).toBeDefined();
    });

    it(`${tool.displayName} has required methods`, () => {
      expect(typeof tool.activate).toBe("function");
      expect(typeof tool.deactivate).toBe("function");
      expect(typeof tool.onMouseDown).toBe("function");
      expect(typeof tool.onMouseMove).toBe("function");
      expect(typeof tool.onMouseUp).toBe("function");
    });
  }
});

describe("BrowseTool", () => {
  let browse: BrowseTool;
  let canvas: CardCanvas;

  beforeEach(() => {
    browse = new BrowseTool();
    canvas = new CardCanvas(classicTheme);
    browse.activate(canvas, classicTheme, defaultPaintConfig());
  });

  it("has browse cursor (pointer hand)", () => {
    expect(browse.cursor).toBe("pointer");
  });

  it("category is browse", () => {
    expect(browse.category).toBe("browse");
  });

  it("tracks clicked object ID", () => {
    browse.onMouseDown({ x: 100, y: 100, shiftKey: false, optionKey: false, commandKey: false, button: 0 });
    browse.onMouseUp({ x: 100, y: 100, shiftKey: false, optionKey: false, commandKey: false, button: 0 });
    // Browse tool emits events — we test the state machine transitions
    expect(browse.isMouseDown).toBe(false);
  });
});

describe("PencilTool", () => {
  let pencil: PencilTool;
  let canvas: CardCanvas;

  beforeEach(() => {
    pencil = new PencilTool();
    canvas = new CardCanvas(classicTheme);
    pencil.activate(canvas, classicTheme, defaultPaintConfig());
  });

  it("has crosshair cursor", () => {
    expect(pencil.cursor).toBe("crosshair");
  });

  it("category is paint", () => {
    expect(pencil.category).toBe("paint");
  });

  it("tracks drawing state", () => {
    expect(pencil.isDrawing).toBe(false);
    pencil.onMouseDown({ x: 10, y: 10, shiftKey: false, optionKey: false, commandKey: false, button: 0 });
    expect(pencil.isDrawing).toBe(true);
    pencil.onMouseUp({ x: 20, y: 20, shiftKey: false, optionKey: false, commandKey: false, button: 0 });
    expect(pencil.isDrawing).toBe(false);
  });
});

describe("LineTool", () => {
  let line: LineTool;
  let canvas: CardCanvas;

  beforeEach(() => {
    line = new LineTool();
    canvas = new CardCanvas(classicTheme);
    line.activate(canvas, classicTheme, defaultPaintConfig());
  });

  it("constrains to 45-degree angles with shift key", () => {
    line.onMouseDown({ x: 10, y: 10, shiftKey: false, optionKey: false, commandKey: false, button: 0 });
    const constrained = line.constrainEndPoint(
      { x: 50, y: 15, shiftKey: true, optionKey: false, commandKey: false, button: 0 },
    );
    // Should snap to horizontal (y should equal start y)
    expect(constrained.y).toBe(10);
  });

  it("has overlay showing line preview", () => {
    line.onMouseDown({ x: 10, y: 10, shiftKey: false, optionKey: false, commandKey: false, button: 0 });
    line.onMouseMove({ x: 50, y: 50, shiftKey: false, optionKey: false, commandKey: false, button: 0 });
    const overlay = line.getOverlay();
    expect(overlay).not.toBeNull();
    expect(overlay!.type).toBe("line");
  });
});

describe("RectTool", () => {
  it("has crosshair cursor", () => {
    const rect = new RectTool();
    expect(rect.cursor).toBe("crosshair");
  });

  it("category is shape", () => {
    const rect = new RectTool();
    expect(rect.category).toBe("shape");
  });
});

describe("ToolPalette", () => {
  let palette: ToolPalette;

  beforeEach(() => {
    palette = new ToolPalette(classicTheme);
  });

  it("has all 17 tools", () => {
    expect(palette.tools.length).toBe(17);
  });

  it("starts with browse tool selected", () => {
    expect(palette.selectedTool).toBe("browse");
  });

  it("can select a different tool", () => {
    palette.selectTool("pencil");
    expect(palette.selectedTool).toBe("pencil");
  });

  it("is a floating 2-column grid", () => {
    expect(palette.columns).toBe(2);
  });

  it("computes palette dimensions", () => {
    const rect = palette.getRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });

  it("hit-tests tool icons", () => {
    const rect = palette.getRect();
    const toolSize = classicTheme.metrics.toolIconSize;
    // Click first tool (top-left of palette content area)
    // Content area starts at PALETTE_PADDING(4) + 1(border) = 5px from rect edge
    const hit = palette.hitTestTool(rect.x + 6, rect.y + classicTheme.metrics.titleBarHeight + 6);
    expect(hit).not.toBeNull();
  });
});
