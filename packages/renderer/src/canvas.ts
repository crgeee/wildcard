/**
 * Canvas setup and management for WildCard renderer.
 *
 * Everything is drawn to <canvas> — no DOM for the HyperCard UI.
 * The canvas uses a logical resolution of 512x342 (classic HyperCard)
 * and scales to the viewport with nearest-neighbor upscaling for crisp pixels.
 *
 * Manages:
 * - Canvas element creation and sizing
 * - Device pixel ratio handling
 * - Nearest-neighbor scaling for pixel-perfect rendering
 * - Dirty region tracking for efficient repainting
 */

import type { Theme } from "./theme";
import type { Rect } from "@wildcard/types";

export interface CanvasConfig {
  /** Container element to mount the canvas into (or null for offscreen) */
  container: HTMLElement | null;
  /** Logical width (512 for classic) */
  logicalWidth: number;
  /** Logical height (342 for classic, + menu bar + message box) */
  logicalHeight: number;
  /** Active theme */
  theme: Theme;
}

export interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * WildCardCanvas: manages the HTML canvas and provides drawing context
 * at logical (non-scaled) resolution. All drawing operations use logical pixels.
 */
export class WildCardCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly logicalWidth: number;
  readonly logicalHeight: number;
  private _theme: Theme;
  private _dirtyRegions: DirtyRegion[] = [];
  private _fullRepaint = true;
  private _scale = 1;

  /** Offscreen buffer for layer caching (background, card paint, objects) */
  private _bgBuffer: OffscreenCanvas | null = null;
  private _bgCtx: OffscreenCanvasRenderingContext2D | null = null;

  constructor(config: CanvasConfig) {
    this.logicalWidth = config.logicalWidth;
    this.logicalHeight = config.logicalHeight;
    this._theme = config.theme;

    this.canvas = document.createElement("canvas");
    this.canvas.style.imageRendering = "pixelated"; // nearest-neighbor upscale
    this.canvas.style.imageRendering = "-moz-crisp-edges";
    this.canvas.width = this.logicalWidth;
    this.canvas.height = this.logicalHeight;

    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("Failed to get 2D rendering context");
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false; // crisp pixel scaling

    if (config.container) {
      config.container.appendChild(this.canvas);
      this._fitToContainer(config.container);
    }

    // Create offscreen buffer for background caching
    if (typeof OffscreenCanvas !== "undefined") {
      this._bgBuffer = new OffscreenCanvas(this.logicalWidth, this.logicalHeight);
      const bgCtx = this._bgBuffer.getContext("2d");
      if (bgCtx) {
        this._bgCtx = bgCtx;
        this._bgCtx.imageSmoothingEnabled = false;
      }
    }
  }

  get theme(): Theme {
    return this._theme;
  }

  setTheme(theme: Theme): void {
    this._theme = theme;
    this.markFullRepaint();
  }

  get scale(): number {
    return this._scale;
  }

  /** Mark a logical region as needing repaint */
  markDirty(region: DirtyRegion): void {
    this._dirtyRegions.push(region);
  }

  /** Mark entire canvas for repaint */
  markFullRepaint(): void {
    this._fullRepaint = true;
  }

  /** Returns true if any region needs repainting */
  needsRepaint(): boolean {
    return this._fullRepaint || this._dirtyRegions.length > 0;
  }

  /** Get and clear dirty regions. If full repaint, returns single full-canvas region. */
  consumeDirtyRegions(): DirtyRegion[] {
    if (this._fullRepaint) {
      this._fullRepaint = false;
      this._dirtyRegions = [];
      return [{ x: 0, y: 0, width: this.logicalWidth, height: this.logicalHeight }];
    }
    const regions = this._dirtyRegions;
    this._dirtyRegions = [];
    return regions;
  }

  /** Get the offscreen background buffer context (for layer caching) */
  getBackgroundCtx(): OffscreenCanvasRenderingContext2D | null {
    return this._bgCtx;
  }

  /** Blit the background buffer to the main canvas */
  blitBackground(): void {
    if (this._bgBuffer) {
      this.ctx.drawImage(this._bgBuffer, 0, 0);
    }
  }

  /** Scale canvas to fit container while maintaining logical resolution */
  private _fitToContainer(container: HTMLElement): void {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scaleX = containerWidth / this.logicalWidth;
    const scaleY = containerHeight / this.logicalHeight;
    this._scale = Math.min(scaleX, scaleY);

    // Scale via CSS — keep canvas at logical resolution, upscale with CSS
    const displayWidth = Math.floor(this.logicalWidth * this._scale);
    const displayHeight = Math.floor(this.logicalHeight * this._scale);
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
  }

  /** Convert a screen (CSS pixel) coordinate to logical coordinate */
  screenToLogical(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: Math.floor((screenX - rect.left) / this._scale),
      y: Math.floor((screenY - rect.top) / this._scale),
    };
  }

  /** Convert a logical coordinate to screen (CSS pixel) coordinate */
  logicalToScreen(logicalX: number, logicalY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: Math.floor(logicalX * this._scale) + rect.left,
      y: Math.floor(logicalY * this._scale) + rect.top,
    };
  }

  /** Test if a logical point is within a rect */
  hitTest(x: number, y: number, rect: Rect): boolean {
    return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
  }

  /** Resize to fit new container dimensions */
  resize(container: HTMLElement): void {
    this._fitToContainer(container);
    this.markFullRepaint();
  }

  /** Clear the entire canvas with the theme background color */
  clear(): void {
    this.ctx.fillStyle = this._theme.colors.background;
    this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
  }

  /** Draw a 1px border rectangle (System 7 style) */
  strokeRect(x: number, y: number, w: number, h: number, color?: string): void {
    this.ctx.strokeStyle = color ?? this._theme.colors.foreground;
    this.ctx.lineWidth = 1;
    // Canvas strokes on the center of the pixel, offset by 0.5 for crisp 1px lines
    this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  /** Draw filled rectangle */
  fillRect(x: number, y: number, w: number, h: number, color?: string): void {
    this.ctx.fillStyle = color ?? this._theme.colors.foreground;
    this.ctx.fillRect(x, y, w, h);
  }

  /** Draw text at a position using the system font */
  drawText(text: string, x: number, y: number, color?: string, font?: string): void {
    this.ctx.fillStyle = color ?? this._theme.colors.foreground;
    this.ctx.font = font ?? `${this._theme.fonts.systemSize}px ${this._theme.fonts.system}`;
    this.ctx.textBaseline = "top";
    this.ctx.fillText(text, x, y);
  }

  /** Measure text width */
  measureText(text: string, font?: string): number {
    this.ctx.font = font ?? `${this._theme.fonts.systemSize}px ${this._theme.fonts.system}`;
    return this.ctx.measureText(text).width;
  }

  /**
   * Draw a fill pattern into a rectangle.
   * Uses the theme's 8x8 1-bit pattern data.
   */
  fillPattern(x: number, y: number, w: number, h: number, patternIndex: number): void {
    const patterns = this._theme.patterns;
    if (!patterns || patternIndex < 0 || patternIndex >= patterns.length) return;

    const pattern = patterns[patternIndex];
    const fg = this._theme.colors.foreground;
    const bg = this._theme.colors.background;

    for (let py = 0; py < h; py++) {
      const row = pattern[(y + py) & 7];
      for (let px = 0; px < w; px++) {
        const bit = (row >> (7 - ((x + px) & 7))) & 1;
        this.ctx.fillStyle = bit ? fg : bg;
        this.ctx.fillRect(x + px, y + py, 1, 1);
      }
    }
  }

  /** Draw a 1px horizontal line */
  drawHLine(x: number, y: number, width: number, color?: string): void {
    this.ctx.fillStyle = color ?? this._theme.colors.foreground;
    this.ctx.fillRect(x, y, width, 1);
  }

  /** Draw a 1px vertical line */
  drawVLine(x: number, y: number, height: number, color?: string): void {
    this.ctx.fillStyle = color ?? this._theme.colors.foreground;
    this.ctx.fillRect(x, y, 1, height);
  }
}
