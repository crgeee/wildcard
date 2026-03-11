/**
 * Theme interface for WildCard renderer.
 *
 * Defines all visual properties needed to render the HyperCard UI.
 * Two built-in themes: Classic (1-bit B&W System 7) and 3.0 (color).
 * Same chrome, same interaction model — only colors/fills change.
 */

export interface ThemeColors {
  /** Background color (white in classic) */
  background: string;
  /** Foreground / text color (black in classic) */
  foreground: string;
  /** Accent color for selection, highlights — null in B&W classic */
  accent: string | null;
  /** Menu bar background */
  menuBar: string;
  /** Menu bar text */
  menuBarText: string;
  /** Selected menu item background */
  menuHighlight: string;
  /** Selected menu item text */
  menuHighlightText: string;
  /** Window title bar background */
  titleBar: string;
  /** Window body background */
  windowBackground: string;
  /** Button face color */
  buttonFace: string;
  /** Button text color */
  buttonText: string;
  /** Button face when pressed/hilited */
  buttonHilite: string;
  /** Button text when pressed/hilited */
  buttonHiliteText: string;
  /** Field background */
  fieldBackground: string;
  /** Field border */
  fieldBorder: string;
  /** Disabled/grey color */
  disabled: string;
  /** Shadow color for shadow-style elements */
  shadow: string;
  /** Scrollbar track */
  scrollTrack: string;
  /** Scrollbar arrow/thumb */
  scrollArrow: string;
  /** Dialog overlay background */
  dialogOverlay: string;
}

export interface ThemeFonts {
  /** System font (Chicago for classic) */
  system: string;
  /** System font size in logical pixels */
  systemSize: number;
  /** Monospace font for script editor */
  monospace: string;
  /** Monospace font size */
  monospaceSize: number;
  /** Font for menu items */
  menu: string;
  /** Menu font size */
  menuSize: number;
}

export interface ThemeMetrics {
  /** Menu bar height in logical pixels */
  menuBarHeight: number;
  /** Title bar height */
  titleBarHeight: number;
  /** Default border width (1px for pixel-perfect) */
  borderWidth: number;
  /** Scrollbar width */
  scrollbarWidth: number;
  /** Close box size (square) in title bar */
  closeBoxSize: number;
  /** Button corner radius for roundRect style */
  buttonBorderRadius: number;
  /** Button internal padding */
  buttonPadding: number;
  /** Classic card width */
  cardWidth: number;
  /** Classic card height */
  cardHeight: number;
  /** Tool palette column count */
  paletteColumns: number;
  /** Tool icon size */
  toolIconSize: number;
  /** Message box height */
  messageBoxHeight: number;
  /** Field scroll arrow size */
  fieldScrollArrowSize: number;
  /** Shadow offset for shadow-style elements */
  shadowOffset: number;
  /** Line height multiplier for text */
  lineHeight: number;
}

export interface ThemeCursors {
  /** Browse tool hand cursor */
  browse: CursorDef;
  /** I-beam for text fields */
  ibeam: CursorDef;
  /** Crosshair for paint tools */
  crosshair: CursorDef;
  /** Watch for wait/loading */
  watch: CursorDef;
  /** Arrow for general pointing */
  arrow: CursorDef;
}

export interface CursorDef {
  /** CSS cursor value or 'custom' */
  css: string;
  /** Hot spot x (for custom cursors) */
  hotX: number;
  /** Hot spot y (for custom cursors) */
  hotY: number;
}

/**
 * A fill pattern is an 8x8 1-bit bitmap, stored as 8 bytes.
 * Each byte represents one row: bit 7 = leftmost pixel.
 */
export type FillPattern = [number, number, number, number, number, number, number, number];

export interface Theme {
  /** Theme identifier */
  name: "classic" | "v3";
  /** Display name for UI */
  displayName: string;
  /** Color palette */
  colors: ThemeColors;
  /** Font definitions */
  fonts: ThemeFonts;
  /** Measurement/spacing values */
  metrics: ThemeMetrics;
  /** Cursor definitions */
  cursors: ThemeCursors;
  /** Fill patterns (40 classic patterns; null if not applicable) */
  patterns: FillPattern[] | null;
  /** Whether to draw title bar horizontal line pattern */
  titleBarLines: boolean;
  /** Whether buttons invert (fill black) on click vs color highlight */
  buttonInvertOnClick: boolean;
}
