/**
 * Line tool — draws straight lines.
 *
 * Hold Shift to constrain to 45-degree increments.
 * Line width from paint config.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

export class LineTool implements Tool {
  readonly name = "line" as const;
  readonly displayName = "Line";
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
    if (event.shiftKey) {
      const constrained = this.constrainEndPoint(event);
      this._endX = constrained.x;
      this._endY = constrained.y;
    } else {
      this._endX = event.x;
      this._endY = event.y;
    }
  }

  onMouseUp(event: ToolEvent): void {
    if (!this._isDragging || !this._canvas) return;
    this._isDragging = false;

    if (event.shiftKey) {
      const constrained = this.constrainEndPoint(event);
      this._endX = constrained.x;
      this._endY = constrained.y;
    }

    // Draw the final line to paint data
    const lineSize = this._config?.lineSize ?? 1;
    this._drawLine(this._startX, this._startY, this._endX, this._endY, lineSize);
  }

  /**
   * Constrain end point to 45-degree increments (0, 45, 90, 135, etc.)
   */
  constrainEndPoint(event: ToolEvent): { x: number; y: number } {
    const dx = event.x - this._startX;
    const dy = event.y - this._startY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Snap to nearest 45-degree increment
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);

    return {
      x: Math.round(this._startX + dist * Math.cos(snapped)),
      y: Math.round(this._startY + dist * Math.sin(snapped)),
    };
  }

  getOverlay(): ToolOverlay | null {
    if (!this._isDragging) return null;
    return {
      type: "line",
      points: [
        { x: this._startX, y: this._startY },
        { x: this._endX, y: this._endY },
      ],
      lineWidth: this._config?.lineSize ?? 1,
    };
  }

  private _drawLine(x0: number, y0: number, x1: number, y1: number, lineSize: number): void {
    if (!this._canvas) return;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let cx = x0;
    let cy = y0;
    const half = Math.floor(lineSize / 2);

    while (true) {
      // Draw a square of lineSize pixels centered on (cx, cy)
      for (let py = -half; py < lineSize - half; py++) {
        for (let px = -half; px < lineSize - half; px++) {
          this._canvas!.setPixel(cx + px, cy + py, 0, 0, 0, 255);
        }
      }

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
