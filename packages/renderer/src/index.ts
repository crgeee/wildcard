export const VERSION = "0.0.1";

// Theme system
export type { Theme, ThemeColors, ThemeFonts, ThemeMetrics, ThemeCursors, CursorDef, FillPattern } from "./theme";
export { classicTheme } from "./themes/classic";
export { v3Theme } from "./themes/v3";

// Canvas
export { WildCardCanvas } from "./canvas";
export type { CanvasConfig, DirtyRegion } from "./canvas";

// Components
export { MenuBar } from "./components/menubar";
export type { MenuDef, MenuItemDef } from "./components/menubar";
export { WindowChrome } from "./components/window";
export { TitleBar } from "./components/titlebar";
export { CardCanvas } from "./components/card";
export { ButtonRenderer } from "./components/button";
export { FieldRenderer } from "./components/field";
export { ToolPalette } from "./components/palette";
export { ScriptEditor } from "./components/script-editor";
export { MessageBox } from "./components/message-box";

// Render loop
export { RenderLoop } from "./render-loop";
export type { RenderState } from "./render-loop";

// Engine bridge
export { EngineBridge, WildCardApp, createWildCardApp, parseEngineEvents, extractWaitSeconds, safeParseArray, parseEngineResponse } from "./bridge";
export type { IWildCardEngine, EngineFactory, CreateAppOptions } from "./bridge";

// Tools
export type { Tool, ToolEvent, ToolName } from "./tools/tool";
export { BrowseTool } from "./tools/browse";
export { ButtonTool } from "./tools/button-tool";
export { FieldTool } from "./tools/field-tool";
export { SelectTool } from "./tools/select";
export { LassoTool } from "./tools/lasso";
export { PencilTool } from "./tools/pencil";
export { BrushTool } from "./tools/brush";
export { EraserTool } from "./tools/eraser";
export { LineTool } from "./tools/line";
export { SprayTool } from "./tools/spray";
export { RectTool } from "./tools/rect";
export { RoundRectTool } from "./tools/round-rect";
export { BucketTool } from "./tools/bucket";
export { OvalTool } from "./tools/oval";
export { CurveTool } from "./tools/curve";
export { RegularPolygonTool } from "./tools/regular-polygon";
export { TextTool } from "./tools/text";

// Input handlers
export { TouchHandler } from "./input/touch";
export { MouseHandler } from "./input/mouse";
export { KeyboardHandler } from "./input/keyboard";

// Layout
export { ResponsiveLayout } from "./layout/responsive";
