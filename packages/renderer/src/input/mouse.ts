/**
 * Mouse handler — translates DOM mouse events to logical canvas events.
 *
 * Tracks mouse state, detects double-clicks, and fires callbacks.
 * The renderer converts screen coordinates to logical coordinates
 * before passing them here.
 */

const DOUBLE_CLICK_THRESHOLD = 400; // ms
const DOUBLE_CLICK_DISTANCE = 5; // pixels

export class MouseHandler {
  private _isDown = false;
  private _isDragging = false;
  private _x = 0;
  private _y = 0;
  private _button = 0;
  private _lastClickTime = 0;
  private _lastClickX = 0;
  private _lastClickY = 0;
  private _dragStartX = 0;
  private _dragStartY = 0;

  /** Callbacks */
  onMouseDown: ((x: number, y: number, button: number) => void) | null = null;
  onMouseUp: ((x: number, y: number, button: number) => void) | null = null;
  onMouseMove: ((x: number, y: number) => void) | null = null;
  onDoubleClick: ((x: number, y: number) => void) | null = null;
  onDrag: ((x: number, y: number, dx: number, dy: number) => void) | null = null;

  get isDown(): boolean {
    return this._isDown;
  }

  get isDragging(): boolean {
    return this._isDragging;
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  get button(): number {
    return this._button;
  }

  handleMouseDown(x: number, y: number, button: number): void {
    const now = Date.now();
    const dx = Math.abs(x - this._lastClickX);
    const dy = Math.abs(y - this._lastClickY);
    const timeDelta = now - this._lastClickTime;

    this._isDown = true;
    this._isDragging = false;
    this._x = x;
    this._y = y;
    this._button = button;
    this._dragStartX = x;
    this._dragStartY = y;

    // Detect double-click
    if (timeDelta < DOUBLE_CLICK_THRESHOLD && dx < DOUBLE_CLICK_DISTANCE && dy < DOUBLE_CLICK_DISTANCE) {
      if (this.onDoubleClick) {
        this.onDoubleClick(x, y);
      }
      this._lastClickTime = 0; // reset to prevent triple-click detection
    } else {
      this._lastClickTime = now;
      this._lastClickX = x;
      this._lastClickY = y;
    }

    if (this.onMouseDown) {
      this.onMouseDown(x, y, button);
    }
  }

  handleMouseUp(x: number, y: number, button: number): void {
    this._isDown = false;
    this._isDragging = false;
    this._x = x;
    this._y = y;

    if (this.onMouseUp) {
      this.onMouseUp(x, y, button);
    }
  }

  handleMouseMove(x: number, y: number): void {
    const prevX = this._x;
    const prevY = this._y;
    this._x = x;
    this._y = y;

    if (this._isDown) {
      this._isDragging = true;
      if (this.onDrag) {
        this.onDrag(x, y, x - prevX, y - prevY);
      }
    }

    if (this.onMouseMove) {
      this.onMouseMove(x, y);
    }
  }

  /**
   * Attach DOM event listeners to a canvas element.
   * Converts screen coordinates to logical using the provided converter.
   */
  attachToCanvas(
    canvas: HTMLCanvasElement,
    screenToLogical: (sx: number, sy: number) => { x: number; y: number },
  ): () => void {
    const onDown = (e: MouseEvent) => {
      e.preventDefault();
      const pos = screenToLogical(e.clientX, e.clientY);
      this.handleMouseDown(pos.x, pos.y, e.button);
    };

    const onUp = (e: MouseEvent) => {
      const pos = screenToLogical(e.clientX, e.clientY);
      this.handleMouseUp(pos.x, pos.y, e.button);
    };

    const onMove = (e: MouseEvent) => {
      const pos = screenToLogical(e.clientX, e.clientY);
      this.handleMouseMove(pos.x, pos.y);
    };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);

    // Return cleanup function
    return () => {
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
    };
  }
}
