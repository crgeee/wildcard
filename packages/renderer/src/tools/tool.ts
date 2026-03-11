/**
 * Tool interface — the extensible base for all WildCard tools.
 *
 * All 17 HyperCard tools implement this interface:
 * Browse, Button, Field, Select, Lasso, Pencil, Brush, Eraser,
 * Line, Spray, Rectangle, Round Rectangle, Bucket, Oval, Curve,
 * Regular Polygon, Text
 *
 * Extensions can implement this interface to add custom tools.
 *
 * Each tool handles mouse/touch events on the card canvas and may:
 * - Modify paint data (paint tools)
 * - Create/select objects (authoring tools)
 * - Send events to the engine (browse tool)
 * - Change cursor appearance
 */

import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

/** All 17 classic HyperCard tool names */
export type ToolName =
  | "browse"
  | "button"
  | "field"
  | "select"
  | "lasso"
  | "pencil"
  | "brush"
  | "eraser"
  | "line"
  | "spray"
  | "rect"
  | "roundRect"
  | "bucket"
  | "oval"
  | "curve"
  | "regularPolygon"
  | "text";

/** Tool category for palette grouping */
export type ToolCategory = "browse" | "authoring" | "selection" | "paint" | "shape" | "text";

/** Event data passed to tool handlers */
export interface ToolEvent {
  /** Logical x coordinate on the card canvas */
  x: number;
  /** Logical y coordinate on the card canvas */
  y: number;
  /** Whether shift key is held */
  shiftKey: boolean;
  /** Whether option/alt key is held */
  optionKey: boolean;
  /** Whether command/ctrl key is held */
  commandKey: boolean;
  /** Button index (0 = primary) */
  button: number;
}

/** Configuration for paint tools */
export interface PaintConfig {
  /** Current fill pattern index (0-39) */
  patternIndex: number;
  /** Current line size in pixels (1, 2, 3, 4, 6, 8) */
  lineSize: number;
  /** Current brush shape index */
  brushShape: number;
  /** Whether shapes are drawn filled */
  drawFilled: boolean;
  /** Whether shapes are drawn from center */
  drawCentered: boolean;
  /** Whether multiple mode is on (shapes keep drawing) */
  drawMultiple: boolean;
  /** Number of sides for regular polygon tool */
  polygonSides: number;
  /** Whether grid snap is enabled */
  gridSnap: boolean;
  /** Grid size for snapping */
  gridSize: number;
  /** Foreground color (black in classic) */
  foregroundColor: string;
  /** Background color (white in classic) */
  backgroundColor: string;
}

/** The Tool interface that all tools (including extensions) must implement */
export interface Tool {
  /** Unique tool identifier */
  readonly name: ToolName;
  /** Human-readable display name */
  readonly displayName: string;
  /** Tool category for palette grouping */
  readonly category: ToolCategory;
  /** CSS cursor to use when this tool is active */
  readonly cursor: string;

  /** Called when the tool becomes active */
  activate(canvas: CardCanvas, theme: Theme, config: PaintConfig): void;

  /** Called when the tool is deactivated */
  deactivate(): void;

  /** Called on mouse/touch down on the card canvas */
  onMouseDown(event: ToolEvent): void;

  /** Called on mouse/touch move while button is held */
  onMouseMove(event: ToolEvent): void;

  /** Called on mouse/touch up */
  onMouseUp(event: ToolEvent): void;

  /** Called on mouse/touch move without button (hover) */
  onMouseHover?(event: ToolEvent): void;

  /** Called on double-click */
  onDoubleClick?(event: ToolEvent): void;

  /** Called on keydown while tool is active */
  onKeyDown?(key: string, modifiers: string[]): void;

  /** Get tool-specific rendering overlay (e.g., selection marquee, line preview) */
  getOverlay?(): ToolOverlay | null;
}

/** Visual overlay that the tool wants drawn on top of the card */
export interface ToolOverlay {
  type: "rect" | "oval" | "line" | "lasso" | "text-cursor" | "custom";
  /** Points defining the overlay shape */
  points: Array<{ x: number; y: number }>;
  /** Whether to draw with marching ants (selection) */
  marchingAnts?: boolean;
  /** Line width for the overlay */
  lineWidth?: number;
}

/** Default paint configuration */
export function defaultPaintConfig(): PaintConfig {
  return {
    patternIndex: 1, // solid black
    lineSize: 1,
    brushShape: 0,
    drawFilled: false,
    drawCentered: false,
    drawMultiple: false,
    polygonSides: 5,
    gridSnap: false,
    gridSize: 8,
    foregroundColor: "#000000",
    backgroundColor: "#ffffff",
  };
}

/** All tools in palette order (matching classic HyperCard layout) */
export const TOOL_ORDER: ToolName[] = [
  "browse",
  "button",
  "field",
  "select",
  "lasso",
  "pencil",
  "brush",
  "eraser",
  "line",
  "spray",
  "rect",
  "roundRect",
  "bucket",
  "oval",
  "curve",
  "regularPolygon",
  "text",
];

/** Map of tool names to their display names */
export const TOOL_DISPLAY_NAMES: Record<ToolName, string> = {
  browse: "Browse",
  button: "Button",
  field: "Field",
  select: "Select",
  lasso: "Lasso",
  pencil: "Pencil",
  brush: "Brush",
  eraser: "Eraser",
  line: "Line",
  spray: "Spray",
  rect: "Rectangle",
  roundRect: "Round Rectangle",
  bucket: "Bucket",
  oval: "Oval",
  curve: "Curve",
  regularPolygon: "Regular Polygon",
  text: "Text",
};
