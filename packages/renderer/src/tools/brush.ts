/**
 * Brush tool — draws with variable brush shapes and sizes.
 *
 * HyperCard had multiple round and square brush shapes.
 * Draws with the current fill pattern.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

/** Predefined brush shapes: arrays of [dx, dy] offsets from center */
const BRUSH_SHAPES: Array<Array<[number, number]>> = [
  // 0: 1x1
  [[0, 0]],
  // 1: 3x3 round
  [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]],
  // 2: 5x5 round
  [
    [-1, -2], [0, -2], [1, -2],
    [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1],
    [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
    [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1],
    [-1, 2], [0, 2], [1, 2],
  ],
  // 3: 3x3 square
  [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [0, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ],
  // 4: 5x5 square
  (() => {
    const pts: Array<[number, number]> = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        pts.push([dx, dy]);
      }
    }
    return pts;
  })(),
  // 5: 8x8 round
  (() => {
    const pts: Array<[number, number]> = [];
    for (let dy = -4; dy <= 3; dy++) {
      for (let dx = -4; dx <= 3; dx++) {
        if (dx * dx + dy * dy <= 16) {
          pts.push([dx, dy]);
        }
      }
    }
    return pts;
  })(),
];

export class BrushTool implements Tool {
  readonly name = "brush" as const;
  readonly displayName = "Brush";
  readonly category: ToolCategory = "paint";
  readonly cursor = "crosshair";

  private _canvas: CardCanvas | null = null;
  private _config: PaintConfig | null = null;
  private _isDrawing = false;
  private _lastX = 0;
  private _lastY = 0;

  activate(canvas: CardCanvas, _theme: Theme, config: PaintConfig): void {
    this._canvas = canvas;
    this._config = config;
  }

  deactivate(): void {
    this._canvas = null;
    this._config = null;
    this._isDrawing = false;
  }

  onMouseDown(event: ToolEvent): void {
    this._isDrawing = true;
    this._lastX = event.x;
    this._lastY = event.y;
    this._stamp(event.x, event.y);
  }

  onMouseMove(event: ToolEvent): void {
    if (!this._isDrawing) return;
    // Interpolate between last and current position
    this._interpolate(this._lastX, this._lastY, event.x, event.y);
    this._lastX = event.x;
    this._lastY = event.y;
  }

  onMouseUp(_event: ToolEvent): void {
    this._isDrawing = false;
  }

  getOverlay(): ToolOverlay | null {
    return null;
  }

  private _stamp(x: number, y: number): void {
    if (!this._canvas || !this._config) return;
    const shapeIdx = Math.min(this._config.brushShape, BRUSH_SHAPES.length - 1);
    const shape = BRUSH_SHAPES[shapeIdx];
    for (const [dx, dy] of shape) {
      this._canvas.setPixel(x + dx, y + dy, 0, 0, 0, 255);
    }
  }

  private _interpolate(x0: number, y0: number, x1: number, y1: number): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const steps = Math.max(dx, dy);
    if (steps === 0) return;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      this._stamp(x, y);
    }
  }
}
