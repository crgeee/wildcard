/**
 * Oval tool — draws ellipses on the paint layer.
 *
 * Shift constrains to circle. Can be filled or outline only.
 * Uses midpoint ellipse algorithm for pixel-perfect rendering.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

export class OvalTool implements Tool {
  readonly name = "oval" as const;
  readonly displayName = "Oval";
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
    if (event.shiftKey) this._constrainToCircle();
  }

  onMouseUp(event: ToolEvent): void {
    if (!this._isDragging || !this._canvas) return;
    this._isDragging = false;
    if (event.shiftKey) this._constrainToCircle();

    const x = Math.min(this._startX, this._endX);
    const y = Math.min(this._startY, this._endY);
    const w = Math.abs(this._endX - this._startX);
    const h = Math.abs(this._endY - this._startY);
    if (w < 2 || h < 2) return;

    this._drawEllipse(x, y, w, h);
  }

  getOverlay(): ToolOverlay | null {
    if (!this._isDragging) return null;
    return {
      type: "oval",
      points: [
        { x: this._startX, y: this._startY },
        { x: this._endX, y: this._endY },
      ],
      lineWidth: this._config?.lineSize ?? 1,
    };
  }

  private _constrainToCircle(): void {
    const dx = this._endX - this._startX;
    const dy = this._endY - this._startY;
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    this._endX = this._startX + size * Math.sign(dx || 1);
    this._endY = this._startY + size * Math.sign(dy || 1);
  }

  /** Midpoint ellipse algorithm */
  private _drawEllipse(x: number, y: number, w: number, h: number): void {
    if (!this._canvas) return;

    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);
    const rx = Math.floor(w / 2);
    const ry = Math.floor(h / 2);

    if (rx === 0 || ry === 0) return;

    let px = 0;
    let py = ry;
    let d1 = ry * ry - rx * rx * ry + (rx * rx) / 4;
    let dx = 2 * ry * ry * px;
    let dy = 2 * rx * rx * py;

    // Region 1
    while (dx < dy) {
      this._plotEllipsePoints(cx, cy, px, py);
      if (d1 < 0) {
        px++;
        dx += 2 * ry * ry;
        d1 += dx + ry * ry;
      } else {
        px++;
        py--;
        dx += 2 * ry * ry;
        dy -= 2 * rx * rx;
        d1 += dx - dy + ry * ry;
      }
    }

    // Region 2
    let d2 = ry * ry * (px + 0.5) * (px + 0.5) + rx * rx * (py - 1) * (py - 1) - rx * rx * ry * ry;
    while (py >= 0) {
      this._plotEllipsePoints(cx, cy, px, py);
      if (d2 > 0) {
        py--;
        dy -= 2 * rx * rx;
        d2 += rx * rx - dy;
      } else {
        py--;
        px++;
        dx += 2 * ry * ry;
        dy -= 2 * rx * rx;
        d2 += dx - dy + rx * rx;
      }
    }

    if (this._config?.drawFilled) {
      this._fillEllipse(cx, cy, rx, ry);
    }
  }

  private _plotEllipsePoints(cx: number, cy: number, px: number, py: number): void {
    if (!this._canvas) return;
    this._canvas.setPixel(cx + px, cy + py, 0, 0, 0, 255);
    this._canvas.setPixel(cx - px, cy + py, 0, 0, 0, 255);
    this._canvas.setPixel(cx + px, cy - py, 0, 0, 0, 255);
    this._canvas.setPixel(cx - px, cy - py, 0, 0, 0, 255);
  }

  private _fillEllipse(cx: number, cy: number, rx: number, ry: number): void {
    if (!this._canvas) return;
    for (let py = -ry; py <= ry; py++) {
      const xLimit = Math.round(rx * Math.sqrt(1 - (py * py) / (ry * ry)));
      for (let px = -xLimit; px <= xLimit; px++) {
        this._canvas.setPixel(cx + px, cy + py, 0, 0, 0, 255);
      }
    }
  }
}
