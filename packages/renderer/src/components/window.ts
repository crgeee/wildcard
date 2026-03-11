/**
 * Window chrome component — classic Mac window with title bar, close box,
 * content area, and optional scrollbar.
 *
 * Visual fidelity:
 * - 1px black border around entire window
 * - Title bar with horizontal lines pattern, close box top-left, title centered
 * - Content area below title bar
 * - Optional scrollbar on right side (scroll arrows, not scroll thumb in classic)
 * - Shadow (2px offset in classic)
 * - Dragging by title bar
 * - Z-ordering of multiple windows
 */

import type { Theme } from "../theme";
import type { Rect } from "@wildcard/types";
import { TitleBar, drawTitleBar } from "./titlebar";

export interface WindowState {
  id: string;
  title: string;
  rect: Rect;
  isActive: boolean;
  showCloseBox: boolean;
  showScrollbar: boolean;
  scrollPosition: number; // 0-1 normalized
  scrollContentHeight: number;
  visible: boolean;
  zIndex: number;
}

export class WindowChrome {
  private _theme: Theme;
  private _titleBar: TitleBar;
  private _windows: WindowState[] = [];

  /** Callback when close box is clicked */
  onClose: ((windowId: string) => void) | null = null;
  /** Callback when window is dragged */
  onDrag: ((windowId: string, dx: number, dy: number) => void) | null = null;
  /** Callback when scroll position changes */
  onScroll: ((windowId: string, position: number) => void) | null = null;

  constructor(theme: Theme) {
    this._theme = theme;
    this._titleBar = new TitleBar(theme);
  }

  setTheme(theme: Theme): void {
    this._theme = theme;
    this._titleBar.setTheme(theme);
  }

  get windows(): readonly WindowState[] {
    return this._windows;
  }

  addWindow(state: WindowState): void {
    this._windows.push(state);
    this._sortByZIndex();
  }

  removeWindow(id: string): void {
    this._windows = this._windows.filter((w) => w.id !== id);
  }

  getWindow(id: string): WindowState | undefined {
    return this._windows.find((w) => w.id === id);
  }

  updateWindow(id: string, updates: Partial<WindowState>): void {
    const win = this._windows.find((w) => w.id === id);
    if (win) {
      Object.assign(win, updates);
      this._sortByZIndex();
    }
  }

  bringToFront(id: string): void {
    const maxZ = Math.max(0, ...this._windows.map((w) => w.zIndex));
    this.updateWindow(id, { zIndex: maxZ + 1, isActive: true });
    // Deactivate all other windows
    for (const win of this._windows) {
      if (win.id !== id) {
        win.isActive = false;
      }
    }
  }

  /** Get the content area rect (window minus title bar and border) */
  getContentRect(windowState: WindowState): Rect {
    const titleH = this._theme.metrics.titleBarHeight;
    const border = this._theme.metrics.borderWidth;
    const scrollW = windowState.showScrollbar ? this._theme.metrics.scrollbarWidth : 0;
    return {
      x: windowState.rect.x + border,
      y: windowState.rect.y + titleH,
      width: windowState.rect.width - border * 2 - scrollW,
      height: windowState.rect.height - titleH - border,
    };
  }

  /** Get the scrollbar rect for a window */
  getScrollbarRect(windowState: WindowState): Rect | null {
    if (!windowState.showScrollbar) return null;
    const titleH = this._theme.metrics.titleBarHeight;
    const border = this._theme.metrics.borderWidth;
    const scrollW = this._theme.metrics.scrollbarWidth;
    return {
      x: windowState.rect.x + windowState.rect.width - scrollW - border,
      y: windowState.rect.y + titleH,
      width: scrollW,
      height: windowState.rect.height - titleH - border,
    };
  }

  /** Hit-test all windows. Returns the top-most window that contains the point. */
  hitTest(x: number, y: number): WindowState | null {
    // Iterate in reverse z-order (front to back)
    for (let i = this._windows.length - 1; i >= 0; i--) {
      const win = this._windows[i];
      if (!win.visible) continue;
      const r = win.rect;
      if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) {
        return win;
      }
    }
    return null;
  }

  /** Hit-test specifically for the title bar area of a window */
  hitTestTitleBar(x: number, y: number, win: WindowState): boolean {
    const titleH = this._theme.metrics.titleBarHeight;
    return (
      x >= win.rect.x &&
      x < win.rect.x + win.rect.width &&
      y >= win.rect.y &&
      y < win.rect.y + titleH
    );
  }

  /** Hit-test the close box of a window */
  hitTestCloseBox(x: number, y: number, win: WindowState): boolean {
    return this._titleBar.hitTestCloseBox(x, y, win.rect);
  }

  /** Hit-test the scrollbar up arrow */
  hitTestScrollUp(x: number, y: number, win: WindowState): boolean {
    const sbRect = this.getScrollbarRect(win);
    if (!sbRect) return false;
    const arrowSize = this._theme.metrics.fieldScrollArrowSize;
    return (
      x >= sbRect.x && x < sbRect.x + sbRect.width && y >= sbRect.y && y < sbRect.y + arrowSize
    );
  }

  /** Hit-test the scrollbar down arrow */
  hitTestScrollDown(x: number, y: number, win: WindowState): boolean {
    const sbRect = this.getScrollbarRect(win);
    if (!sbRect) return false;
    const arrowSize = this._theme.metrics.fieldScrollArrowSize;
    return (
      x >= sbRect.x &&
      x < sbRect.x + sbRect.width &&
      y >= sbRect.y + sbRect.height - arrowSize &&
      y < sbRect.y + sbRect.height
    );
  }

  private _sortByZIndex(): void {
    this._windows.sort((a, b) => a.zIndex - b.zIndex);
  }
}

/**
 * Draw a window to a canvas 2D context.
 */
export function drawWindow(ctx: CanvasRenderingContext2D, theme: Theme, state: WindowState): void {
  if (!state.visible) return;

  const { rect } = state;
  const border = theme.metrics.borderWidth;
  const shadowOffset = theme.metrics.shadowOffset;

  // Window shadow
  ctx.fillStyle = theme.colors.shadow;
  ctx.fillRect(rect.x + shadowOffset, rect.y + shadowOffset, rect.width, rect.height);

  // Window background
  ctx.fillStyle = theme.colors.windowBackground;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  // Window border
  ctx.strokeStyle = theme.colors.foreground;
  ctx.lineWidth = border;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);

  // Title bar
  drawTitleBar(ctx, theme, {
    title: state.title,
    isActive: state.isActive,
    showCloseBox: state.showCloseBox,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: theme.metrics.titleBarHeight },
  });

  // Scrollbar
  if (state.showScrollbar) {
    drawScrollbar(ctx, theme, state);
  }
}

/**
 * Draw the classic Mac scrollbar (scroll arrows, not scroll thumb).
 * Classic HyperCard fields use scroll arrows, not a thumb/track.
 */
function drawScrollbar(ctx: CanvasRenderingContext2D, theme: Theme, state: WindowState): void {
  const titleH = theme.metrics.titleBarHeight;
  const border = theme.metrics.borderWidth;
  const scrollW = theme.metrics.scrollbarWidth;
  const arrowSize = theme.metrics.fieldScrollArrowSize;

  const sbX = state.rect.x + state.rect.width - scrollW - border;
  const sbY = state.rect.y + titleH;
  const sbH = state.rect.height - titleH - border;

  // Scrollbar track background
  ctx.fillStyle = theme.colors.scrollTrack;
  ctx.fillRect(sbX, sbY, scrollW, sbH);

  // Left border of scrollbar
  ctx.fillStyle = theme.colors.foreground;
  ctx.fillRect(sbX, sbY, 1, sbH);

  // Up arrow box
  ctx.strokeStyle = theme.colors.foreground;
  ctx.lineWidth = 1;
  ctx.strokeRect(sbX + 0.5, sbY + 0.5, scrollW - 1, arrowSize - 1);

  // Up arrow triangle
  const upCenterX = sbX + scrollW / 2;
  const upCenterY = sbY + arrowSize / 2;
  ctx.fillStyle = theme.colors.scrollArrow;
  ctx.beginPath();
  ctx.moveTo(upCenterX, upCenterY - 3);
  ctx.lineTo(upCenterX - 4, upCenterY + 2);
  ctx.lineTo(upCenterX + 4, upCenterY + 2);
  ctx.closePath();
  ctx.fill();

  // Down arrow box
  const downY = sbY + sbH - arrowSize;
  ctx.strokeStyle = theme.colors.foreground;
  ctx.strokeRect(sbX + 0.5, downY + 0.5, scrollW - 1, arrowSize - 1);

  // Down arrow triangle
  const downCenterX = sbX + scrollW / 2;
  const downCenterY = downY + arrowSize / 2;
  ctx.fillStyle = theme.colors.scrollArrow;
  ctx.beginPath();
  ctx.moveTo(downCenterX, downCenterY + 3);
  ctx.lineTo(downCenterX - 4, downCenterY - 2);
  ctx.lineTo(downCenterX + 4, downCenterY - 2);
  ctx.closePath();
  ctx.fill();
}
