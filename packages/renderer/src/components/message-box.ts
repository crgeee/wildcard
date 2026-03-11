/**
 * Message box component — single-line command input at bottom of screen.
 *
 * Visual fidelity:
 * - Appears at bottom of screen
 * - Single-line input
 * - Accepts any WildTalk command or expression
 * - Results appear in the box (e.g., type "the date" -> shows current date)
 * - Up/down arrows cycle command history
 * - Toggled with Cmd+M
 * - "Blind typing" at scripting level: typing goes to hidden Message Box
 */

import type { Theme } from "../theme";

export class MessageBox {
  private _theme: Theme;
  private _visible = false;
  private _text = "";
  private _result = "";
  private _history: string[] = [];
  private _historyIndex = -1;
  private _cursorPos = 0;

  /** Callback when user presses Enter to execute a command */
  onExecute: ((command: string) => void) | null = null;

  constructor(theme: Theme) {
    this._theme = theme;
  }

  get isVisible(): boolean {
    return this._visible;
  }

  get text(): string {
    return this._text;
  }

  get result(): string {
    return this._result;
  }

  get history(): readonly string[] {
    return this._history;
  }

  get height(): number {
    return this._theme.metrics.messageBoxHeight;
  }

  get cursorPos(): number {
    return this._cursorPos;
  }

  setTheme(theme: Theme): void {
    this._theme = theme;
  }

  show(): void {
    this._visible = true;
  }

  hide(): void {
    this._visible = false;
  }

  toggle(): void {
    this._visible = !this._visible;
  }

  setText(text: string): void {
    this._text = text;
    this._cursorPos = text.length;
  }

  setResult(result: string): void {
    this._result = result;
  }

  /** Execute the current text as a command */
  execute(command?: string): void {
    const cmd = command ?? this._text;
    if (!cmd.trim()) return;

    this._history.push(cmd);
    this._historyIndex = -1;

    if (this.onExecute) {
      this.onExecute(cmd);
    }

    this._text = "";
    this._cursorPos = 0;
  }

  /** Navigate to previous command in history */
  historyUp(): void {
    if (this._history.length === 0) return;

    if (this._historyIndex === -1) {
      this._historyIndex = this._history.length - 1;
    } else if (this._historyIndex > 0) {
      this._historyIndex--;
    }

    this._text = this._history[this._historyIndex];
    this._cursorPos = this._text.length;
  }

  /** Navigate to next command in history */
  historyDown(): void {
    if (this._historyIndex === -1) return;

    if (this._historyIndex < this._history.length - 1) {
      this._historyIndex++;
      this._text = this._history[this._historyIndex];
    } else {
      this._historyIndex = -1;
      this._text = "";
    }
    this._cursorPos = this._text.length;
  }

  /** Get the y position of the message box given the canvas height */
  getY(canvasHeight: number): number {
    return canvasHeight - this._theme.metrics.messageBoxHeight;
  }

  /** Handle a keydown event */
  handleKeyDown(key: string, modifiers: string[]): boolean {
    if (!this._visible) return false;

    if (key === "Enter" || key === "Return") {
      this.execute();
      return true;
    }

    if (key === "ArrowUp") {
      this.historyUp();
      return true;
    }

    if (key === "ArrowDown") {
      this.historyDown();
      return true;
    }

    if (key === "Backspace") {
      if (this._cursorPos > 0) {
        this._text = this._text.slice(0, this._cursorPos - 1) + this._text.slice(this._cursorPos);
        this._cursorPos--;
      }
      return true;
    }

    if (key === "ArrowLeft") {
      this._cursorPos = Math.max(0, this._cursorPos - 1);
      return true;
    }

    if (key === "ArrowRight") {
      this._cursorPos = Math.min(this._text.length, this._cursorPos + 1);
      return true;
    }

    if (key === "Escape") {
      this.hide();
      return true;
    }

    // Printable character
    if (key.length === 1 && !modifiers.includes("Meta") && !modifiers.includes("Control")) {
      this._text = this._text.slice(0, this._cursorPos) + key + this._text.slice(this._cursorPos);
      this._cursorPos++;
      return true;
    }

    return false;
  }
}

/**
 * Draw the message box to a canvas 2D context.
 */
export function drawMessageBox(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  msgBox: MessageBox,
  canvasHeight: number,
): void {
  if (!msgBox.isVisible) return;

  const y = msgBox.getY(canvasHeight);
  const h = msgBox.height;
  const w = ctx.canvas.width;

  // Background
  ctx.fillStyle = theme.colors.windowBackground;
  ctx.fillRect(0, y, w, h);

  // Top border
  ctx.fillStyle = theme.colors.foreground;
  ctx.fillRect(0, y, w, 1);

  // Input text
  ctx.font = `${theme.fonts.systemSize}px ${theme.fonts.system}`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.colors.foreground;

  const textY = y + h / 2;

  // If there's a result, show it on the right side
  if (msgBox.result) {
    const resultWidth = ctx.measureText(msgBox.result).width;
    ctx.fillStyle = theme.colors.disabled;
    ctx.fillText(msgBox.result, w - resultWidth - 8, textY);
  }

  // Input text with cursor
  ctx.fillStyle = theme.colors.foreground;
  ctx.fillText(msgBox.text, 8, textY);

  // Cursor (blinking would need animation state)
  const charWidth = ctx.measureText("M").width;
  const cursorX = 8 + msgBox.cursorPos * charWidth * 0.6; // approximate
  ctx.fillRect(cursorX, y + 4, 1, h - 8);
}
