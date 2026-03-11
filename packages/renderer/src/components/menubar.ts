/**
 * Menu bar component — the classic Mac menu bar at the top of the screen.
 *
 * Visual fidelity: 1px black bottom border, system font, menus highlight
 * as you drag through them. File, Edit, Go, Tools, Objects menus.
 * In classic mode: white background, black text, selected item inverts.
 * In v3 mode: light grey background, accent-color highlight.
 */

import type { Theme } from "../theme";
import type { Rect } from "@wildcard/types";

export interface MenuItemDef {
  label: string; // "-" for separator
  shortcut: string | null; // e.g. "N" for Cmd+N
  enabled: boolean;
}

export interface MenuDef {
  title: string;
  items: MenuItemDef[];
}

export interface MenuTitlePosition {
  x: number;
  width: number;
  title: string;
}

const MENU_TITLE_PADDING = 12;
const MENU_ITEM_HEIGHT = 18;
const MENU_SEPARATOR_HEIGHT = 8;
const MENU_ITEM_PADDING_X = 20;
const MENU_DROPDOWN_MIN_WIDTH = 140;

export class MenuBar {
  private _menus: MenuDef[] = [];
  private _theme: Theme;
  private _activeMenuIndex = -1;
  private _highlightedItemIndex = -1;
  private _titlePositions: MenuTitlePosition[] = [];

  /** Callback when a menu item is selected */
  onSelect: ((menuTitle: string, itemLabel: string) => void) | null = null;

  constructor(theme: Theme) {
    this._theme = theme;
  }

  get menus(): readonly MenuDef[] {
    return this._menus;
  }

  get isOpen(): boolean {
    return this._activeMenuIndex >= 0;
  }

  get activeMenuIndex(): number {
    return this._activeMenuIndex;
  }

  get highlightedItemIndex(): number {
    return this._highlightedItemIndex;
  }

  get height(): number {
    return this._theme.metrics.menuBarHeight;
  }

  setMenus(menus: MenuDef[]): void {
    this._menus = menus;
    this._computeTitlePositions();
  }

  setTheme(theme: Theme): void {
    this._theme = theme;
    this._computeTitlePositions();
  }

  openMenu(index: number): void {
    if (index >= 0 && index < this._menus.length) {
      this._activeMenuIndex = index;
      this._highlightedItemIndex = -1;
    }
  }

  close(): void {
    this._activeMenuIndex = -1;
    this._highlightedItemIndex = -1;
  }

  highlightItem(index: number): void {
    this._highlightedItemIndex = index;
  }

  selectItem(index: number): void {
    if (this._activeMenuIndex < 0) return;
    const menu = this._menus[this._activeMenuIndex];
    if (index >= 0 && index < menu.items.length) {
      const item = menu.items[index];
      if (item.label !== "-" && item.enabled && this.onSelect) {
        this.onSelect(menu.title, item.label);
      }
    }
    this.close();
  }

  getMenuTitlePositions(): MenuTitlePosition[] {
    return this._titlePositions;
  }

  /** Hit-test a point against menu titles. Returns menu index or -1. */
  hitTestTitle(x: number, y: number): number {
    if (y < 0 || y >= this.height) return -1;
    for (let i = 0; i < this._titlePositions.length; i++) {
      const pos = this._titlePositions[i];
      if (x >= pos.x && x < pos.x + pos.width) {
        return i;
      }
    }
    return -1;
  }

  /** Hit-test a point against the dropdown items. Returns item index or -1. */
  hitTestDropdown(x: number, y: number): number {
    const rect = this.getDropdownRect();
    if (!rect) return -1;
    if (x < rect.x || x >= rect.x + rect.width) return -1;
    if (y < rect.y || y >= rect.y + rect.height) return -1;

    const menu = this._menus[this._activeMenuIndex];
    let itemY = rect.y;
    for (let i = 0; i < menu.items.length; i++) {
      const item = menu.items[i];
      const h = item.label === "-" ? MENU_SEPARATOR_HEIGHT : MENU_ITEM_HEIGHT;
      if (y >= itemY && y < itemY + h) {
        return item.label === "-" ? -1 : i;
      }
      itemY += h;
    }
    return -1;
  }

  /** Compute the dropdown rectangle for the currently open menu. */
  getDropdownRect(): Rect | null {
    if (this._activeMenuIndex < 0) return null;
    const menu = this._menus[this._activeMenuIndex];
    const titlePos = this._titlePositions[this._activeMenuIndex];
    if (!titlePos) return null;

    // Calculate dropdown width based on longest item
    let maxWidth = MENU_DROPDOWN_MIN_WIDTH;
    for (const item of menu.items) {
      if (item.label === "-") continue;
      const labelWidth = item.label.length * 7 + MENU_ITEM_PADDING_X * 2;
      const shortcutWidth = item.shortcut ? 40 : 0;
      maxWidth = Math.max(maxWidth, labelWidth + shortcutWidth);
    }

    // Calculate dropdown height
    let totalHeight = 0;
    for (const item of menu.items) {
      totalHeight += item.label === "-" ? MENU_SEPARATOR_HEIGHT : MENU_ITEM_HEIGHT;
    }

    return {
      x: titlePos.x,
      y: this.height,
      width: maxWidth,
      height: totalHeight,
    };
  }

  /**
   * Get rendering data for the menu bar. This is used by the render loop
   * to draw the menu bar without the component needing canvas access directly.
   */
  getRenderState(): MenuBarRenderState {
    return {
      theme: this._theme,
      height: this.height,
      menus: this._menus,
      titlePositions: this._titlePositions,
      activeMenuIndex: this._activeMenuIndex,
      highlightedItemIndex: this._highlightedItemIndex,
      dropdownRect: this.getDropdownRect(),
    };
  }

  private _computeTitlePositions(): void {
    this._titlePositions = [];
    let x = 10; // Apple menu icon space
    for (const menu of this._menus) {
      const width = menu.title.length * 8 + MENU_TITLE_PADDING;
      this._titlePositions.push({ x, width, title: menu.title });
      x += width;
    }
  }

  /** Default HyperCard menu structure */
  static defaultMenus(): MenuDef[] {
    return [
      {
        title: "File",
        items: [
          { label: "New Stack", shortcut: "N", enabled: true },
          { label: "Open Stack", shortcut: "O", enabled: true },
          { label: "Close Stack", shortcut: null, enabled: true },
          { label: "-", shortcut: null, enabled: true },
          { label: "Save a Copy", shortcut: null, enabled: true },
          { label: "Compact Stack", shortcut: null, enabled: true },
          { label: "Protect Stack", shortcut: null, enabled: true },
          { label: "Delete Stack", shortcut: null, enabled: true },
          { label: "-", shortcut: null, enabled: true },
          { label: "Page Setup", shortcut: null, enabled: true },
          { label: "Print Card", shortcut: "P", enabled: true },
          { label: "Print Stack", shortcut: null, enabled: true },
          { label: "-", shortcut: null, enabled: true },
          { label: "Quit", shortcut: "Q", enabled: true },
        ],
      },
      {
        title: "Edit",
        items: [
          { label: "Undo", shortcut: "Z", enabled: true },
          { label: "-", shortcut: null, enabled: true },
          { label: "Cut", shortcut: "X", enabled: true },
          { label: "Copy", shortcut: "C", enabled: true },
          { label: "Paste", shortcut: "V", enabled: true },
          { label: "Clear", shortcut: null, enabled: true },
          { label: "-", shortcut: null, enabled: true },
          { label: "New Card", shortcut: null, enabled: true },
          { label: "Delete Card", shortcut: null, enabled: true },
          { label: "-", shortcut: null, enabled: true },
          { label: "Text Style", shortcut: "T", enabled: true },
          { label: "Background", shortcut: "B", enabled: true },
          { label: "Icon", shortcut: null, enabled: true },
        ],
      },
      {
        title: "Go",
        items: [
          { label: "Back", shortcut: null, enabled: true },
          { label: "Home", shortcut: "H", enabled: true },
          { label: "Help", shortcut: null, enabled: true },
          { label: "Recent", shortcut: "R", enabled: true },
          { label: "-", shortcut: null, enabled: true },
          { label: "First", shortcut: "1", enabled: true },
          { label: "Prev", shortcut: "2", enabled: true },
          { label: "Next", shortcut: "3", enabled: true },
          { label: "Last", shortcut: "4", enabled: true },
          { label: "-", shortcut: null, enabled: true },
          { label: "Find", shortcut: "F", enabled: true },
          { label: "Message", shortcut: "M", enabled: true },
          { label: "Scroll", shortcut: null, enabled: true },
          { label: "Next Window", shortcut: "L", enabled: true },
        ],
      },
      {
        title: "Tools",
        items: [
          { label: "Browse", shortcut: null, enabled: true },
          { label: "Button", shortcut: null, enabled: true },
          { label: "Field", shortcut: null, enabled: true },
          { label: "Select", shortcut: null, enabled: true },
          { label: "Lasso", shortcut: null, enabled: true },
          { label: "Pencil", shortcut: null, enabled: true },
          { label: "Brush", shortcut: null, enabled: true },
          { label: "Eraser", shortcut: null, enabled: true },
          { label: "Line", shortcut: null, enabled: true },
          { label: "Spray", shortcut: null, enabled: true },
          { label: "Rectangle", shortcut: null, enabled: true },
          { label: "Round Rectangle", shortcut: null, enabled: true },
          { label: "Bucket", shortcut: null, enabled: true },
          { label: "Oval", shortcut: null, enabled: true },
          { label: "Curve", shortcut: null, enabled: true },
          { label: "Regular Polygon", shortcut: null, enabled: true },
          { label: "Text", shortcut: null, enabled: true },
        ],
      },
      {
        title: "Objects",
        items: [
          { label: "Button Info", shortcut: null, enabled: true },
          { label: "Field Info", shortcut: null, enabled: true },
          { label: "Card Info", shortcut: null, enabled: true },
          { label: "Background Info", shortcut: null, enabled: true },
          { label: "Stack Info", shortcut: null, enabled: true },
          { label: "-", shortcut: null, enabled: true },
          { label: "Bring Closer", shortcut: null, enabled: true },
          { label: "Send Farther", shortcut: null, enabled: true },
          { label: "-", shortcut: null, enabled: true },
          { label: "New Button", shortcut: null, enabled: true },
          { label: "New Field", shortcut: null, enabled: true },
          { label: "New Background", shortcut: null, enabled: true },
        ],
      },
    ];
  }
}

export interface MenuBarRenderState {
  theme: Theme;
  height: number;
  menus: readonly MenuDef[];
  titlePositions: readonly MenuTitlePosition[];
  activeMenuIndex: number;
  highlightedItemIndex: number;
  dropdownRect: Rect | null;
}

/**
 * Render the menu bar to a canvas 2D context.
 * Separated from MenuBar state so rendering can be tested independently.
 */
export function drawMenuBar(ctx: CanvasRenderingContext2D, state: MenuBarRenderState): void {
  const { theme, height, titlePositions, activeMenuIndex, highlightedItemIndex, dropdownRect } =
    state;

  // Menu bar background
  ctx.fillStyle = theme.colors.menuBar;
  ctx.fillRect(0, 0, ctx.canvas.width, height);

  // 1px black bottom border
  ctx.fillStyle = theme.colors.foreground;
  ctx.fillRect(0, height - 1, ctx.canvas.width, 1);

  // Menu titles
  ctx.font = `${theme.fonts.menuSize}px ${theme.fonts.menu}`;
  ctx.textBaseline = "middle";

  for (let i = 0; i < titlePositions.length; i++) {
    const pos = titlePositions[i];
    const isActive = i === activeMenuIndex;

    if (isActive) {
      // Highlight the active menu title
      ctx.fillStyle = theme.colors.menuHighlight;
      ctx.fillRect(pos.x - 4, 0, pos.width + 4, height - 1);
      ctx.fillStyle = theme.colors.menuHighlightText;
    } else {
      ctx.fillStyle = theme.colors.menuBarText;
    }

    ctx.fillText(pos.title, pos.x, height / 2);
  }

  // Dropdown
  if (dropdownRect && activeMenuIndex >= 0) {
    const menu = state.menus[activeMenuIndex];

    // Dropdown shadow
    ctx.fillStyle = theme.colors.shadow;
    ctx.fillRect(dropdownRect.x + 2, dropdownRect.y + 2, dropdownRect.width, dropdownRect.height);

    // Dropdown background
    ctx.fillStyle = theme.colors.windowBackground;
    ctx.fillRect(dropdownRect.x, dropdownRect.y, dropdownRect.width, dropdownRect.height);

    // Dropdown border
    ctx.strokeStyle = theme.colors.foreground;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      dropdownRect.x + 0.5,
      dropdownRect.y + 0.5,
      dropdownRect.width - 1,
      dropdownRect.height - 1,
    );

    // Items
    let itemY = dropdownRect.y;
    for (let i = 0; i < menu.items.length; i++) {
      const item = menu.items[i];

      if (item.label === "-") {
        // Separator line
        const sepY = itemY + 4;
        ctx.fillStyle = theme.colors.foreground;
        ctx.fillRect(dropdownRect.x + 1, sepY, dropdownRect.width - 2, 1);
        itemY += 8;
        continue;
      }

      const isHighlighted = i === highlightedItemIndex;

      if (isHighlighted) {
        ctx.fillStyle = theme.colors.menuHighlight;
        ctx.fillRect(dropdownRect.x + 1, itemY, dropdownRect.width - 2, 18);
        ctx.fillStyle = theme.colors.menuHighlightText;
      } else {
        ctx.fillStyle = item.enabled ? theme.colors.foreground : theme.colors.disabled;
      }

      ctx.fillText(item.label, dropdownRect.x + 20, itemY + 9);

      // Keyboard shortcut
      if (item.shortcut) {
        const shortcutText = `\u2318${item.shortcut}`;
        const shortcutWidth = ctx.measureText(shortcutText).width;
        ctx.fillText(shortcutText, dropdownRect.x + dropdownRect.width - shortcutWidth - 12, itemY + 9);
      }

      itemY += 18;
    }
  }
}
