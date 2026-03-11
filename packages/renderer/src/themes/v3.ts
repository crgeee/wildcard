/**
 * Version 3.0 theme: "The unreleased version, imagined."
 *
 * Color inside cards, smoother UI — but still using the same window chrome
 * and interaction model as classic. It should feel like someone at Apple in
 * 1996 added color support to HyperCard — not like a modern redesign.
 *
 * Same metrics as Classic (menu bar, title bar, scrollbar sizes, card dimensions).
 * Color is additive, not replacement.
 */

import type { Theme } from "../theme";

export const v3Theme: Theme = {
  name: "v3",
  displayName: "3.0 — The unreleased version, imagined.",

  colors: {
    background: "#ffffff",
    foreground: "#000000",
    accent: "#0066cc",
    menuBar: "#dddddd",
    menuBarText: "#000000",
    menuHighlight: "#0066cc",
    menuHighlightText: "#ffffff",
    titleBar: "#cccccc",
    windowBackground: "#f5f5f5",
    buttonFace: "#dddddd",
    buttonText: "#000000",
    buttonHilite: "#0066cc",
    buttonHiliteText: "#ffffff",
    fieldBackground: "#ffffff",
    fieldBorder: "#999999",
    disabled: "#aaaaaa",
    shadow: "#666666",
    scrollTrack: "#eeeeee",
    scrollArrow: "#555555",
    dialogOverlay: "rgba(0,0,0,0.35)",
  },

  fonts: {
    system: '"Chicago", "ChicagoFLF", "Geneva", sans-serif',
    systemSize: 12,
    monospace: '"Monaco", "Courier New", monospace',
    monospaceSize: 9,
    menu: '"Chicago", "ChicagoFLF", "Geneva", sans-serif',
    menuSize: 12,
  },

  metrics: {
    // Same chrome dimensions as classic — the 3.0 layer is additive, not replacement
    menuBarHeight: 20,
    titleBarHeight: 18,
    borderWidth: 1,
    scrollbarWidth: 15,
    closeBoxSize: 11,
    buttonBorderRadius: 6,
    buttonPadding: 8,
    cardWidth: 512,
    cardHeight: 342,
    paletteColumns: 2,
    toolIconSize: 24,
    messageBoxHeight: 28,
    fieldScrollArrowSize: 15,
    shadowOffset: 2,
    lineHeight: 1.2,
  },

  cursors: {
    browse: { css: "pointer", hotX: 5, hotY: 0 },
    ibeam: { css: "text", hotX: 4, hotY: 8 },
    crosshair: { css: "crosshair", hotX: 8, hotY: 8 },
    watch: { css: "wait", hotX: 8, hotY: 8 },
    arrow: { css: "default", hotX: 0, hotY: 0 },
  },

  patterns: null, // v3 uses color fills rather than 1-bit patterns
  titleBarLines: true, // same chrome style
  buttonInvertOnClick: false, // v3 uses color highlight instead of invert
};
