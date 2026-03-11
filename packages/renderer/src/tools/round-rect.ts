/**
 * Round Rectangle tool — draws rounded rectangles on the paint layer.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

const CORNER_RADIUS = 8;

export class RoundRectTool implements Tool {
  readonly name = "roundRect" as const;
  readonly displayName = "Round Rectangle";
  readonly category: ToolCategory = "shape";
  readonly cursor = "crosshair";

  private _canvas: CardCanvas | null = null;
  private _config: PaintConfig | null = null;
  private _startX = 0;
  private _startY = 0;
  private _endX = 0;
  private _endY = 0;
  private _isDragging = false;

  activate(canvas: CardCanvas, _theme: Theme, config: PaintConfig): void {
    this._canvas = canvas;
    this._config = config;
  }

  deactivate(): void {
    this._canvas = null;
    this._config = null;
    this._isDragging = false;
  }

  onMouseDown(event: ToolEvent): void {
    this._isDragging = true;
    this._startX = event.x;
    this._startY = event.y;
    this._endX = event.x;
    this._endY = event.y;
  }

  onMouseMove(event: ToolEvent): void {
    if (!this._isDragging) return;
    this._endX = event.x;
    this._endY = event.y;
  }

  onMouseUp(_event: ToolEvent): void {
    if (!this._isDragging || !this._canvas) return;
    this._isDragging = false;

    const x = Math.min(this._startX, this._endX);
    const y = Math.min(this._startY, this._endY);
    const w = Math.abs(this._endX - this._startX);
    const h = Math.abs(this._endY - this._startY);
    if (w < 2 || h < 2) return;

    this._drawRoundRect(x, y, w, h, CORNER_RADIUS);
  }

  getOverlay(): ToolOverlay | null {
    if (!this._isDragging) return null;
    return {
      type: "rect",
      points: [
        { x: this._startX, y: this._startY },
        { x: this._endX, y: this._endY },
      ],
      lineWidth: this._config?.lineSize ?? 1,
    };
  }

  private _drawRoundRect(x: number, y: number, w: number, h: number, r: number): void {
    if (!this._canvas) return;
    r = Math.min(r, Math.floor(w / 2), Math.floor(h / 2));

    // Top edge
    for (let px = r; px < w - r; px++) {
      this._canvas.setPixel(x + px, y, 0, 0, 0, 255);
      this._canvas.setPixel(x + px, y + h - 1, 0, 0, 0, 255);
    }
    // Left and right edges
    for (let py = r; py < h - r; py++) {
      this._canvas.setPixel(x, y + py, 0, 0, 0, 255);
      this._canvas.setPixel(x + w - 1, y + py, 0, 0, 0, 255);
    }
    // Corners using midpoint circle algorithm
    this._drawCorner(x + r, y + r, r, -1, -1);
    this._drawCorner(x + w - 1 - r, y + r, r, 1, -1);
    this._drawCorner(x + r, y + h - 1 - r, r, -1, 1);
    this._drawCorner(x + w - 1 - r, y + h - 1 - r, r, 1, 1);

    if (this._config?.drawFilled) {
      for (let py = 1; py < h - 1; py++) {
        for (let px = 1; px < w - 1; px++) {
          this._canvas.setPixel(x + px, y + py, 0, 0, 0, 255);
        }
      }
    }
  }

  /** Draw a quarter circle using midpoint circle algorithm */
  private _drawCorner(
    cx: number,
    cy: number,
    r: number,
    sx: number,
    sy: number,
  ): void {
    if (!this._canvas) return;
    let x = 0;
    let y = r;
    let d = 1 - r;

    while (x <= y) {
      this._canvas.setPixel(cx + x * sx, cy + y * sy, 0, 0, 0, 255);
      this._canvas.setPixel(cx + y * sx, cy + x * sy, 0, 0, 0, 255);
      if (d < 0) {
        d += 2 * x + 3;
      } else {
        d += 2 * (x - y) + 5;
        y--;
      }
      x++;
    }
  }
}
