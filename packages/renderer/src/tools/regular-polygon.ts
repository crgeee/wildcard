/**
 * Regular Polygon tool — draws regular polygons (triangle, pentagon, hexagon, etc.)
 *
 * Number of sides configurable via paint config (default 5).
 * Drag from center to define radius. Shift constrains rotation.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

export class RegularPolygonTool implements Tool {
  readonly name = "regularPolygon" as const;
  readonly displayName = "Regular Polygon";
  readonly category: ToolCategory = "shape";
  readonly cursor = "crosshair";

  private _canvas: CardCanvas | null = null;
  private _config: PaintConfig | null = null;
  private _centerX = 0;
  private _centerY = 0;
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
    this._centerX = event.x;
    this._centerY = event.y;
    this._endX = event.x;
    this._endY = event.y;
  }

  onMouseMove(event: ToolEvent): void {
    if (!this._isDragging) return;
    this._endX = event.x;
    this._endY = event.y;
  }

  onMouseUp(_event: ToolEvent): void {
    if (!this._isDragging || !this._canvas || !this._config) return;
    this._isDragging = false;

    const dx = this._endX - this._centerX;
    const dy = this._endY - this._centerY;
    const radius = Math.sqrt(dx * dx + dy * dy);
    if (radius < 3) return;

    const sides = this._config.polygonSides;
    const lineSize = this._config.lineSize;
    const angle = Math.atan2(dy, dx);

    this._drawPolygon(this._centerX, this._centerY, radius, sides, angle, lineSize);
  }

  getOverlay(): ToolOverlay | null {
    if (!this._isDragging || !this._config) return null;

    const dx = this._endX - this._centerX;
    const dy = this._endY - this._centerY;
    const radius = Math.sqrt(dx * dx + dy * dy);
    const sides = this._config.polygonSides;
    const angle = Math.atan2(dy, dx);

    const points = this._getPolygonPoints(this._centerX, this._centerY, radius, sides, angle);
    return {
      type: "custom",
      points,
      lineWidth: this._config.lineSize,
    };
  }

  private _getPolygonPoints(
    cx: number,
    cy: number,
    radius: number,
    sides: number,
    startAngle: number,
  ): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= sides; i++) {
      const angle = startAngle + (i * 2 * Math.PI) / sides;
      points.push({
        x: Math.round(cx + radius * Math.cos(angle)),
        y: Math.round(cy + radius * Math.sin(angle)),
      });
    }
    return points;
  }

  private _drawPolygon(
    cx: number,
    cy: number,
    radius: number,
    sides: number,
    startAngle: number,
    lineSize: number,
  ): void {
    if (!this._canvas) return;

    const points = this._getPolygonPoints(cx, cy, radius, sides, startAngle);

    // Draw edges
    for (let i = 0; i < points.length - 1; i++) {
      this._drawLine(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, lineSize);
    }

    if (this._config?.drawFilled) {
      this._fillPolygon(points);
    }
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

  /** Simple scanline fill for convex polygon */
  private _fillPolygon(points: Array<{ x: number; y: number }>): void {
    if (!this._canvas || points.length < 3) return;

    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    for (let y = Math.round(minY); y <= Math.round(maxY); y++) {
      const intersections: number[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
          const x = p1.x + ((y - p1.y) / (p2.y - p1.y)) * (p2.x - p1.x);
          intersections.push(Math.round(x));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i < intersections.length - 1; i += 2) {
        for (let x = intersections[i]; x <= intersections[i + 1]; x++) {
          this._canvas.setPixel(x, y, 0, 0, 0, 255);
        }
      }
    }
  }
}
