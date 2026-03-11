/**
 * Bucket (paint bucket / flood fill) tool.
 *
 * Flood-fills a contiguous region of the same color with the current
 * foreground color/pattern. Uses scanline flood fill algorithm.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

export class BucketTool implements Tool {
  readonly name = "bucket" as const;
  readonly displayName = "Bucket";
  readonly category: ToolCategory = "paint";
  readonly cursor = "crosshair";

  private _canvas: CardCanvas | null = null;
  private _config: PaintConfig | null = null;

  activate(canvas: CardCanvas, _theme: Theme, config: PaintConfig): void {
    this._canvas = canvas;
    this._config = config;
  }

  deactivate(): void {
    this._canvas = null;
    this._config = null;
  }

  onMouseDown(event: ToolEvent): void {
    if (!this._canvas) return;
    this._floodFill(event.x, event.y);
  }

  onMouseMove(_event: ToolEvent): void {
    // No drag behavior for bucket tool
  }

  onMouseUp(_event: ToolEvent): void {
    // No-op
  }

  getOverlay(): ToolOverlay | null {
    return null;
  }

  /** Scanline flood fill algorithm */
  private _floodFill(startX: number, startY: number): void {
    if (!this._canvas) return;

    const data = this._canvas.getPaintData();
    const width = data.width;
    const height = data.height;

    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const targetColor = this._getColor(data, startX, startY);
    const fillR = 0;
    const fillG = 0;
    const fillB = 0;
    const fillA = 255;

    // Don't fill if target is already the fill color
    if (
      targetColor[0] === fillR &&
      targetColor[1] === fillG &&
      targetColor[2] === fillB &&
      targetColor[3] === fillA
    ) {
      return;
    }

    const stack: Array<[number, number]> = [[startX, startY]];
    const visited = new Uint8Array(width * height);

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const idx = y * width + x;
      if (visited[idx]) continue;

      const color = this._getColor(data, x, y);
      if (!this._colorsMatch(color, targetColor)) continue;

      visited[idx] = 1;
      this._setColor(data, x, y, fillR, fillG, fillB, fillA);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    this._canvas.markDirty({ x: 0, y: 0, width, height });
  }

  private _getColor(
    data: ImageData,
    x: number,
    y: number,
  ): [number, number, number, number] {
    const i = (y * data.width + x) * 4;
    return [data.data[i], data.data[i + 1], data.data[i + 2], data.data[i + 3]];
  }

  private _setColor(
    data: ImageData,
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): void {
    const i = (y * data.width + x) * 4;
    data.data[i] = r;
    data.data[i + 1] = g;
    data.data[i + 2] = b;
    data.data[i + 3] = a;
  }

  private _colorsMatch(
    a: [number, number, number, number],
    b: [number, number, number, number],
  ): boolean {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }
}
