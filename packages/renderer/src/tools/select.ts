/**
 * Select tool — rectangular selection for paint data.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

export class SelectTool implements Tool {
  readonly name = "select" as const;
  readonly displayName = "Select";
  readonly category: ToolCategory = "selection";
  readonly cursor = "crosshair";

  private _canvas: CardCanvas | null = null;
  private _startX = 0;
  private _startY = 0;
  private _endX = 0;
  private _endY = 0;
  private _isDragging = false;
  private _hasSelection = false;

  activate(canvas: CardCanvas, _theme: Theme, _config: PaintConfig): void {
    this._canvas = canvas;
  }

  deactivate(): void {
    this._canvas = null;
    this._isDragging = false;
    this._hasSelection = false;
  }

  get selectionRect(): { x: number; y: number; width: number; height: number } | null {
    if (!this._hasSelection) return null;
    return {
      x: Math.min(this._startX, this._endX),
      y: Math.min(this._startY, this._endY),
      width: Math.abs(this._endX - this._startX),
      height: Math.abs(this._endY - this._startY),
    };
  }

  onMouseDown(event: ToolEvent): void {
    this._isDragging = true;
    this._hasSelection = false;
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
    if (this._isDragging) {
      const w = Math.abs(this._endX - this._startX);
      const h = Math.abs(this._endY - this._startY);
      this._hasSelection = w > 2 && h > 2;
    }
    this._isDragging = false;
  }

  getOverlay(): ToolOverlay | null {
    if (!this._isDragging && !this._hasSelection) return null;
    return {
      type: "rect",
      points: [
        { x: this._startX, y: this._startY },
        { x: this._endX, y: this._endY },
      ],
      marchingAnts: true,
    };
  }
}
