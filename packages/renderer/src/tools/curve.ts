/**
 * Curve tool — draws freeform curves (splines).
 *
 * Click to add control points. Double-click or press Enter to finalize.
 * The curve is drawn as a series of Bezier segments through the control points.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

export class CurveTool implements Tool {
  readonly name = "curve" as const;
  readonly displayName = "Curve";
  readonly category: ToolCategory = "shape";
  readonly cursor = "crosshair";

  private _canvas: CardCanvas | null = null;
  private _config: PaintConfig | null = null;
  private _points: Array<{ x: number; y: number }> = [];
  private _isActive = false;
  private _currentX = 0;
  private _currentY = 0;

  activate(canvas: CardCanvas, _theme: Theme, config: PaintConfig): void {
    this._canvas = canvas;
    this._config = config;
    this._points = [];
    this._isActive = false;
  }

  deactivate(): void {
    if (this._points.length >= 2) {
      this._finalize();
    }
    this._canvas = null;
    this._config = null;
    this._points = [];
    this._isActive = false;
  }

  onMouseDown(event: ToolEvent): void {
    this._isActive = true;
    this._points.push({ x: event.x, y: event.y });
    this._currentX = event.x;
    this._currentY = event.y;
  }

  onMouseMove(event: ToolEvent): void {
    this._currentX = event.x;
    this._currentY = event.y;
  }

  onMouseUp(_event: ToolEvent): void {
    // Point already added on mouseDown
  }

  onDoubleClick(_event: ToolEvent): void {
    this._finalize();
  }

  onKeyDown(key: string, _modifiers: string[]): void {
    if (key === "Enter" || key === "Return") {
      this._finalize();
    }
    if (key === "Escape") {
      this._points = [];
      this._isActive = false;
    }
  }

  getOverlay(): ToolOverlay | null {
    if (!this._isActive || this._points.length === 0) return null;
    const points = [...this._points, { x: this._currentX, y: this._currentY }];
    return {
      type: "custom",
      points,
      lineWidth: this._config?.lineSize ?? 1,
    };
  }

  private _finalize(): void {
    if (!this._canvas || this._points.length < 2) {
      this._points = [];
      this._isActive = false;
      return;
    }

    const lineSize = this._config?.lineSize ?? 1;

    // Draw curve through all points using Catmull-Rom interpolation
    for (let i = 0; i < this._points.length - 1; i++) {
      const p0 = this._points[Math.max(0, i - 1)];
      const p1 = this._points[i];
      const p2 = this._points[i + 1];
      const p3 = this._points[Math.min(this._points.length - 1, i + 2)];

      this._drawCatmullRomSegment(p0, p1, p2, p3, lineSize);
    }

    this._points = [];
    this._isActive = false;
  }

  /** Draw a Catmull-Rom spline segment */
  private _drawCatmullRomSegment(
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    lineSize: number,
  ): void {
    if (!this._canvas) return;

    const steps = Math.max(
      20,
      Math.ceil(Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)),
    );
    const half = Math.floor(lineSize / 2);

    let lastX = p1.x;
    let lastY = p1.y;

    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;

      const x = Math.round(
        0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      );
      const y = Math.round(
        0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      );

      // Draw line segment with lineSize
      this._drawLineSegment(lastX, lastY, x, y, half, lineSize);
      lastX = x;
      lastY = y;
    }
  }

  private _drawLineSegment(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    half: number,
    lineSize: number,
  ): void {
    if (!this._canvas) return;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let cx = x0;
    let cy = y0;

    while (true) {
      for (let py = -half; py < lineSize - half; py++) {
        for (let px = -half; px < lineSize - half; px++) {
          this._canvas!.setPixel(cx + px, cy + py, 0, 0, 0, 255);
        }
      }
      if (cx === x1 && cy === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
    }
  }
}
