/**
 * Eraser tool — erases paint data (sets pixels to white/background).
 *
 * Fixed-size eraser block. In classic mode, erases to white.
 * Double-click the eraser in the palette to erase all paint data.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

const ERASER_SIZE = 16;

export class EraserTool implements Tool {
  readonly name = "eraser" as const;
  readonly displayName = "Eraser";
  readonly category: ToolCategory = "paint";
  readonly cursor = "crosshair";

  private _canvas: CardCanvas | null = null;
  private _config: PaintConfig | null = null;
  private _isDrawing = false;
  private _lastX = 0;
  private _lastY = 0;

  /** Callback for double-click (erase all) */
  onEraseAll: (() => void) | null = null;

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
    this._erase(event.x, event.y);
  }

  onMouseMove(event: ToolEvent): void {
    if (!this._isDrawing) return;
    this._interpolate(this._lastX, this._lastY, event.x, event.y);
    this._lastX = event.x;
    this._lastY = event.y;
  }

  onMouseUp(_event: ToolEvent): void {
    this._isDrawing = false;
  }

  onDoubleClick(_event: ToolEvent): void {
    if (this.onEraseAll) {
      this.onEraseAll();
    }
  }

  getOverlay(): ToolOverlay | null {
    return null;
  }

  private _erase(x: number, y: number): void {
    if (!this._canvas) return;
    const half = Math.floor(ERASER_SIZE / 2);
    for (let dy = -half; dy < half; dy++) {
      for (let dx = -half; dx < half; dx++) {
        this._canvas.setPixel(x + dx, y + dy, 255, 255, 255, 255);
      }
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
      this._erase(x, y);
    }
  }
}
