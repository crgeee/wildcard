/**
 * Touch handler — maps touch events to mouse events.
 *
 * Single touch -> mouse events (mouseDown/mouseMove/mouseUp)
 * Two-finger touch -> pinch-to-zoom
 * Long press -> context menu (right-click equivalent)
 *
 * This enables the full HyperCard experience on touch devices
 * using the same interaction model as desktop.
 */

export interface TouchPoint {
  x: number;
  y: number;
  id: number;
}

const LONG_PRESS_THRESHOLD = 500; // ms

export class TouchHandler {
  private _lastX = 0;
  private _lastY = 0;
  private _isPinching = false;
  private _pinchStartDistance = 0;
  private _currentPinchDistance = 0;
  private _activeTouches: TouchPoint[] = [];
  private _longPressTimer: ReturnType<typeof setTimeout> | null = null;

  /** Callbacks (same as mouse handler for unified input) */
  onMouseDown: ((x: number, y: number) => void) | null = null;
  onMouseUp: ((x: number, y: number) => void) | null = null;
  onMouseMove: ((x: number, y: number) => void) | null = null;
  onPinchStart: (() => void) | null = null;
  onPinchMove: ((scale: number, centerX: number, centerY: number) => void) | null = null;
  onPinchEnd: (() => void) | null = null;
  onLongPress: ((x: number, y: number) => void) | null = null;

  get lastX(): number {
    return this._lastX;
  }

  get lastY(): number {
    return this._lastY;
  }

  get isPinching(): boolean {
    return this._isPinching;
  }

  get pinchStartDistance(): number {
    return this._pinchStartDistance;
  }

  get pinchScale(): number {
    if (this._pinchStartDistance === 0) return 1;
    return this._currentPinchDistance / this._pinchStartDistance;
  }

  handleTouchStart(touches: TouchPoint[]): void {
    this._activeTouches = touches;
    this._cancelLongPress();

    if (touches.length === 1) {
      // Single touch -> mouse down
      this._lastX = touches[0].x;
      this._lastY = touches[0].y;
      this._isPinching = false;

      if (this.onMouseDown) {
        this.onMouseDown(touches[0].x, touches[0].y);
      }

      // Start long press timer
      this._longPressTimer = setTimeout(() => {
        if (this.onLongPress) {
          this.onLongPress(this._lastX, this._lastY);
        }
      }, LONG_PRESS_THRESHOLD);
    } else if (touches.length === 2) {
      // Two fingers -> pinch
      this._isPinching = true;
      this._pinchStartDistance = this._distance(touches[0], touches[1]);
      this._currentPinchDistance = this._pinchStartDistance;

      if (this.onPinchStart) {
        this.onPinchStart();
      }
    }
  }

  handleTouchMove(touches: TouchPoint[]): void {
    this._activeTouches = touches;
    this._cancelLongPress(); // Movement cancels long press

    if (this._isPinching && touches.length === 2) {
      this._currentPinchDistance = this._distance(touches[0], touches[1]);
      const centerX = (touches[0].x + touches[1].x) / 2;
      const centerY = (touches[0].y + touches[1].y) / 2;

      if (this.onPinchMove) {
        this.onPinchMove(this.pinchScale, centerX, centerY);
      }
    } else if (touches.length === 1 && !this._isPinching) {
      this._lastX = touches[0].x;
      this._lastY = touches[0].y;

      if (this.onMouseMove) {
        this.onMouseMove(touches[0].x, touches[0].y);
      }
    }
  }

  handleTouchEnd(remainingTouches: TouchPoint[]): void {
    this._cancelLongPress();

    if (this._isPinching) {
      if (remainingTouches.length < 2) {
        this._isPinching = false;
        if (this.onPinchEnd) {
          this.onPinchEnd();
        }
      }
    } else if (remainingTouches.length === 0) {
      if (this.onMouseUp) {
        this.onMouseUp(this._lastX, this._lastY);
      }
    }

    this._activeTouches = remainingTouches;
  }

  /**
   * Attach DOM touch event listeners to a canvas element.
   */
  attachToCanvas(
    canvas: HTMLCanvasElement,
    screenToLogical: (sx: number, sy: number) => { x: number; y: number },
  ): () => void {
    const getTouches = (e: TouchEvent): TouchPoint[] => {
      const points: TouchPoint[] = [];
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        const pos = screenToLogical(t.clientX, t.clientY);
        points.push({ x: pos.x, y: pos.y, id: t.identifier });
      }
      return points;
    };

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      this.handleTouchStart(getTouches(e));
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      this.handleTouchMove(getTouches(e));
    };

    const onEnd = (e: TouchEvent) => {
      e.preventDefault();
      this.handleTouchEnd(getTouches(e));
    };

    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd, { passive: false });
    canvas.addEventListener("touchcancel", onEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
      canvas.removeEventListener("touchcancel", onEnd);
    };
  }

  private _distance(a: TouchPoint, b: TouchPoint): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private _cancelLongPress(): void {
    if (this._longPressTimer !== null) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }
}
