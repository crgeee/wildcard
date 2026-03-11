/**
 * Spray can tool — sprays random dots in a circular area.
 *
 * Classic HyperCard spray pattern: random dots within a radius,
 * density increases the longer you hold.
 */

import type { Tool, ToolEvent, ToolOverlay, ToolCategory, PaintConfig } from "./tool";
import type { Theme } from "../theme";
import type { CardCanvas } from "../components/card";

const SPRAY_RADIUS = 12;
const SPRAY_DENSITY = 8; // dots per frame

export class SprayTool implements Tool {
  readonly name = "spray" as const;
  readonly displayName = "Spray";
  readonly category: ToolCategory = "paint";
  readonly cursor = "crosshair";

  private _canvas: CardCanvas | null = null;
  private _config: PaintConfig | null = null;
  private _isSpraying = false;
  private _x = 0;
  private _y = 0;
  private _intervalId: ReturnType<typeof setInterval> | null = null;

  activate(canvas: CardCanvas, _theme: Theme, config: PaintConfig): void {
    this._canvas = canvas;
    this._config = config;
  }

  deactivate(): void {
    this._stopSpray();
    this._canvas = null;
    this._config = null;
  }

  onMouseDown(event: ToolEvent): void {
    this._isSpraying = true;
    this._x = event.x;
    this._y = event.y;
    this._sprayDots();
    this._startSpray();
  }

  onMouseMove(event: ToolEvent): void {
    if (!this._isSpraying) return;
    this._x = event.x;
    this._y = event.y;
  }

  onMouseUp(_event: ToolEvent): void {
    this._isSpraying = false;
    this._stopSpray();
  }

  getOverlay(): ToolOverlay | null {
    return null;
  }

  private _startSpray(): void {
    this._stopSpray();
    this._intervalId = setInterval(() => {
      if (this._isSpraying) {
        this._sprayDots();
      }
    }, 50);
  }

  private _stopSpray(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  private _sprayDots(): void {
    if (!this._canvas) return;

    for (let i = 0; i < SPRAY_DENSITY; i++) {
      // Random point within circle
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * SPRAY_RADIUS;
      const dx = Math.round(Math.cos(angle) * radius);
      const dy = Math.round(Math.sin(angle) * radius);
      this._canvas.setPixel(this._x + dx, this._y + dy, 0, 0, 0, 255);
    }
  }
}
