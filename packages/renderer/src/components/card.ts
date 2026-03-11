/**
 * Card canvas component — the main area for displaying and editing cards.
 *
 * Manages:
 * - Card at 512x342 logical pixels (classic HyperCard resolution)
 * - Object collection (buttons and fields) with z-ordering
 * - Hit-testing objects front-to-back
 * - Paint data layer (bitmap for paint tools)
 * - Dirty region tracking for efficient repainting
 * - Background layer caching
 */

import type { Theme } from "../theme";
import type { WildCardObject, Rect } from "@wildcard/types";

export interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CardCanvas {
  private _theme: Theme;
  private _objects: WildCardObject[] = [];
  private _dirty = true;
  private _dirtyRegions: DirtyRect[] = [];
  private _paintData: ImageData | null = null;

  constructor(theme: Theme) {
    this._theme = theme;
  }

  get width(): number {
    return this._theme.metrics.cardWidth;
  }

  get height(): number {
    return this._theme.metrics.cardHeight;
  }

  get isDirty(): boolean {
    return this._dirty || this._dirtyRegions.length > 0;
  }

  get objects(): readonly WildCardObject[] {
    return this._objects;
  }

  setTheme(theme: Theme): void {
    this._theme = theme;
    this._dirty = true;
  }

  setObjects(objects: WildCardObject[]): void {
    this._objects = objects;
    this._dirty = true;
  }

  markDirty(region: DirtyRect): void {
    this._dirtyRegions.push(region);
    this._dirty = true;
  }

  markFullDirty(): void {
    this._dirty = true;
  }

  clearDirty(): void {
    this._dirty = false;
    this._dirtyRegions = [];
  }

  consumeDirtyRegions(): DirtyRect[] {
    if (this._dirty) {
      this._dirty = false;
      this._dirtyRegions = [];
      return [{ x: 0, y: 0, width: this.width, height: this.height }];
    }
    const regions = [...this._dirtyRegions];
    this._dirtyRegions = [];
    return regions;
  }

  /**
   * Hit-test objects at a given point. Returns the top-most (last in array)
   * visible object that contains the point, or null.
   */
  hitTest(x: number, y: number): WildCardObject | null {
    // Iterate in reverse order (front to back)
    for (let i = this._objects.length - 1; i >= 0; i--) {
      const obj = this._objects[i];
      if (!obj.visible) continue;
      const r = obj.rect;
      if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) {
        return obj;
      }
    }
    return null;
  }

  /** Get the paint data ImageData (for paint tools). Creates on first access. */
  getPaintData(width?: number, height?: number): ImageData {
    if (!this._paintData) {
      const w = width ?? this.width;
      const h = height ?? this.height;
      this._paintData = new ImageData(w, h);
    }
    return this._paintData;
  }

  /** Set paint data from an existing ImageData (e.g., loaded from a card) */
  setPaintData(data: ImageData): void {
    this._paintData = data;
    this._dirty = true;
  }

  /** Clear paint data */
  clearPaintData(): void {
    this._paintData = null;
    this._dirty = true;
  }

  /**
   * Set a pixel in the paint data.
   * In classic mode, only black (1) or white (0).
   */
  setPixel(x: number, y: number, r: number, g: number, b: number, a: number = 255): void {
    const data = this.getPaintData();
    if (x < 0 || x >= data.width || y < 0 || y >= data.height) return;
    const i = (y * data.width + x) * 4;
    data.data[i] = r;
    data.data[i + 1] = g;
    data.data[i + 2] = b;
    data.data[i + 3] = a;
    this.markDirty({ x, y, width: 1, height: 1 });
  }

  /** Get a pixel color from the paint data. Returns [r, g, b, a]. */
  getPixel(x: number, y: number): [number, number, number, number] {
    const data = this.getPaintData();
    if (x < 0 || x >= data.width || y < 0 || y >= data.height) return [0, 0, 0, 0];
    const i = (y * data.width + x) * 4;
    return [data.data[i], data.data[i + 1], data.data[i + 2], data.data[i + 3]];
  }
}
