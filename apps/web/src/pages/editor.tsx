import { useRef, useEffect } from "preact/hooks";
import {
  WildCardCanvas,
  RenderLoop,
  classicTheme,
  v3Theme,
  createWildCardApp,
  MouseHandler,
  KeyboardHandler,
  TouchHandler,
  ToolPalette,
  MessageBox,
  ScriptEditor,
  BrowseTool,
  ButtonTool,
  FieldTool,
  ResponsiveLayout,
  drawPalette,
  drawMessageBox,
  drawScriptEditor,
  defaultPaintConfig,
  createAutoSaver,
} from "@wildcard/renderer";
import type { WildCardApp, ToolName } from "@wildcard/renderer";
import { createButton, createField, createCard } from "@wildcard/types";

const THEME_STORAGE_KEY = "wildcard-theme";

/** Tooltip text for each theme mode. */
const THEME_TOOLTIPS = {
  classic: "Classic: HyperCard 2.4, 1998",
  v3: "3.0: The unreleased version, imagined.",
} as const;

/** Read persisted theme preference, defaulting to classic. */
function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "v3" ? v3Theme : classicTheme;
  } catch {
    return classicTheme;
  }
}

/**
 * Editor page -- the main WildCard authoring environment.
 *
 * Mounts a canvas and initializes the renderer + engine bridge.
 * Wires up mouse, keyboard, and touch input through the renderer's
 * InputHandler, ToolPalette, MenuBar, MessageBox, and ScriptEditor.
 * No account needed; stacks are saved to localStorage.
 */
export function EditorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initialized.current) return;
    initialized.current = true;

    const container = containerRef.current;
    let theme = getStoredTheme();

    // ---------------------------------------------------------------
    // 1. Create canvas and render loop
    // ---------------------------------------------------------------
    const wcCanvas = new WildCardCanvas({
      container,
      logicalWidth: 512,
      logicalHeight: 342,
      theme,
    });

    const renderLoop = new RenderLoop(wcCanvas.ctx, theme);

    // ---------------------------------------------------------------
    // 2. Create UI components
    // ---------------------------------------------------------------
    const toolPalette = new ToolPalette(theme);
    const messageBox = new MessageBox(theme);
    const scriptEditor = new ScriptEditor(theme);
    const responsiveLayout = new ResponsiveLayout(theme);
    const paintConfig = defaultPaintConfig();

    // ---------------------------------------------------------------
    // 3. Create input handlers
    // ---------------------------------------------------------------
    const mouseHandler = new MouseHandler();
    const keyboardHandler = new KeyboardHandler();
    const touchHandler = new TouchHandler();

    // ---------------------------------------------------------------
    // 4. Create tools
    // ---------------------------------------------------------------
    const browseTool = new BrowseTool();
    const buttonTool = new ButtonTool();
    const fieldTool = new FieldTool();

    type ActiveTool = BrowseTool | ButtonTool | FieldTool;
    let activeTool: ActiveTool = browseTool;

    // Activate the browse tool initially
    browseTool.activate(renderLoop.cardCanvas, theme, paintConfig);

    // ---------------------------------------------------------------
    // 5. Auto-save
    // ---------------------------------------------------------------
    let appRef: WildCardApp | null = null;
    const autoSaver = createAutoSaver(500);

    function scheduleAutoSave() {
      if (appRef?.stack) {
        autoSaver.save(appRef.stack);
        // Also save to the legacy key for backwards compat
        try {
          localStorage.setItem("wildcard-stack", JSON.stringify(appRef.stack));
        } catch {
          // localStorage full -- silently ignore
        }
      }
    }

    // ---------------------------------------------------------------
    // 6. Theme switching
    // ---------------------------------------------------------------
    container.title = THEME_TOOLTIPS[theme.name];

    function handleThemeSwitch() {
      if (appRef) {
        const next = appRef.switchTheme();
        theme = next;
        localStorage.setItem(THEME_STORAGE_KEY, next.name);
        container.title = THEME_TOOLTIPS[next.name];
        toolPalette.setTheme(next);
        messageBox.setTheme(next);
        scriptEditor.setTheme(next);
        responsiveLayout.setTheme(next);
      } else {
        const next = theme.name === "classic" ? v3Theme : classicTheme;
        theme = next;
        renderLoop.setState({ theme: next });
        localStorage.setItem(THEME_STORAGE_KEY, next.name);
        container.title = THEME_TOOLTIPS[next.name];
        toolPalette.setTheme(next);
        messageBox.setTheme(next);
        scriptEditor.setTheme(next);
        responsiveLayout.setTheme(next);
      }
    }

    // ---------------------------------------------------------------
    // 7. Tool selection
    // ---------------------------------------------------------------
    function selectTool(name: ToolName) {
      activeTool.deactivate();
      toolPalette.selectTool(name);
      renderLoop.setState({ activeTool: name });

      switch (name) {
        case "browse":
          activeTool = browseTool;
          break;
        case "button":
          activeTool = buttonTool;
          break;
        case "field":
          activeTool = fieldTool;
          break;
        default:
          // Paint/selection tools fall back to browse for now
          activeTool = browseTool;
          break;
      }

      activeTool.activate(renderLoop.cardCanvas, theme, paintConfig);
    }

    toolPalette.onToolSelect = (tool: ToolName) => {
      selectTool(tool);
    };

    // ---------------------------------------------------------------
    // 8. Card navigation helpers
    // ---------------------------------------------------------------
    function goNextCard() {
      if (!appRef?.stack) return;
      const next = Math.min(appRef.currentCardIndex + 1, appRef.stack.cards.length - 1);
      appRef.goToCard(next);
      scheduleAutoSave();
    }

    function goPrevCard() {
      if (!appRef) return;
      const prev = Math.max(appRef.currentCardIndex - 1, 0);
      appRef.goToCard(prev);
      scheduleAutoSave();
    }

    function goFirstCard() {
      if (!appRef) return;
      appRef.goToCard(0);
      scheduleAutoSave();
    }

    function goLastCard() {
      if (!appRef?.stack) return;
      appRef.goToCard(appRef.stack.cards.length - 1);
      scheduleAutoSave();
    }

    // ---------------------------------------------------------------
    // 9. Object creation helpers
    // ---------------------------------------------------------------
    function refreshCardObjects() {
      if (!appRef?.stack) return;
      const card = appRef.getCurrentCard();
      if (!card) return;
      const bg = appRef.stack.backgrounds.find((b) => b.id === card.backgroundId);
      const bgObjects = bg?.objects ?? [];
      renderLoop.setState({ objects: [...bgObjects, ...card.objects] });
    }

    function addButtonToCard(x: number, y: number, w: number, h: number) {
      if (!appRef?.stack) return;
      const card = appRef.getCurrentCard();
      if (!card) return;

      const btn = createButton({
        name: `Button ${card.objects.length + 1}`,
        rect: { x, y, width: w, height: h },
      });
      card.objects.push(btn);
      refreshCardObjects();
      scheduleAutoSave();
    }

    function addFieldToCard(x: number, y: number, w: number, h: number) {
      if (!appRef?.stack) return;
      const card = appRef.getCurrentCard();
      if (!card) return;

      const fld = createField({
        name: `Field ${card.objects.length + 1}`,
        rect: { x, y, width: w, height: h },
      });
      card.objects.push(fld);
      refreshCardObjects();
      scheduleAutoSave();
    }

    // Wire tool creation callbacks
    buttonTool.onCreateButton = addButtonToCard;
    fieldTool.onCreateField = addFieldToCard;

    // ---------------------------------------------------------------
    // 10. Browse tool callbacks
    // ---------------------------------------------------------------
    browseTool.onObjectMouseDown = (_objectId, _x, _y) => {
      renderLoop.dispatchInputEvent({ type: "mouseDown" });
    };

    browseTool.onObjectMouseUp = (_objectId, _x, _y) => {
      renderLoop.dispatchInputEvent({ type: "mouseUp" });
    };

    browseTool.onObjectClick = (objectId, _x, _y) => {
      // Double-click opens script editor (at scripting user level)
      if (renderLoop.state.userLevel >= 5) {
        const obj = renderLoop.state.objects.find((o) => o.id === objectId);
        if (obj) {
          const title = `Script of ${obj.type} "${obj.name}"`;
          scriptEditor.open(title, obj.script ?? "");
          renderLoop.setState({
            scriptEditorVisible: true,
            scriptEditorTitle: title,
            scriptEditorContent: obj.script ?? "",
          });
        }
      }
    };

    // Script editor close -- compile script and save
    scriptEditor.onClose = (content) => {
      renderLoop.setState({
        scriptEditorVisible: false,
        scriptEditorContent: content,
      });
      if (appRef) {
        appRef.bridge.loadScript(content);
      }
      scheduleAutoSave();
    };

    // ---------------------------------------------------------------
    // 11. Menu bar actions
    // ---------------------------------------------------------------
    renderLoop.menuBar.onSelect = (menuTitle: string, itemLabel: string) => {
      switch (menuTitle) {
        case "File":
          handleFileMenu(itemLabel);
          break;
        case "Edit":
          handleEditMenu(itemLabel);
          break;
        case "Go":
          handleGoMenu(itemLabel);
          break;
        case "Tools":
          handleToolsMenu(itemLabel);
          break;
        case "Objects":
          handleObjectsMenu(itemLabel);
          break;
        case "Style": {
          const trimmed = itemLabel.trim();
          if (trimmed === "Classic" || trimmed === "3.0") {
            handleThemeSwitch();
          }
          break;
        }
      }
    };

    function handleFileMenu(item: string) {
      switch (item) {
        case "New Stack":
          if (appRef) {
            appRef.newStack("Untitled");
            scheduleAutoSave();
          }
          break;
        case "Save a Copy":
          if (appRef?.stack) {
            const json = JSON.stringify(appRef.stack, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${appRef.stack.name}.wildcard.json`;
            a.click();
            URL.revokeObjectURL(url);
          }
          break;
      }
    }

    function handleEditMenu(item: string) {
      switch (item) {
        case "New Card":
          if (appRef?.stack) {
            const card = appRef.getCurrentCard();
            const bgId = card?.backgroundId ?? appRef.stack.backgrounds[0]?.id ?? "";
            const newCard = createCard({ backgroundId: bgId });
            appRef.stack.cards.push(newCard);
            appRef.goToCard(appRef.stack.cards.length - 1);
            scheduleAutoSave();
          }
          break;
        case "Delete Card":
          if (appRef?.stack && appRef.stack.cards.length > 1) {
            const idx = appRef.currentCardIndex;
            appRef.stack.cards.splice(idx, 1);
            const newIdx = Math.min(idx, appRef.stack.cards.length - 1);
            appRef.goToCard(newIdx);
            scheduleAutoSave();
          }
          break;
      }
    }

    function handleGoMenu(item: string) {
      switch (item) {
        case "First":
          goFirstCard();
          break;
        case "Prev":
          goPrevCard();
          break;
        case "Next":
          goNextCard();
          break;
        case "Last":
          goLastCard();
          break;
        case "Message":
          messageBox.toggle();
          renderLoop.setState({
            messageBoxVisible: messageBox.isVisible,
            messageBoxText: messageBox.text,
          });
          break;
      }
    }

    function handleToolsMenu(item: string) {
      const toolMap: Record<string, ToolName> = {
        Browse: "browse",
        Button: "button",
        Field: "field",
        Select: "select",
        Lasso: "lasso",
        Pencil: "pencil",
        Brush: "brush",
        Eraser: "eraser",
        Line: "line",
        Spray: "spray",
        Rectangle: "rect",
        "Round Rectangle": "roundRect",
        Bucket: "bucket",
        Oval: "oval",
        Curve: "curve",
        "Regular Polygon": "regularPolygon",
        Text: "text",
      };
      const tool = toolMap[item];
      if (tool) selectTool(tool);
    }

    function handleObjectsMenu(item: string) {
      switch (item) {
        case "New Button":
          addButtonToCard(100, 100, 120, 30);
          break;
        case "New Field":
          addFieldToCard(100, 100, 200, 100);
          break;
      }
    }

    // ---------------------------------------------------------------
    // 12. Mouse input wiring
    // ---------------------------------------------------------------
    const menuBarHeight = theme.metrics.menuBarHeight;

    mouseHandler.onMouseDown = (x, y, button) => {
      // 1) Menu bar
      if (y < menuBarHeight) {
        const menuIdx = renderLoop.menuBar.hitTestTitle(x, y);
        if (menuIdx >= 0) {
          if (renderLoop.menuBar.isOpen) {
            renderLoop.menuBar.close();
          } else {
            renderLoop.menuBar.openMenu(menuIdx);
          }
        }
        return;
      }

      // 2) Close open menu on click outside
      if (renderLoop.menuBar.isOpen) {
        renderLoop.menuBar.close();
        return;
      }

      // 3) Tool palette
      if (toolPalette.visible) {
        const pr = toolPalette.getRect();
        if (x >= pr.x && x < pr.x + pr.width && y >= pr.y && y < pr.y + pr.height) {
          const tool = toolPalette.hitTestTool(x, y);
          if (tool) selectTool(tool);
          return;
        }
      }

      // 4) Card-relative coordinates
      const cardY = y - menuBarHeight;

      activeTool.onMouseDown({
        x,
        y: cardY,
        shiftKey: keyboardHandler.shiftKey,
        optionKey: keyboardHandler.optionKey,
        commandKey: keyboardHandler.commandKey,
        button,
      });

      // Browse tool also notifies engine
      if (renderLoop.state.activeTool === "browse") {
        renderLoop.dispatchInputEvent({ type: "mouseDown" });
      }
    };

    mouseHandler.onMouseUp = (x, y, button) => {
      // Menu dropdown item selection
      if (renderLoop.menuBar.isOpen) {
        const itemIdx = renderLoop.menuBar.hitTestDropdown(x, y);
        if (itemIdx >= 0) {
          renderLoop.menuBar.selectItem(itemIdx);
        } else {
          renderLoop.menuBar.close();
        }
        return;
      }

      const cardY = y - menuBarHeight;

      activeTool.onMouseUp({
        x,
        y: cardY,
        shiftKey: keyboardHandler.shiftKey,
        optionKey: keyboardHandler.optionKey,
        commandKey: keyboardHandler.commandKey,
        button,
      });

      if (renderLoop.state.activeTool === "browse") {
        renderLoop.dispatchInputEvent({ type: "mouseUp" });
      }
    };

    mouseHandler.onMouseMove = (x, y) => {
      if (renderLoop.menuBar.isOpen) {
        if (y < menuBarHeight) {
          const menuIdx = renderLoop.menuBar.hitTestTitle(x, y);
          if (menuIdx >= 0 && menuIdx !== renderLoop.menuBar.activeMenuIndex) {
            renderLoop.menuBar.openMenu(menuIdx);
          }
        } else {
          const itemIdx = renderLoop.menuBar.hitTestDropdown(x, y);
          renderLoop.menuBar.highlightItem(itemIdx);
        }
        return;
      }

      const cardY = y - menuBarHeight;

      activeTool.onMouseMove({
        x,
        y: cardY,
        shiftKey: keyboardHandler.shiftKey,
        optionKey: keyboardHandler.optionKey,
        commandKey: keyboardHandler.commandKey,
        button: 0,
      });
    };

    mouseHandler.onDoubleClick = (x, y) => {
      const cardY = y - menuBarHeight;
      if (cardY < 0) return;

      if (activeTool.onDoubleClick) {
        activeTool.onDoubleClick({
          x,
          y: cardY,
          shiftKey: keyboardHandler.shiftKey,
          optionKey: keyboardHandler.optionKey,
          commandKey: keyboardHandler.commandKey,
          button: 0,
        });
      }
    };

    // ---------------------------------------------------------------
    // 13. Keyboard input wiring
    // ---------------------------------------------------------------

    // Cmd+M: toggle message box
    keyboardHandler.registerShortcut("m", ["Meta"], () => {
      messageBox.toggle();
      renderLoop.setState({
        messageBoxVisible: messageBox.isVisible,
        messageBoxText: messageBox.text,
      });
    });

    // Cmd+N: new stack
    keyboardHandler.registerShortcut("n", ["Meta"], () => {
      if (appRef) {
        appRef.newStack("Untitled");
        scheduleAutoSave();
      }
    });

    // Generic key handler for message box, script editor, and card navigation
    keyboardHandler.onKeyDown = (key, modifiers) => {
      // Message box gets first crack when visible
      if (messageBox.isVisible) {
        const handled = messageBox.handleKeyDown(key, modifiers as string[]);
        if (handled) {
          renderLoop.setState({ messageBoxText: messageBox.text });
          return;
        }
      }

      // Script editor consumes keys when open
      if (scriptEditor.isOpen) {
        if (key === "Escape") {
          scriptEditor.close();
        }
        return;
      }

      // Arrow key card navigation
      switch (key) {
        case "ArrowLeft":
          goPrevCard();
          return;
        case "ArrowRight":
          goNextCard();
          return;
      }

      // Forward all other keys to engine
      renderLoop.dispatchInputEvent({ type: "keyDown" });
    };

    // ---------------------------------------------------------------
    // 14. Touch input wiring (maps to mouse handler)
    // ---------------------------------------------------------------
    touchHandler.onMouseDown = (x, y) => {
      mouseHandler.handleMouseDown(x, y, 0);
    };

    touchHandler.onMouseUp = (x, y) => {
      mouseHandler.handleMouseUp(x, y, 0);
    };

    touchHandler.onMouseMove = (x, y) => {
      mouseHandler.handleMouseMove(x, y);
    };

    // ---------------------------------------------------------------
    // 15. Attach DOM event listeners
    // ---------------------------------------------------------------
    const screenToLogical = (sx: number, sy: number) => wcCanvas.screenToLogical(sx, sy);

    const detachMouse = mouseHandler.attachToCanvas(wcCanvas.canvas, screenToLogical);
    const detachKeyboard = keyboardHandler.attachToWindow();
    const detachTouch = touchHandler.attachToCanvas(wcCanvas.canvas, screenToLogical);

    // ---------------------------------------------------------------
    // 16. Responsive layout
    // ---------------------------------------------------------------
    const initialLayout = responsiveLayout.computeLayout(
      container.clientWidth,
      container.clientHeight,
    );
    toolPalette.isMobileDrawer = initialLayout.isMobile;

    const detachResize = responsiveLayout.observeResize(container, wcCanvas.canvas, (layout) => {
      toolPalette.isMobileDrawer = layout.isMobile;
    });

    // ---------------------------------------------------------------
    // 17. Extra UI rendering (palette, message box, script editor)
    // ---------------------------------------------------------------
    let extraRafId: number | null = null;

    function renderExtras() {
      const ctx = wcCanvas.ctx;
      drawPalette(ctx, theme, toolPalette.getRenderState());
      drawMessageBox(ctx, theme, messageBox, wcCanvas.logicalHeight);
      drawScriptEditor(ctx, theme, scriptEditor);
    }

    function extraRenderTick() {
      if (renderLoop.isRunning) {
        renderExtras();
        extraRafId = requestAnimationFrame(extraRenderTick);
      }
    }

    // ---------------------------------------------------------------
    // 18. Initialize engine and start
    // ---------------------------------------------------------------
    createWildCardApp({ renderer: renderLoop, messageBox, theme })
      .then((app) => {
        appRef = app;
        app.setMessageBox(messageBox);

        // Restore from localStorage
        const saved = localStorage.getItem("wildcard-stack");
        if (saved) {
          const loaded = app.loadStack(saved);
          if (!loaded) app.newStack("Untitled");
        } else {
          app.newStack("Untitled");
        }

        renderLoop.start();
        extraRafId = requestAnimationFrame(extraRenderTick);
      })
      .catch(() => {
        // Engine not available -- render chrome anyway
        renderLoop.start();
        extraRafId = requestAnimationFrame(extraRenderTick);
      });

    // ---------------------------------------------------------------
    // 19. Cleanup
    // ---------------------------------------------------------------
    return () => {
      renderLoop.stop();
      if (extraRafId !== null) cancelAnimationFrame(extraRafId);
      autoSaver.cancel();
      detachMouse();
      detachKeyboard();
      detachTouch();
      detachResize();
      activeTool.deactivate();
    };
  }, []);

  return <div class="wc-editor" ref={containerRef} />;
}
