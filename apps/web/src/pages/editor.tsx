import { useRef, useEffect } from "preact/hooks";
import { WildCardCanvas, RenderLoop, classicTheme, createWildCardApp } from "@wildcard/renderer";

/**
 * Editor page — the main WildCard authoring environment.
 *
 * Mounts a canvas and initializes the renderer + engine bridge.
 * No account needed; stacks are saved to localStorage.
 */
export function EditorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initialized.current) return;
    initialized.current = true;

    const container = containerRef.current;
    const theme = classicTheme;

    // Create the canvas at classic HyperCard resolution
    const wcCanvas = new WildCardCanvas({
      container,
      logicalWidth: 512,
      logicalHeight: 342,
      theme,
    });

    const renderLoop = new RenderLoop(wcCanvas.ctx, theme);

    // Try to load the WASM engine and wire everything together.
    // If the engine isn't available yet (dev mode), the canvas still renders.
    createWildCardApp({ renderer: renderLoop, theme })
      .then((app) => {
        // Try to restore from localStorage
        const saved = localStorage.getItem("wildcard-stack");
        if (saved) {
          app.loadStack(saved);
        } else {
          app.newStack("Untitled");
        }

        renderLoop.start();
      })
      .catch(() => {
        // Engine not available — start the render loop anyway
        // so the user sees the canvas chrome (menu bar, etc.)
        renderLoop.start();
      });

    return () => {
      renderLoop.stop();
    };
  }, []);

  return <div class="wc-editor" ref={containerRef} />;
}
