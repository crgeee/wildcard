/**
 * Lasso tool — freeform selection for paint data.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

export class LassoTool implements Tool {
  readonly name = "lasso" as const;
  readonly displayName = "Lasso";
  readonly category: ToolCategory = "selection";
  readonly cursor = "crosshair";

  private _canvas: CardCanvas | null = null;
  private _points: Array<{ x: number; y: number }> = [];
  private _isDragging = false;

  activate(canvas: CardCanvas, _theme: Theme, _config: PaintConfig): void {
    this._canvas = canvas;
  }

  deactivate(): void {
    this._canvas = null;
    this._isDragging = false;
    this._points = [];
  }

  get selectionPoints(): ReadonlyArray<{ x: number; y: number }> {
    return this._points;
  }

  onMouseDown(event: ToolEvent): void {
    this._isDragging = true;
    this._points = [{ x: event.x, y: event.y }];
  }

  onMouseMove(event: ToolEvent): void {
    if (!this._isDragging) return;
    this._points.push({ x: event.x, y: event.y });
  }

  onMouseUp(_event: ToolEvent): void {
    this._isDragging = false;
    // Close the lasso path
    if (this._points.length > 2) {
      this._points.push({ ...this._points[0] });
    }
  }

  getOverlay(): ToolOverlay | null {
    if (this._points.length < 2) return null;
    return {
      type: "lasso",
      points: [...this._points],
      marchingAnts: true,
    };
  }
}
