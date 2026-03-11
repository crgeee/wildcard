import { useRef, useEffect, useState } from "preact/hooks";
import {
  WildCardCanvas,
  RenderLoop,
  classicTheme,
  createWildCardApp,
  MouseHandler,
  KeyboardHandler,
  TouchHandler,
  ResponsiveLayout,
  BrowseTool,
  MessageBox,
  drawMessageBox,
  defaultPaintConfig,
} from "@wildcard/renderer";
import type { WildCardApp } from "@wildcard/renderer";

/**
 * Player page -- read-only stack viewer.
 *
 * Loads a stack from one of three sources:
 * 1. URL path parameter: /play/:id (loads from localStorage by stack id)
 * 2. Query parameter: /play?stack=<base64-encoded JSON>
 * 3. Fallback: loads the most recently saved stack from localStorage
 *
 * Renders in browse-only mode (user level 1) without tool palette.
 */
export function PlayerPage({ id }: { id?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || initialized.current) return;
    initialized.current = true;

    const container = containerRef.current;

    // ---------------------------------------------------------------
    // 1. Resolve stack JSON from available sources
    // ---------------------------------------------------------------
    let stackJson: string | null = null;

    // Source A: query parameter ?stack=<base64>
    try {
      const params = new URLSearchParams(window.location.search);
      const b64 = params.get("stack");
      if (b64) {
        stackJson = atob(b64);
      }
    } catch {
      // Invalid base64 -- fall through
    }

    // Source B: URL path parameter /play/:id -- load from localStorage
    if (!stackJson && id) {
      const raw = localStorage.getItem(`wildcard:stack:${id}`);
      if (raw) {
        try {
          const envelope = JSON.parse(raw);
          stackJson = JSON.stringify(envelope.stack ?? envelope);
        } catch {
          // Corrupted data
        }
      }
    }

    // Source C: fallback to the legacy auto-save key
    if (!stackJson) {
      stackJson = localStorage.getItem("wildcard-stack");
    }

    if (!stackJson) {
      setError("No stack found. Create one in the editor first.");
      return;
    }

    // Validate it parses
    try {
      JSON.parse(stackJson);
    } catch {
      setError("Invalid stack data.");
      return;
    }

    // ---------------------------------------------------------------
    // 2. Set up canvas (no tool palette, browse-only)
    // ---------------------------------------------------------------
    const theme = classicTheme;

    const wcCanvas = new WildCardCanvas({
      container,
      logicalWidth: 512,
      logicalHeight: 342,
      theme,
    });

    const renderLoop = new RenderLoop(wcCanvas.ctx, theme);
    // User level 1 = browse only
    renderLoop.setState({ userLevel: 1 });

    const messageBox = new MessageBox(theme);
    const browseTool = new BrowseTool();
    const paintConfig = defaultPaintConfig();
    browseTool.activate(renderLoop.cardCanvas, theme, paintConfig);

    // ---------------------------------------------------------------
    // 3. Input handlers (browse only)
    // ---------------------------------------------------------------
    const mouseHandler = new MouseHandler();
    const keyboardHandler = new KeyboardHandler();
    const touchHandler = new TouchHandler();
    const responsiveLayout = new ResponsiveLayout(theme);

    let appRef: WildCardApp | null = null;
    const menuBarHeight = theme.metrics.menuBarHeight;

    function goNextCard() {
      if (!appRef?.stack) return;
      const next = Math.min(appRef.currentCardIndex + 1, appRef.stack.cards.length - 1);
      appRef.goToCard(next);
      updatePlayerTitle();
    }

    function goPrevCard() {
      if (!appRef) return;
      const prev = Math.max(appRef.currentCardIndex - 1, 0);
      appRef.goToCard(prev);
      updatePlayerTitle();
    }

    function updatePlayerTitle() {
      if (appRef?.stack) {
        const name = appRef.stack.name || "Untitled";
        const cardNum = appRef.currentCardIndex + 1;
        const total = appRef.stack.cards.length;
        document.title = `${name} \u2014 Card ${cardNum} of ${total}`;
      }
    }

    mouseHandler.onMouseDown = (x, y, button) => {
      // Skip menu bar area clicks
      if (y < menuBarHeight) return;

      const cardY = y - menuBarHeight;
      browseTool.onMouseDown({
        x,
        y: cardY,
        shiftKey: keyboardHandler.shiftKey,
        optionKey: keyboardHandler.optionKey,
        commandKey: keyboardHandler.commandKey,
        button,
      });
      renderLoop.dispatchInputEvent({ type: "mouseDown" });
    };

    mouseHandler.onMouseUp = (x, y, button) => {
      const cardY = y - menuBarHeight;
      browseTool.onMouseUp({
        x,
        y: cardY,
        shiftKey: keyboardHandler.shiftKey,
        optionKey: keyboardHandler.optionKey,
        commandKey: keyboardHandler.commandKey,
        button,
      });
      renderLoop.dispatchInputEvent({ type: "mouseUp" });
    };

    mouseHandler.onMouseMove = (x, y) => {
      const cardY = y - menuBarHeight;
      browseTool.onMouseMove({
        x,
        y: cardY,
        shiftKey: keyboardHandler.shiftKey,
        optionKey: keyboardHandler.optionKey,
        commandKey: keyboardHandler.commandKey,
        button: 0,
      });
    };

    keyboardHandler.onKeyDown = (key) => {
      switch (key) {
        case "ArrowLeft":
          goPrevCard();
          return;
        case "ArrowRight":
          goNextCard();
          return;
      }
      renderLoop.dispatchInputEvent({ type: "keyDown" });
    };

    touchHandler.onMouseDown = (x, y) => mouseHandler.handleMouseDown(x, y, 0);
    touchHandler.onMouseUp = (x, y) => mouseHandler.handleMouseUp(x, y, 0);
    touchHandler.onMouseMove = (x, y) => mouseHandler.handleMouseMove(x, y);

    // ---------------------------------------------------------------
    // 4. Attach DOM listeners
    // ---------------------------------------------------------------
    const screenToLogical = (sx: number, sy: number) => wcCanvas.screenToLogical(sx, sy);
    const detachMouse = mouseHandler.attachToCanvas(wcCanvas.canvas, screenToLogical);
    const detachKeyboard = keyboardHandler.attachToWindow();
    const detachTouch = touchHandler.attachToCanvas(wcCanvas.canvas, screenToLogical);

    const initialLayout = responsiveLayout.computeLayout(
      container.clientWidth,
      container.clientHeight,
    );
    void initialLayout; // used for side effect

    const detachResize = responsiveLayout.observeResize(container, wcCanvas.canvas, () => {
      // No tool palette in player mode
    });

    // ---------------------------------------------------------------
    // 5. Extra UI rendering (message box only in player)
    // ---------------------------------------------------------------
    let extraRafId: number | null = null;

    function extraRenderTick() {
      if (renderLoop.isRunning) {
        const ctx = wcCanvas.ctx;
        drawMessageBox(ctx, theme, messageBox, wcCanvas.logicalHeight);
        extraRafId = requestAnimationFrame(extraRenderTick);
      }
    }

    // ---------------------------------------------------------------
    // 6. Initialize engine and load stack
    // ---------------------------------------------------------------
    const resolvedJson = stackJson;

    createWildCardApp({ renderer: renderLoop, messageBox, theme })
      .then((app) => {
        appRef = app;
        app.setMessageBox(messageBox);

        const loaded = app.loadStack(resolvedJson);
        if (!loaded) {
          setError("Failed to load stack into engine.");
          return;
        }

        updatePlayerTitle();
        renderLoop.start();
        extraRafId = requestAnimationFrame(extraRenderTick);
      })
      .catch(() => {
        // Engine not available -- still try to render card statically
        renderLoop.start();
        extraRafId = requestAnimationFrame(extraRenderTick);
      });

    // ---------------------------------------------------------------
    // 7. Cleanup
    // ---------------------------------------------------------------
    return () => {
      renderLoop.stop();
      if (extraRafId !== null) cancelAnimationFrame(extraRafId);
      detachMouse();
      detachKeyboard();
      detachTouch();
      detachResize();
      browseTool.deactivate();
    };
  }, [id]);

  if (error) {
    return (
      <div class="wc-player">
        <p class="wc-player-error">{error}</p>
        <p>
          <a href="/">Go to Editor</a>
        </p>
      </div>
    );
  }

  return <div class="wc-player" ref={containerRef} />;
}
