/**
 * Text tool — places text on the paint layer.
 *
 * Click to set insertion point, type text. Text is rendered to the paint
 * layer when you click elsewhere or switch tools.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

export class TextTool implements Tool {
  readonly name = "text" as const;
  readonly displayName = "Text";
  readonly category: ToolCategory = "text";
  readonly cursor = "text";

  private _canvas: CardCanvas | null = null;
  private _theme: Theme | null = null;
  private _config: PaintConfig | null = null;
  private _isEditing = false;
  private _x = 0;
  private _y = 0;
  private _text = "";
  private _cursorPos = 0;

  /** Callback when text is committed to the paint layer */
  onCommitText: ((x: number, y: number, text: string) => void) | null = null;

  get isEditing(): boolean {
    return this._isEditing;
  }

  get text(): string {
    return this._text;
  }

  activate(canvas: CardCanvas, theme: Theme, config: PaintConfig): void {
    this._canvas = canvas;
    this._theme = theme;
    this._config = config;
  }

  deactivate(): void {
    if (this._isEditing) {
      this._commitText();
    }
    this._canvas = null;
    this._theme = null;
    this._config = null;
  }

  onMouseDown(event: ToolEvent): void {
    if (this._isEditing) {
      // Commit current text and start new insertion point
      this._commitText();
    }
    this._isEditing = true;
    this._x = event.x;
    this._y = event.y;
    this._text = "";
    this._cursorPos = 0;
  }

  onMouseMove(_event: ToolEvent): void {
    // No drag behavior
  }

  onMouseUp(_event: ToolEvent): void {
    // No-op
  }

  onKeyDown(key: string, _modifiers: string[]): void {
    if (!this._isEditing) return;

    if (key === "Backspace") {
      if (this._cursorPos > 0) {
        this._text = this._text.slice(0, this._cursorPos - 1) + this._text.slice(this._cursorPos);
        this._cursorPos--;
      }
    } else if (key === "Enter" || key === "Return") {
      this._commitText();
    } else if (key === "Escape") {
      this._text = "";
      this._isEditing = false;
    } else if (key === "ArrowLeft") {
      this._cursorPos = Math.max(0, this._cursorPos - 1);
    } else if (key === "ArrowRight") {
      this._cursorPos = Math.min(this._text.length, this._cursorPos + 1);
    } else if (key.length === 1) {
      // Printable character
      this._text = this._text.slice(0, this._cursorPos) + key + this._text.slice(this._cursorPos);
      this._cursorPos++;
    }
  }

  getOverlay(): ToolOverlay | null {
    if (!this._isEditing) return null;
    return {
      type: "text-cursor",
      points: [{ x: this._x, y: this._y }],
    };
  }

  private _commitText(): void {
    if (!this._text || !this._canvas) {
      this._isEditing = false;
      return;
    }

    if (this.onCommitText) {
      this.onCommitText(this._x, this._y, this._text);
    }

    this._isEditing = false;
    this._text = "";
    this._cursorPos = 0;
  }
}
