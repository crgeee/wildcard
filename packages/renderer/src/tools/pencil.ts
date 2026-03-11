/**
 * Pencil tool — draws 1px freehand lines.
 *
 * In classic mode, draws black pixels. Clicking an existing black pixel
 * switches to erasing (white) for the duration of the stroke — matching
 * the original HyperCard behavior.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

export class PencilTool implements Tool {
  readonly name = "pencil" as const;
  readonly displayName = "Pencil";
  readonly category: ToolCategory = "paint";
  readonly cursor = "crosshair";

  private _canvas: CardCanvas | null = null;
  private _config: PaintConfig | null = null;
  private _isDrawing = false;
  private _lastX = 0;
  private _lastY = 0;
  private _eraseMode = false;

  get isDrawing(): boolean {
    return this._isDrawing;
  }

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
    if (!this._canvas) return;
    this._isDrawing = true;
    this._lastX = event.x;
    this._lastY = event.y;

    // HyperCard behavior: if clicking on an already-black pixel, erase instead
    const [r, g, b] = this._canvas.getPixel(event.x, event.y);
    this._eraseMode = r === 0 && g === 0 && b === 0;

    this._drawPixel(event.x, event.y);
  }

  onMouseMove(event: ToolEvent): void {
    if (!this._isDrawing || !this._canvas) return;

    // Bresenham's line algorithm for smooth 1px lines
    this._drawLine(this._lastX, this._lastY, event.x, event.y);
    this._lastX = event.x;
    this._lastY = event.y;
  }

  onMouseUp(_event: ToolEvent): void {
    this._isDrawing = false;
  }

  getOverlay(): ToolOverlay | null {
    return null;
  }

  private _drawPixel(x: number, y: number): void {
    if (!this._canvas) return;
    if (this._eraseMode) {
      this._canvas.setPixel(x, y, 255, 255, 255, 255);
    } else {
      this._canvas.setPixel(x, y, 0, 0, 0, 255);
    }
  }

  /** Bresenham's line algorithm */
  private _drawLine(x0: number, y0: number, x1: number, y1: number): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    while (true) {
      this._drawPixel(cx, cy);
      if (cx === x1 && cy === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }
}
