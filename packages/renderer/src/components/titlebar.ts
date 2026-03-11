/**
 * Title bar component — classic Mac window title bar.
 *
 * Visual fidelity:
 * - Horizontal lines pattern filling the title bar
 * - Close box (11x11 square) in the top-left
 * - Title centered in the bar
 * - 1px black border around everything
 *
 * In classic mode: black horizontal lines on white.
 * In v3 mode: gradient or light grey with same chrome structure.
 */

import type { Theme } from "../theme";
import type { Rect } from "@wildcard/types";

export interface TitleBarState {
  title: string;
  isActive: boolean;
  showCloseBox: boolean;
  rect: Rect;
}

export class TitleBar {
  private _theme: Theme;

  constructor(theme: Theme) {
    this._theme = theme;
  }

  get height(): number {
    return this._theme.metrics.titleBarHeight;
  }

  setTheme(theme: Theme): void {
    this._theme = theme;
  }

  /** Hit-test the close box. Returns true if the point is within the close box. */
  hitTestCloseBox(x: number, y: number, barRect: Rect): boolean {
    const closeBoxRect = this.getCloseBoxRect(barRect);
    return (
      x >= closeBoxRect.x &&
      x < closeBoxRect.x + closeBoxRect.width &&
      y >= closeBoxRect.y &&
      y < closeBoxRect.y + closeBoxRect.height
    );
  }

  getCloseBoxRect(barRect: Rect): Rect {
    const size = this._theme.metrics.closeBoxSize;
    const yOffset = Math.floor((this.height - size) / 2);
    return {
      x: barRect.x + 8,
      y: barRect.y + yOffset,
      width: size,
      height: size,
    };
  }

  /** Hit-test the draggable area (title bar minus close box). */
  hitTestDragArea(x: number, y: number, barRect: Rect): boolean {
    if (y < barRect.y || y >= barRect.y + this.height) return false;
    if (x < barRect.x || x >= barRect.x + barRect.width) return false;
    // Exclude close box area
    return !this.hitTestCloseBox(x, y, barRect);
  }
}

/**
 * Render a title bar to a canvas 2D context.
 */
export function drawTitleBar(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: TitleBarState,
): void {
  const { title, isActive, showCloseBox, rect } = state;
  const height = theme.metrics.titleBarHeight;

  // Title bar background
  ctx.fillStyle = theme.colors.titleBar;
  ctx.fillRect(rect.x, rect.y, rect.width, height);

  // Horizontal lines pattern (classic Mac style)
  if (theme.titleBarLines && isActive) {
    ctx.fillStyle = theme.colors.foreground;
    // Draw alternating 1px lines, leaving space for title and close box
    const closeBoxEnd = rect.x + 8 + theme.metrics.closeBoxSize + 4;
    const titleWidth = title.length * 7 + 12; // approximate
    const titleStart = rect.x + Math.floor((rect.width - titleWidth) / 2);
    const titleEnd = titleStart + titleWidth;

    for (let lineY = rect.y + 2; lineY < rect.y + height - 2; lineY += 2) {
      // Left of title
      if (closeBoxEnd < titleStart) {
        ctx.fillRect(closeBoxEnd, lineY, titleStart - closeBoxEnd, 1);
      }
      // Right of title
      if (titleEnd < rect.x + rect.width - 2) {
        ctx.fillRect(titleEnd, lineY, rect.x + rect.width - 2 - titleEnd, 1);
      }
    }
  }

  // Close box
  if (showCloseBox) {
    const size = theme.metrics.closeBoxSize;
    const yOffset = Math.floor((height - size) / 2);
    const cbx = rect.x + 8;
    const cby = rect.y + yOffset;

    // White background for close box
    ctx.fillStyle = theme.colors.background;
    ctx.fillRect(cbx, cby, size, size);

    // Close box border
    ctx.strokeStyle = theme.colors.foreground;
    ctx.lineWidth = 1;
    ctx.strokeRect(cbx + 0.5, cby + 0.5, size - 1, size - 1);
  }

  // Title text (centered)
  ctx.font = `${theme.fonts.systemSize}px ${theme.fonts.system}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = isActive ? theme.colors.foreground : theme.colors.disabled;

  // White background behind title text (to clear lines)
  const textMetrics = ctx.measureText(title);
  const textX = rect.x + rect.width / 2;
  const textY = rect.y + height / 2;
  ctx.fillStyle = theme.colors.titleBar;
  ctx.fillRect(
    textX - textMetrics.width / 2 - 4,
    rect.y + 1,
    textMetrics.width + 8,
    height - 2,
  );

  ctx.fillStyle = isActive ? theme.colors.foreground : theme.colors.disabled;
  ctx.fillText(title, textX, textY);

  // Reset text alignment
  ctx.textAlign = "left";

  // 1px border at bottom of title bar
  ctx.fillStyle = theme.colors.foreground;
  ctx.fillRect(rect.x, rect.y + height - 1, rect.width, 1);
}
