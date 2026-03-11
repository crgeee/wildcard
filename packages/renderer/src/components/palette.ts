/**
 * Tool palette component — floating window with 2-column icon grid.
 *
 * Visual fidelity:
 * - Floating window with title bar
 * - 2-column grid of tool icons
 * - Selected tool highlighted (inverted in classic, colored in v3)
 * - All 17 tools in the classic HyperCard order
 * - Draggable by title bar
 * - On mobile: collapses to bottom drawer
 */

import type { Theme } from "../theme";
import type { Rect } from "@wildcard/types";
import type { ToolName } from "../tools/tool";
import { TOOL_ORDER, TOOL_DISPLAY_NAMES } from "../tools/tool";

const PALETTE_PADDING = 4;
const PALETTE_TITLE = "Tools";

export class ToolPalette {
  private _theme: Theme;
  private _selectedTool: ToolName = "browse";
  private _position: { x: number; y: number } = { x: 10, y: 50 };
  private _visible = true;
  private _isMobileDrawer = false;

  /** Callback when a tool is selected */
  onToolSelect: ((tool: ToolName) => void) | null = null;

  constructor(theme: Theme) {
    this._theme = theme;
  }

  get tools(): readonly ToolName[] {
    return TOOL_ORDER;
  }

  get selectedTool(): ToolName {
    return this._selectedTool;
  }

  get columns(): number {
    return this._theme.metrics.paletteColumns;
  }

  get visible(): boolean {
    return this._visible;
  }

  set visible(v: boolean) {
    this._visible = v;
  }

  get isMobileDrawer(): boolean {
    return this._isMobileDrawer;
  }

  set isMobileDrawer(v: boolean) {
    this._isMobileDrawer = v;
  }

  setTheme(theme: Theme): void {
    this._theme = theme;
  }

  selectTool(tool: ToolName): void {
    this._selectedTool = tool;
    if (this.onToolSelect) {
      this.onToolSelect(tool);
    }
  }

  setPosition(x: number, y: number): void {
    this._position = { x, y };
  }

  /** Get the full palette rect including title bar and border */
  getRect(): Rect {
    if (this._isMobileDrawer) {
      return this._getMobileDrawerRect();
    }

    const cols = this.columns;
    const iconSize = this._theme.metrics.toolIconSize;
    const rows = Math.ceil(TOOL_ORDER.length / cols);
    const titleH = this._theme.metrics.titleBarHeight;

    const width = cols * iconSize + PALETTE_PADDING * 2 + 2; // +2 for border
    const height = titleH + rows * iconSize + PALETTE_PADDING * 2 + 2;

    return {
      x: this._position.x,
      y: this._position.y,
      width,
      height,
    };
  }

  /** Hit-test a point against tool icons. Returns tool name or null. */
  hitTestTool(x: number, y: number): ToolName | null {
    const rect = this.getRect();
    const titleH = this._theme.metrics.titleBarHeight;
    const iconSize = this._theme.metrics.toolIconSize;
    const cols = this.columns;

    const contentX = rect.x + PALETTE_PADDING + 1;
    const contentY = rect.y + titleH + PALETTE_PADDING + 1;

    const relX = x - contentX;
    const relY = y - contentY;

    if (relX < 0 || relY < 0) return null;

    const col = Math.floor(relX / iconSize);
    const row = Math.floor(relY / iconSize);

    if (col >= cols) return null;

    const index = row * cols + col;
    if (index >= 0 && index < TOOL_ORDER.length) {
      return TOOL_ORDER[index];
    }
    return null;
  }

  /** Get the rect for a specific tool icon (for highlighting) */
  getToolIconRect(tool: ToolName): Rect | null {
    const index = TOOL_ORDER.indexOf(tool);
    if (index < 0) return null;

    const rect = this.getRect();
    const titleH = this._theme.metrics.titleBarHeight;
    const iconSize = this._theme.metrics.toolIconSize;
    const cols = this.columns;

    const row = Math.floor(index / cols);
    const col = index % cols;

    return {
      x: rect.x + PALETTE_PADDING + 1 + col * iconSize,
      y: rect.y + titleH + PALETTE_PADDING + 1 + row * iconSize,
      width: iconSize,
      height: iconSize,
    };
  }

  /** Get rendering state for the palette */
  getRenderState(): PaletteRenderState {
    return {
      rect: this.getRect(),
      tools: TOOL_ORDER.map((name) => ({
        name,
        displayName: TOOL_DISPLAY_NAMES[name],
        isSelected: name === this._selectedTool,
      })),
      columns: this.columns,
      iconSize: this._theme.metrics.toolIconSize,
      titleBarHeight: this._theme.metrics.titleBarHeight,
      padding: PALETTE_PADDING,
      title: PALETTE_TITLE,
      visible: this._visible,
      isMobileDrawer: this._isMobileDrawer,
    };
  }

  private _getMobileDrawerRect(): Rect {
    // Mobile drawer: full width, fixed height at bottom of screen
    const iconSize = this._theme.metrics.toolIconSize;
    const cols = Math.min(TOOL_ORDER.length, 9); // more columns on mobile
    const rows = Math.ceil(TOOL_ORDER.length / cols);
    const height = rows * iconSize + PALETTE_PADDING * 2;

    return {
      x: 0,
      y: 0, // Will be positioned by the responsive layout
      width: cols * iconSize + PALETTE_PADDING * 2,
      height,
    };
  }
}

export interface PaletteToolState {
  name: ToolName;
  displayName: string;
  isSelected: boolean;
}

export interface PaletteRenderState {
  rect: Rect;
  tools: PaletteToolState[];
  columns: number;
  iconSize: number;
  titleBarHeight: number;
  padding: number;
  title: string;
  visible: boolean;
  isMobileDrawer: boolean;
}

/**
 * Draw the tool palette to a canvas 2D context.
 */
export function drawPalette(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  state: PaletteRenderState,
): void {
  if (!state.visible) return;

  const { rect } = state;

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

  // Title bar (simplified for palette — just the title, no close box)
  if (!state.isMobileDrawer) {
    ctx.fillStyle = theme.colors.foreground;
    ctx.fillRect(rect.x, rect.y + state.titleBarHeight - 1, rect.width, 1);

    ctx.font = `${theme.fonts.systemSize}px ${theme.fonts.system}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = theme.colors.foreground;
    ctx.fillText(state.title, rect.x + rect.width / 2, rect.y + state.titleBarHeight / 2);
    ctx.textAlign = "left";
  }

  // Tool icons
  const startY = state.isMobileDrawer
    ? rect.y + state.padding
    : rect.y + state.titleBarHeight + state.padding;
  const startX = rect.x + state.padding + 1;

  for (let i = 0; i < state.tools.length; i++) {
    const tool = state.tools[i];
    const row = Math.floor(i / state.columns);
    const col = i % state.columns;
    const x = startX + col * state.iconSize;
    const y = startY + row * state.iconSize;

    // Highlight selected tool
    if (tool.isSelected) {
      if (theme.name === "classic") {
        // Invert: black background, white icon
        ctx.fillStyle = theme.colors.foreground;
        ctx.fillRect(x, y, state.iconSize, state.iconSize);
      } else {
        ctx.fillStyle = theme.colors.accent ?? theme.colors.foreground;
        ctx.fillRect(x, y, state.iconSize, state.iconSize);
      }
    }

    // Tool icon border
    ctx.strokeStyle = theme.colors.foreground;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, state.iconSize - 1, state.iconSize - 1);

    // Tool icon (simplified: draw first letter as placeholder)
    // In production, these would be actual bitmap icons
    const iconColor = tool.isSelected
      ? theme.name === "classic"
        ? theme.colors.background
        : theme.colors.menuHighlightText
      : theme.colors.foreground;
    ctx.fillStyle = iconColor;
    ctx.font = `bold ${Math.floor(state.iconSize * 0.5)}px ${theme.fonts.system}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(tool.displayName.charAt(0), x + state.iconSize / 2, y + state.iconSize / 2);
    ctx.textAlign = "left";
  }
}
