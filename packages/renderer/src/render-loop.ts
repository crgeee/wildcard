/**
 * Render loop — requestAnimationFrame-based rendering with dirty-region optimization.
 *
 * Architecture:
 * 1. State changes mark regions as dirty
 * 2. Each frame, only dirty regions are repainted
 * 3. Background layer cached in OffscreenCanvas
 * 4. Object layer rendered on top
 * 5. UI chrome (menu bar, tool palette, message box) rendered last
 *
 * Layer order (bottom to top):
 * - Card background paint data
 * - Background objects (buttons/fields on the background)
 * - Card paint data
 * - Card objects (buttons/fields on the card)
 * - Floating windows (tool palette, script editor, dialogs)
 * - Menu bar (always on top)
 * - Message box (bottom of screen)
 */

import type { Theme } from "./theme";
import type { WildCardStack, WildCardCard, WildCardObject } from "@wildcard/types";
import { CardCanvas } from "./components/card";
import { MenuBar, drawMenuBar } from "./components/menubar";
import { WindowChrome, drawWindow } from "./components/window";
import { ButtonRenderer, drawButton } from "./components/button";
import { FieldRenderer, drawField } from "./components/field";
import type { ToolName } from "./tools/tool";

export interface RenderState {
  /** Active theme */
  theme: Theme;
  /** Current stack */
  stack: WildCardStack | null;
  /** Current card index */
  currentCardIndex: number;
  /** Current card objects (merged background + card) */
  objects: WildCardObject[];
  /** Active tool */
  activeTool: ToolName;
  /** Whether the message box is visible */
  messageBoxVisible: boolean;
  /** Message box text */
  messageBoxText: string;
  /** Whether the script editor is open */
  scriptEditorVisible: boolean;
  /** Script editor content */
  scriptEditorContent: string;
  /** Script editor title */
  scriptEditorTitle: string;
  /** Current user level (1-5) */
  userLevel: number;
}

export class RenderLoop {
  private _ctx: CanvasRenderingContext2D;
  private _theme: Theme;
  private _running = false;
  private _rafId: number | null = null;
  private _state: RenderState;

  private _cardCanvas: CardCanvas;
  private _menuBar: MenuBar;
  private _windowChrome: WindowChrome;
  private _buttonRenderer: ButtonRenderer;
  private _fieldRenderer: FieldRenderer;

  private _frameCount = 0;
  private _lastFrameTime = 0;

  constructor(ctx: CanvasRenderingContext2D, theme: Theme) {
    this._ctx = ctx;
    this._theme = theme;

    this._cardCanvas = new CardCanvas(theme);
    this._menuBar = new MenuBar(theme);
    this._menuBar.setMenus(MenuBar.defaultMenus());
    this._windowChrome = new WindowChrome(theme);
    this._buttonRenderer = new ButtonRenderer(theme);
    this._fieldRenderer = new FieldRenderer(theme);

    this._state = {
      theme,
      stack: null,
      currentCardIndex: 0,
      objects: [],
      activeTool: "browse",
      messageBoxVisible: false,
      messageBoxText: "",
      scriptEditorVisible: false,
      scriptEditorContent: "",
      scriptEditorTitle: "",
      userLevel: 1,
    };
  }

  get state(): RenderState {
    return this._state;
  }

  get menuBar(): MenuBar {
    return this._menuBar;
  }

  get windowChrome(): WindowChrome {
    return this._windowChrome;
  }

  get cardCanvas(): CardCanvas {
    return this._cardCanvas;
  }

  get isRunning(): boolean {
    return this._running;
  }

  get frameCount(): number {
    return this._frameCount;
  }

  setState(updates: Partial<RenderState>): void {
    Object.assign(this._state, updates);
    if (updates.theme) {
      this._theme = updates.theme;
      this._cardCanvas.setTheme(updates.theme);
      this._menuBar.setTheme(updates.theme);
      this._windowChrome.setTheme(updates.theme);
      this._buttonRenderer.setTheme(updates.theme);
      this._fieldRenderer.setTheme(updates.theme);
    }
    if (updates.objects) {
      this._cardCanvas.setObjects(updates.objects);
    }
    this._cardCanvas.markFullDirty();
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this._lastFrameTime = performance.now();
    this._tick();
  }

  stop(): void {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /** Force a single frame render (useful for testing) */
  renderFrame(): void {
    this._render();
  }

  private _tick(): void {
    if (!this._running) return;
    this._render();
    this._frameCount++;
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  private _render(): void {
    const ctx = this._ctx;
    const theme = this._theme;
    const menuH = theme.metrics.menuBarHeight;
    const cardW = theme.metrics.cardWidth;
    const cardH = theme.metrics.cardHeight;

    // Clear entire canvas
    ctx.fillStyle = theme.colors.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 1. Card background
    ctx.fillStyle = theme.colors.background;
    ctx.fillRect(0, menuH, cardW, cardH);

    // 2. Render objects (buttons and fields)
    for (const obj of this._state.objects) {
      if (!obj.visible) continue;

      if (obj.type === "button") {
        const btnState = this._buttonRenderer.getRenderState(obj);
        // Offset by menu bar height
        const offsetState = {
          ...btnState,
          rect: { ...btnState.rect, y: btnState.rect.y + menuH },
        };
        drawButton(ctx, theme, offsetState);
      } else if (obj.type === "field") {
        const fieldState = this._fieldRenderer.getRenderState(obj);
        const offsetState = {
          ...fieldState,
          rect: { ...fieldState.rect, y: fieldState.rect.y + menuH },
        };
        drawField(ctx, theme, offsetState);
      }
    }

    // 3. Floating windows (tool palette, script editor, etc.)
    for (const win of this._windowChrome.windows) {
      drawWindow(ctx, theme, win);
    }

    // 4. Menu bar (always on top)
    drawMenuBar(ctx, this._menuBar.getRenderState());

    // 5. Message box (if visible)
    if (this._state.messageBoxVisible) {
      this._drawMessageBox(ctx, theme);
    }
  }

  private _drawMessageBox(ctx: CanvasRenderingContext2D, theme: Theme): void {
    const msgH = theme.metrics.messageBoxHeight;
    const y = ctx.canvas.height - msgH;

    // Background
    ctx.fillStyle = theme.colors.windowBackground;
    ctx.fillRect(0, y, ctx.canvas.width, msgH);

    // Top border
    ctx.fillStyle = theme.colors.foreground;
    ctx.fillRect(0, y, ctx.canvas.width, 1);

    // Text
    ctx.fillStyle = theme.colors.foreground;
    ctx.font = `${theme.fonts.systemSize}px ${theme.fonts.system}`;
    ctx.textBaseline = "middle";
    ctx.fillText(this._state.messageBoxText, 8, y + msgH / 2);
  }
}
