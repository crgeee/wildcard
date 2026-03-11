/**
 * Field renderer — renders all HyperCard field styles.
 *
 * Visual fidelity:
 * - 1px inset border (dark top/left, light bottom/right in classic)
 * - I-beam cursor when typing
 * - Scroll arrows (NOT scroll thumb) for scrolling fields
 * - Text wrapping within field rect
 * - Transparent fields have no border
 * - Shadow fields have a drop shadow
 *
 * In classic mode: black borders on white, 1-bit rendering.
 * In v3 mode: grey borders, slightly styled.
 */

import type { Theme } from "../theme";
import type { WildCardField, FieldStyle, Rect } from "@wildcard/types";

export interface FieldRenderState {
  rect: Rect;
  style: FieldStyle;
  lines: string[];
  visible: boolean;
  lockText: boolean;
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  showScrollArrows: boolean;
  scrollOffset: number; // in lines
  totalLines: number;
  visibleLines: number;
}

/** Approximate character width for the system font */
const CHAR_WIDTH = 7;

export class FieldRenderer {
  private _theme: Theme;

  constructor(theme: Theme) {
    this._theme = theme;
  }

  setTheme(theme: Theme): void {
    this._theme = theme;
  }

  getRenderState(field: WildCardField): FieldRenderState {
    if (!field.visible) {
      return {
        rect: field.rect,
        style: field.style,
        lines: [],
        visible: false,
        lockText: field.lockText,
        borderColor: "transparent",
        backgroundColor: "transparent",
        textColor: this._theme.colors.foreground,
        showScrollArrows: false,
        scrollOffset: 0,
        totalLines: 0,
        visibleLines: 0,
      };
    }

    const lines = this._wrapText(field.content, field.rect.width - 8);
    const lineH = Math.floor(this._theme.fonts.systemSize * this._theme.metrics.lineHeight);
    const contentPadding = 4;
    const availableHeight = field.rect.height - contentPadding * 2;
    const visibleLines = Math.max(1, Math.floor(availableHeight / lineH));
    const showScrollArrows = field.style === "scrolling" && lines.length > visibleLines;

    let borderColor = this._theme.colors.fieldBorder;
    let backgroundColor = this._theme.colors.fieldBackground;

    if (field.style === "transparent") {
      borderColor = "transparent";
      backgroundColor = "transparent";
    }

    if (field.color) {
      backgroundColor = field.color;
    }

    return {
      rect: field.rect,
      style: field.style,
      lines,
      visible: true,
      lockText: field.lockText,
      borderColor,
      backgroundColor,
      textColor: this._theme.colors.foreground,
      showScrollArrows,
      scrollOffset: 0,
      totalLines: lines.length,
      visibleLines,
    };
  }

  /** Wrap text to fit within the given pixel width */
  private _wrapText(text: string, maxWidth: number): string[] {
    const result: string[] = [];
    const paragraphs = text.split("\n");
    const charsPerLine = Math.max(1, Math.floor(maxWidth / CHAR_WIDTH));

    for (const paragraph of paragraphs) {
      if (paragraph.length === 0) {
        result.push("");
        continue;
      }

      const words = paragraph.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
        if (testLine.length > charsPerLine && currentLine) {
          result.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        result.push(currentLine);
      }
    }

    return result.length === 0 ? [""] : result;
  }
}

/**
 * Draw a field to a canvas 2D context.
 */
export function drawField(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: FieldRenderState,
): void {
  if (!state.visible) return;

  const { style } = state;

  switch (style) {
    case "rectangle":
      drawRectField(ctx, theme, state);
      break;
    case "scrolling":
      drawScrollingField(ctx, theme, state);
      break;
    case "transparent":
      drawTransparentField(ctx, theme, state);
      break;
    case "shadow":
      drawShadowField(ctx, theme, state);
      break;
  }
}

function drawRectField(ctx: CanvasRenderingContext2D, theme: Theme, state: FieldRenderState): void {
  const { rect } = state;

  // Background
  ctx.fillStyle = state.backgroundColor;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  // Inset border (classic: dark top/left, lighter bottom/right for 3D effect)
  ctx.fillStyle = state.borderColor;
  // Top border
  ctx.fillRect(rect.x, rect.y, rect.width, 1);
  // Left border
  ctx.fillRect(rect.x, rect.y, 1, rect.height);
  // Bottom border (lighter in classic for inset effect)
  ctx.fillStyle = theme.name === "classic" ? state.borderColor : theme.colors.disabled;
  ctx.fillRect(rect.x, rect.y + rect.height - 1, rect.width, 1);
  // Right border
  ctx.fillRect(rect.x + rect.width - 1, rect.y, 1, rect.height);

  drawFieldText(ctx, theme, state);
}

function drawScrollingField(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: FieldRenderState,
): void {
  const { rect } = state;
  const scrollW = theme.metrics.scrollbarWidth;

  // Background
  ctx.fillStyle = state.backgroundColor;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  // Border
  ctx.strokeStyle = state.borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);

  // Text area (minus scrollbar)
  drawFieldText(ctx, theme, state, rect.width - scrollW);

  // Scroll arrows
  if (state.showScrollArrows) {
    const arrowSize = theme.metrics.fieldScrollArrowSize;
    const sbX = rect.x + rect.width - scrollW;

    // Scrollbar track
    ctx.fillStyle = theme.colors.scrollTrack;
    ctx.fillRect(sbX, rect.y, scrollW, rect.height);
    ctx.fillStyle = state.borderColor;
    ctx.fillRect(sbX, rect.y, 1, rect.height);

    // Up arrow
    ctx.strokeStyle = theme.colors.foreground;
    ctx.strokeRect(sbX + 0.5, rect.y + 0.5, scrollW - 1, arrowSize - 1);
    drawUpArrow(ctx, theme, sbX + scrollW / 2, rect.y + arrowSize / 2);

    // Down arrow
    const downY = rect.y + rect.height - arrowSize;
    ctx.strokeRect(sbX + 0.5, downY + 0.5, scrollW - 1, arrowSize - 1);
    drawDownArrow(ctx, theme, sbX + scrollW / 2, downY + arrowSize / 2);
  }
}

function drawTransparentField(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: FieldRenderState,
): void {
  // No background, no border — just text
  drawFieldText(ctx, theme, state);
}

function drawShadowField(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: FieldRenderState,
): void {
  const { rect } = state;
  const offset = theme.metrics.shadowOffset;

  // Shadow
  ctx.fillStyle = theme.colors.shadow;
  ctx.fillRect(rect.x + offset, rect.y + offset, rect.width, rect.height);

  // Background
  ctx.fillStyle = state.backgroundColor;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  // Border
  ctx.strokeStyle = state.borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);

  drawFieldText(ctx, theme, state);
}

function drawFieldText(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: FieldRenderState,
  maxWidth?: number,
): void {
  const { rect, lines, scrollOffset } = state;
  const lineH = Math.floor(theme.fonts.systemSize * theme.metrics.lineHeight);
  const padding = 4;
  const textWidth = maxWidth ?? rect.width;
  const visibleLines = Math.floor((rect.height - padding * 2) / lineH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x + padding, rect.y + padding, textWidth - padding * 2, rect.height - padding * 2);
  ctx.clip();

  ctx.fillStyle = state.textColor;
  ctx.font = `${theme.fonts.systemSize}px ${theme.fonts.system}`;
  ctx.textBaseline = "top";

  for (let i = 0; i < visibleLines && i + scrollOffset < lines.length; i++) {
    const line = lines[i + scrollOffset];
    ctx.fillText(line, rect.x + padding, rect.y + padding + i * lineH);
  }

  ctx.restore();
}

function drawUpArrow(ctx: CanvasRenderingContext2D, theme: Theme, cx: number, cy: number): void {
  ctx.fillStyle = theme.colors.scrollArrow;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 3);
  ctx.lineTo(cx - 4, cy + 2);
  ctx.lineTo(cx + 4, cy + 2);
  ctx.closePath();
  ctx.fill();
}

function drawDownArrow(ctx: CanvasRenderingContext2D, theme: Theme, cx: number, cy: number): void {
  ctx.fillStyle = theme.colors.scrollArrow;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 3);
  ctx.lineTo(cx - 4, cy - 2);
  ctx.lineTo(cx + 4, cy - 2);
  ctx.closePath();
  ctx.fill();
}
