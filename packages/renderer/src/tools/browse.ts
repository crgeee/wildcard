/**
 * Browse tool — the hand cursor for interacting with stacks.
 *
 * In browse mode, clicking buttons triggers their scripts.
 * Clicking fields allows text entry (if not locked).
 * This tool sends input events to the engine for script execution.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";
import type { WildCardObject } from "@wildcard/types";

export class BrowseTool implements Tool {
  readonly name = "browse" as const;
  readonly displayName = "Browse";
  readonly category: ToolCategory = "browse";
  readonly cursor = "pointer";

  private _canvas: CardCanvas | null = null;
  private _theme: Theme | null = null;
  private _isMouseDown = false;
  private _clickedObject: WildCardObject | null = null;

  /** Callback when an object is clicked (for engine event dispatch) */
  onObjectClick: ((objectId: string, x: number, y: number) => void) | null = null;
  onObjectMouseDown: ((objectId: string, x: number, y: number) => void) | null = null;
  onObjectMouseUp: ((objectId: string | null, x: number, y: number) => void) | null = null;

  get isMouseDown(): boolean {
    return this._isMouseDown;
  }

  activate(canvas: CardCanvas, theme: Theme, _config: PaintConfig): void {
    this._canvas = canvas;
    this._theme = theme;
  }

  deactivate(): void {
    this._canvas = null;
    this._theme = null;
    this._isMouseDown = false;
    this._clickedObject = null;
  }

  onMouseDown(event: ToolEvent): void {
    this._isMouseDown = true;
    if (!this._canvas) return;

    const obj = this._canvas.hitTest(event.x, event.y);
    this._clickedObject = obj;

    if (obj && this.onObjectMouseDown) {
      this.onObjectMouseDown(obj.id, event.x, event.y);
    }
  }

  onMouseMove(_event: ToolEvent): void {
    // Browse tool: no drag behavior needed
  }

  onMouseUp(event: ToolEvent): void {
    this._isMouseDown = false;

    if (this.onObjectMouseUp) {
      const obj = this._canvas?.hitTest(event.x, event.y) ?? null;
      this.onObjectMouseUp(obj?.id ?? null, event.x, event.y);
    }

    this._clickedObject = null;
  }

  onDoubleClick(event: ToolEvent): void {
    // Double-clicking an object opens its script (at scripting level)
    if (!this._canvas) return;
    const obj = this._canvas.hitTest(event.x, event.y);
    if (obj && this.onObjectClick) {
      this.onObjectClick(obj.id, event.x, event.y);
    }
  }

  getOverlay(): ToolOverlay | null {
    return null;
  }
}
