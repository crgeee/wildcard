/**
 * Field tool — for creating and selecting fields in authoring mode.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

export class FieldTool implements Tool {
  readonly name = "field" as const;
  readonly displayName = "Field";
  readonly category: ToolCategory = "authoring";
  readonly cursor = "crosshair";

  private _canvas: CardCanvas | null = null;
  private _startX = 0;
  private _startY = 0;
  private _endX = 0;
  private _endY = 0;
  private _isDragging = false;

  onCreateField: ((x: number, y: number, w: number, h: number) => void) | null = null;
  onSelectField: ((objectId: string) => void) | null = null;

  activate(canvas: CardCanvas, _theme: Theme, _config: PaintConfig): void {
    this._canvas = canvas;
  }

  deactivate(): void {
    this._canvas = null;
    this._isDragging = false;
  }

  onMouseDown(event: ToolEvent): void {
    if (!this._canvas) return;

    const obj = this._canvas.hitTest(event.x, event.y);
    if (obj && obj.type === "field" && this.onSelectField) {
      this.onSelectField(obj.id);
      return;
    }

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
    if (this._isDragging && this.onCreateField) {
      const x = Math.min(this._startX, this._endX);
      const y = Math.min(this._startY, this._endY);
      const w = Math.abs(this._endX - this._startX);
      const h = Math.abs(this._endY - this._startY);
      if (w > 4 && h > 4) {
        this.onCreateField(x, y, w, h);
      }
    }
    this._isDragging = false;
  }

  getOverlay(): ToolOverlay | null {
    if (!this._isDragging) return null;
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
