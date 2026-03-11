import { describe, it, expect, beforeEach } from "vitest";
import { MenuBar, type MenuDef } from "../components/menubar";
import { classicTheme } from "../themes/classic";
import { v3Theme } from "../themes/v3";

const FILE_MENU: MenuDef = {
  title: "File",
  items: [
    { label: "New Stack", shortcut: "N", enabled: true },
    { label: "Open Stack", shortcut: "O", enabled: true },
    { label: "-", shortcut: null, enabled: true }, // separator
    { label: "Close Stack", shortcut: null, enabled: true },
    { label: "Save a Copy", shortcut: null, enabled: true },
    { label: "Quit", shortcut: "Q", enabled: true },
  ],
};

const EDIT_MENU: MenuDef = {
  title: "Edit",
  items: [
    { label: "Undo", shortcut: "Z", enabled: true },
    { label: "Cut", shortcut: "X", enabled: true },
    { label: "Copy", shortcut: "C", enabled: true },
    { label: "Paste", shortcut: "V", enabled: true },
  ],
};

describe("MenuBar", () => {
  let menuBar: MenuBar;

  beforeEach(() => {
    menuBar = new MenuBar(classicTheme);
    menuBar.setMenus([FILE_MENU, EDIT_MENU]);
  });

  it("stores menu definitions", () => {
    expect(menuBar.menus.length).toBe(2);
    expect(menuBar.menus[0].title).toBe("File");
    expect(menuBar.menus[1].title).toBe("Edit");
  });

  it("tracks open/closed state", () => {
    expect(menuBar.isOpen).toBe(false);
    menuBar.openMenu(0);
    expect(menuBar.isOpen).toBe(true);
    expect(menuBar.activeMenuIndex).toBe(0);
    menuBar.close();
    expect(menuBar.isOpen).toBe(false);
    expect(menuBar.activeMenuIndex).toBe(-1);
  });

  it("tracks highlighted item", () => {
    menuBar.openMenu(0);
    expect(menuBar.highlightedItemIndex).toBe(-1);
    menuBar.highlightItem(2);
    expect(menuBar.highlightedItemIndex).toBe(2);
  });

  it("returns menu bar height from theme", () => {
    expect(menuBar.height).toBe(classicTheme.metrics.menuBarHeight);
  });

  it("computes menu title positions", () => {
    const positions = menuBar.getMenuTitlePositions();
    expect(positions.length).toBe(2);
    expect(positions[0].x).toBeGreaterThanOrEqual(0);
    expect(positions[0].title).toBe("File");
    expect(positions[1].x).toBeGreaterThan(positions[0].x);
  });

  it("hit-tests menu titles", () => {
    const hit = menuBar.hitTestTitle(10, 5);
    expect(hit).toBeGreaterThanOrEqual(0);
  });

  it("identifies separator items", () => {
    const items = FILE_MENU.items;
    expect(items[2].label).toBe("-");
  });

  it("can switch themes", () => {
    menuBar.setTheme(v3Theme);
    expect(menuBar.height).toBe(v3Theme.metrics.menuBarHeight);
  });

  it("fires callback on item select", () => {
    let selected: { menu: string; item: string } | null = null;
    menuBar.onSelect = (menu, item) => {
      selected = { menu, item };
    };
    menuBar.openMenu(0);
    menuBar.selectItem(0);
    expect(selected).toEqual({ menu: "File", item: "New Stack" });
  });

  it("uses full HyperCard menu structure", () => {
    const fullMenuBar = new MenuBar(classicTheme);
    fullMenuBar.setMenus(MenuBar.defaultMenus());
    const titles = fullMenuBar.menus.map((m) => m.title);
    expect(titles).toContain("File");
    expect(titles).toContain("Edit");
    expect(titles).toContain("Go");
    expect(titles).toContain("Tools");
    expect(titles).toContain("Objects");
  });
});

describe("MenuBar rendering state", () => {
  it("computes dropdown rect for open menu", () => {
    const menuBar = new MenuBar(classicTheme);
    menuBar.setMenus([FILE_MENU]);
    menuBar.openMenu(0);
    const rect = menuBar.getDropdownRect();
    expect(rect).not.toBeNull();
    expect(rect!.width).toBeGreaterThan(0);
    expect(rect!.height).toBeGreaterThan(0);
    expect(rect!.y).toBe(classicTheme.metrics.menuBarHeight);
  });

  it("returns null dropdown rect when closed", () => {
    const menuBar = new MenuBar(classicTheme);
    menuBar.setMenus([FILE_MENU]);
    const rect = menuBar.getDropdownRect();
    expect(rect).toBeNull();
  });
});
