/**
 * Script editor component — opens as a draggable window per object.
 *
 * Visual fidelity:
 * - Separate window per object with "Script of button 'X'" in title bar
 * - Monospace font (Monaco)
 * - Line numbers
 * - Basic syntax highlighting: keywords, strings, comments, handler names
 * - Scrollable with scroll arrows
 *
 * Renders within the canvas — not a DOM element.
 */

import type { Theme } from "../theme";
import type { Rect } from "@wildcard/types";

/** Token types for syntax highlighting */
export type TokenType = "keyword" | "handler" | "string" | "comment" | "number" | "operator" | "text";

export interface SyntaxToken {
  type: TokenType;
  text: string;
  start: number;
  end: number;
}

/** WildTalk keywords for highlighting */
const KEYWORDS = new Set([
  "on",
  "end",
  "if",
  "then",
  "else",
  "repeat",
  "with",
  "while",
  "until",
  "put",
  "into",
  "get",
  "set",
  "the",
  "of",
  "to",
  "go",
  "card",
  "next",
  "prev",
  "previous",
  "first",
  "last",
  "answer",
  "ask",
  "show",
  "hide",
  "wait",
  "play",
  "send",
  "do",
  "return",
  "pass",
  "global",
  "function",
  "not",
  "and",
  "or",
  "is",
  "true",
  "false",
  "empty",
  "field",
  "button",
  "stack",
  "background",
  "sort",
  "find",
  "select",
  "visual",
  "effect",
  "lock",
  "unlock",
  "screen",
  "add",
  "subtract",
  "multiply",
  "divide",
  "delete",
  "choose",
  "click",
  "drag",
  "type",
  "beep",
]);

/** Message handler names */
const HANDLERS = new Set([
  "mouseUp",
  "mouseDown",
  "mouseEnter",
  "mouseLeave",
  "mouseWithin",
  "mouseStillDown",
  "mouseDoubleClick",
  "openCard",
  "closeCard",
  "openStack",
  "closeStack",
  "openBackground",
  "closeBackground",
  "openField",
  "closeField",
  "enterInField",
  "returnInField",
  "tabKey",
  "enterKey",
  "returnKey",
  "arrowKey",
  "keyDown",
  "commandKeyDown",
  "functionKey",
  "idle",
  "startup",
  "newCard",
  "newButton",
  "newField",
  "newBackground",
  "deleteCard",
  "deleteButton",
  "deleteField",
  "deleteBackground",
  "exitField",
]);

const DEFAULT_WIDTH = 350;
const DEFAULT_HEIGHT = 250;
const LINE_NUMBER_WIDTH = 35;

export class ScriptEditor {
  private _theme: Theme;
  private _isOpen = false;
  private _title = "";
  private _content = "";
  private _lines: string[] = [];
  private _cursorLine = 0;
  private _cursorCol = 0;
  private _scrollOffset = 0;
  private _position: { x: number; y: number } = { x: 80, y: 40 };
  private _size: { width: number; height: number } = {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  };

  /** Callback when script content changes */
  onContentChange: ((content: string) => void) | null = null;
  /** Callback when the editor is closed (compile/save) */
  onClose: ((content: string) => void) | null = null;

  constructor(theme: Theme) {
    this._theme = theme;
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  get title(): string {
    return this._title;
  }

  get content(): string {
    return this._content;
  }

  get lines(): readonly string[] {
    return this._lines;
  }

  get lineCount(): number {
    return this._lines.length;
  }

  get cursorLine(): number {
    return this._cursorLine;
  }

  get cursorCol(): number {
    return this._cursorCol;
  }

  get font(): string {
    return `${this._theme.fonts.monospaceSize}px ${this._theme.fonts.monospace}`;
  }

  setTheme(theme: Theme): void {
    this._theme = theme;
  }

  open(title: string, content: string): void {
    this._isOpen = true;
    this._title = title;
    this._content = content;
    this._lines = content.split("\n");
    this._cursorLine = 0;
    this._cursorCol = 0;
    this._scrollOffset = 0;
  }

  close(): void {
    if (this.onClose) {
      this.onClose(this._content);
    }
    this._isOpen = false;
  }

  setCursor(line: number, col: number): void {
    this._cursorLine = Math.max(0, Math.min(line, this._lines.length - 1));
    this._cursorCol = Math.max(0, col);
  }

  setContent(content: string): void {
    this._content = content;
    this._lines = content.split("\n");
    if (this.onContentChange) {
      this.onContentChange(content);
    }
  }

  /** Get the window rect for rendering */
  getWindowRect(): Rect {
    return {
      x: this._position.x,
      y: this._position.y,
      width: this._size.width,
      height: this._size.height,
    };
  }

  setPosition(x: number, y: number): void {
    this._position = { x, y };
  }

  /**
   * Tokenize a single line for syntax highlighting.
   * Returns an array of tokens with type and position info.
   */
  tokenizeLine(lineIndex: number): SyntaxToken[] {
    if (lineIndex < 0 || lineIndex >= this._lines.length) return [];
    const line = this._lines[lineIndex];
    return tokenize(line);
  }

  /** Get visible lines based on scroll offset and window size */
  getVisibleLines(): { lineIndex: number; text: string }[] {
    const lineH = Math.floor(this._theme.fonts.monospaceSize * 1.5);
    const titleH = this._theme.metrics.titleBarHeight;
    const contentH = this._size.height - titleH - 8;
    const visibleCount = Math.floor(contentH / lineH);

    const result: { lineIndex: number; text: string }[] = [];
    for (let i = 0; i < visibleCount && i + this._scrollOffset < this._lines.length; i++) {
      result.push({
        lineIndex: i + this._scrollOffset,
        text: this._lines[i + this._scrollOffset],
      });
    }
    return result;
  }

  scrollUp(): void {
    this._scrollOffset = Math.max(0, this._scrollOffset - 1);
  }

  scrollDown(): void {
    this._scrollOffset = Math.min(this._lines.length - 1, this._scrollOffset + 1);
  }
}

/**
 * Tokenize a line of WildTalk for syntax highlighting.
 */
function tokenize(line: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let pos = 0;

  // Check for comment first
  const commentIdx = line.indexOf("--");
  const commentEnd = commentIdx >= 0 ? commentIdx : line.length;

  while (pos < commentEnd) {
    // Skip whitespace
    if (line[pos] === " " || line[pos] === "\t") {
      const start = pos;
      while (pos < commentEnd && (line[pos] === " " || line[pos] === "\t")) pos++;
      tokens.push({ type: "text", text: line.slice(start, pos), start, end: pos });
      continue;
    }

    // String literal
    if (line[pos] === '"') {
      const start = pos;
      pos++; // skip opening quote
      while (pos < line.length && line[pos] !== '"') pos++;
      if (pos < line.length) pos++; // skip closing quote
      tokens.push({ type: "string", text: line.slice(start, pos), start, end: pos });
      continue;
    }

    // Number
    if (/[0-9]/.test(line[pos])) {
      const start = pos;
      while (pos < commentEnd && /[0-9.]/.test(line[pos])) pos++;
      tokens.push({ type: "number", text: line.slice(start, pos), start, end: pos });
      continue;
    }

    // Operators
    if ("+-*/=<>&,()".includes(line[pos])) {
      tokens.push({ type: "operator", text: line[pos], start: pos, end: pos + 1 });
      pos++;
      continue;
    }

    // Word (identifier or keyword)
    if (/[a-zA-Z_]/.test(line[pos])) {
      const start = pos;
      while (pos < commentEnd && /[a-zA-Z0-9_]/.test(line[pos])) pos++;
      const word = line.slice(start, pos);

      if (KEYWORDS.has(word.toLowerCase())) {
        tokens.push({ type: "keyword", text: word, start, end: pos });
      } else if (HANDLERS.has(word)) {
        tokens.push({ type: "handler", text: word, start, end: pos });
      } else {
        tokens.push({ type: "text", text: word, start, end: pos });
      }
      continue;
    }

    // Other character
    tokens.push({ type: "text", text: line[pos], start: pos, end: pos + 1 });
    pos++;
  }

  // Comment
  if (commentIdx >= 0) {
    tokens.push({
      type: "comment",
      text: line.slice(commentIdx),
      start: commentIdx,
      end: line.length,
    });
  }

  return tokens;
}

/**
 * Draw the script editor to a canvas 2D context.
 */
export function drawScriptEditor(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  editor: ScriptEditor,
): void {
  if (!editor.isOpen) return;

  const rect = editor.getWindowRect();
  const titleH = theme.metrics.titleBarHeight;
  const lineH = Math.floor(theme.fonts.monospaceSize * 1.5);
  const lineNumWidth = 35;

  // Window shadow
  ctx.fillStyle = theme.colors.shadow;
  ctx.fillRect(rect.x + 2, rect.y + 2, rect.width, rect.height);

  // Window background
  ctx.fillStyle = theme.colors.windowBackground;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  // Window border
  ctx.strokeStyle = theme.colors.foreground;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);

  // Title bar
  ctx.fillStyle = theme.colors.foreground;
  ctx.fillRect(rect.x, rect.y + titleH - 1, rect.width, 1);
  ctx.font = `${theme.fonts.systemSize}px ${theme.fonts.system}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = theme.colors.foreground;
  ctx.fillText(editor.title, rect.x + rect.width / 2, rect.y + titleH / 2);
  ctx.textAlign = "left";

  // Content area
  const contentY = rect.y + titleH + 4;
  const visibleLines = editor.getVisibleLines();

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x + 1, contentY, rect.width - 2, rect.height - titleH - 5);
  ctx.clip();

  for (let i = 0; i < visibleLines.length; i++) {
    const { lineIndex, text } = visibleLines[i];
    const y = contentY + i * lineH;

    // Line number
    ctx.fillStyle = theme.colors.disabled;
    ctx.font = `${theme.fonts.monospaceSize}px ${theme.fonts.monospace}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "right";
    ctx.fillText(String(lineIndex + 1), rect.x + lineNumWidth - 4, y);
    ctx.textAlign = "left";

    // Line number separator
    ctx.fillStyle = theme.colors.disabled;
    ctx.fillRect(rect.x + lineNumWidth, contentY, 1, rect.height - titleH - 5);

    // Syntax-highlighted tokens
    const tokens = editor.tokenizeLine(lineIndex);
    let tokenX = rect.x + lineNumWidth + 4;

    for (const token of tokens) {
      ctx.font = `${theme.fonts.monospaceSize}px ${theme.fonts.monospace}`;

      switch (token.type) {
        case "keyword":
          ctx.fillStyle = theme.name === "classic" ? theme.colors.foreground : "#0000cc";
          ctx.font = `bold ${theme.fonts.monospaceSize}px ${theme.fonts.monospace}`;
          break;
        case "handler":
          ctx.fillStyle = theme.name === "classic" ? theme.colors.foreground : "#660099";
          break;
        case "string":
          ctx.fillStyle = theme.name === "classic" ? theme.colors.foreground : "#008800";
          break;
        case "comment":
          ctx.fillStyle = theme.colors.disabled;
          break;
        case "number":
          ctx.fillStyle = theme.name === "classic" ? theme.colors.foreground : "#cc6600";
          break;
        default:
          ctx.fillStyle = theme.colors.foreground;
          break;
      }

      ctx.fillText(token.text, tokenX, y);
      tokenX += ctx.measureText(token.text).width;
    }

    // Cursor
    if (lineIndex === editor.cursorLine) {
      const cursorX = rect.x + lineNumWidth + 4;
      const charWidth = ctx.measureText("M").width;
      const cx = cursorX + editor.cursorCol * charWidth;
      ctx.fillStyle = theme.colors.foreground;
      ctx.fillRect(cx, y, 1, lineH);
    }
  }

  ctx.restore();
}
