/**
 * Responsive layout — scales the canvas to the viewport.
 *
 * - Logical resolution: 512x342 (classic HyperCard card area)
 * - Full canvas: 512 x (342 + menu bar + message box)
 * - Scales to viewport with nearest-neighbor upscale for crisp pixels
 * - Detects mobile vs desktop for tool palette mode
 * - On mobile: tool palette becomes a bottom drawer
 */

import type { Theme } from "../theme";

const MOBILE_BREAKPOINT = 768;

export interface LayoutResult {
  /** Logical canvas width (always 512 in classic) */
  canvasWidth: number;
  /** Logical canvas height (card + menu bar + message box) */
  canvasHeight: number;
  /** Scale factor from logical to display pixels */
  scale: number;
  /** Display width in CSS pixels */
  displayWidth: number;
  /** Display height in CSS pixels */
  displayHeight: number;
  /** Offset X to center canvas in viewport */
  offsetX: number;
  /** Offset Y to center canvas in viewport */
  offsetY: number;
  /** Whether this is a mobile layout */
  isMobile: boolean;
  /** Tool palette mode */
  toolPaletteMode: "floating" | "drawer";
  /** CSS image-rendering value */
  imageRendering: string;
}

export class ResponsiveLayout {
  private _theme: Theme;

  constructor(theme: Theme) {
    this._theme = theme;
  }

  get imageRendering(): string {
    return "pixelated";
  }

  setTheme(theme: Theme): void {
    this._theme = theme;
  }

  /**
   * Compute layout for a given viewport size.
   */
  computeLayout(viewportWidth: number, viewportHeight: number): LayoutResult {
    const cardW = this._theme.metrics.cardWidth;
    const cardH = this._theme.metrics.cardHeight;
    const menuH = this._theme.metrics.menuBarHeight;
    const msgH = this._theme.metrics.messageBoxHeight;

    // Total logical canvas size
    const canvasWidth = cardW;
    const canvasHeight = cardH + menuH + msgH;

    // Compute integer scale factor (nearest-neighbor = integer multiples for crispness)
    const scaleX = viewportWidth / canvasWidth;
    const scaleY = viewportHeight / canvasHeight;
    let scale = Math.min(scaleX, scaleY);

    // For very large screens, use integer scaling for maximum crispness
    if (scale >= 2) {
      scale = Math.floor(scale);
    }

    // Ensure minimum scale of 0.5 for very small screens
    scale = Math.max(0.5, scale);

    const displayWidth = Math.floor(canvasWidth * scale);
    const displayHeight = Math.floor(canvasHeight * scale);

    // Center in viewport
    const offsetX = Math.floor((viewportWidth - displayWidth) / 2);
    const offsetY = Math.floor((viewportHeight - displayHeight) / 2);

    const isMobile = viewportWidth < MOBILE_BREAKPOINT;

    return {
      canvasWidth,
      canvasHeight,
      scale,
      displayWidth,
      displayHeight,
      offsetX,
      offsetY,
      isMobile,
      toolPaletteMode: isMobile ? "drawer" : "floating",
      imageRendering: "pixelated",
    };
  }

  /**
   * Apply layout to a canvas element and its container.
   */
  applyToCanvas(canvas: HTMLCanvasElement, layout: LayoutResult): void {
    canvas.width = layout.canvasWidth;
    canvas.height = layout.canvasHeight;
    canvas.style.width = `${layout.displayWidth}px`;
    canvas.style.height = `${layout.displayHeight}px`;
    canvas.style.imageRendering = layout.imageRendering;
    (canvas.style as unknown as Record<string, string>)["imageRendering"] = "-moz-crisp-edges";
    canvas.style.position = "absolute";
    canvas.style.left = `${layout.offsetX}px`;
    canvas.style.top = `${layout.offsetY}px`;

    // Disable canvas smoothing
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
    }
  }

  /**
   * Convert a screen (CSS pixel) coordinate to logical canvas coordinate.
   */
  screenToLogical(
    screenX: number,
    screenY: number,
    layout: LayoutResult,
  ): { x: number; y: number } {
    return {
      x: Math.floor((screenX - layout.offsetX) / layout.scale),
      y: Math.floor((screenY - layout.offsetY) / layout.scale),
    };
  }

  /**
   * Attach a resize observer that recomputes layout when viewport changes.
   */
  observeResize(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    onLayoutChange: (layout: LayoutResult) => void,
  ): () => void {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const layout = this.computeLayout(width, height);
        this.applyToCanvas(canvas, layout);
        onLayoutChange(layout);
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }
}
