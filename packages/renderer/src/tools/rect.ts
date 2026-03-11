/**
 * Rectangle tool — draws rectangles on the paint layer.
 *
 * Shift constrains to square. Can be filled or outline only.
 * Supports drawCentered (from center) and drawMultiple modes.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

export class RectTool implements Tool {
  readonly name = "rect" as const;
  readonly displayName = "Rectangle";
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
    if (event.shiftKey) {
      this._constrainToSquare();
    }
  }

  onMouseUp(event: ToolEvent): void {
    if (!this._isDragging || !this._canvas || !this._config) return;
    this._isDragging = false;

    if (event.shiftKey) this._constrainToSquare();

    const x = Math.min(this._startX, this._endX);
    const y = Math.min(this._startY, this._endY);
    const w = Math.abs(this._endX - this._startX);
    const h = Math.abs(this._endY - this._startY);

    if (w < 2 || h < 2) return;

    const lineSize = this._config.lineSize;

    if (this._config.drawFilled) {
      this._fillRect(x, y, w, h);
    }
    this._strokeRect(x, y, w, h, lineSize);
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

  private _constrainToSquare(): void {
    const dx = this._endX - this._startX;
    const dy = this._endY - this._startY;
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    this._endX = this._startX + size * Math.sign(dx || 1);
    this._endY = this._startY + size * Math.sign(dy || 1);
  }

  private _strokeRect(x: number, y: number, w: number, h: number, lineSize: number): void {
    if (!this._canvas) return;
    // Top and bottom
    for (let py = 0; py < lineSize; py++) {
      for (let px = 0; px < w; px++) {
        this._canvas.setPixel(x + px, y + py, 0, 0, 0, 255);
        this._canvas.setPixel(x + px, y + h - 1 - py, 0, 0, 0, 255);
      }
    }
    // Left and right
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < lineSize; px++) {
        this._canvas.setPixel(x + px, y + py, 0, 0, 0, 255);
        this._canvas.setPixel(x + w - 1 - px, y + py, 0, 0, 0, 255);
      }
    }
  }

  private _fillRect(x: number, y: number, w: number, h: number): void {
    if (!this._canvas) return;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        this._canvas.setPixel(x + px, y + py, 0, 0, 0, 255);
      }
    }
  }
}
