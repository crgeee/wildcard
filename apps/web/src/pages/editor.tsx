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
  SelectTool,
  LassoTool,
  PencilTool,
  BrushTool,
  EraserTool,
  LineTool,
  SprayTool,
  RectTool,
  RoundRectTool,
  BucketTool,
  OvalTool,
  CurveTool,
  RegularPolygonTool,
  TextTool,
  ResponsiveLayout,
  drawPalette,
  drawMessageBox,
  drawScriptEditor,
  defaultPaintConfig,
  createAutoSaver,
  importStack,
} from "@wildcard/renderer";
import type { WildCardApp, ToolName, Tool } from "@wildcard/renderer";
import { createButton, createField, createCard } from "@wildcard/types";

const THEME_STORAGE_KEY = "wildcard-theme";

const THEME_TOOLTIPS = {
  classic: "Classic: HyperCard 2.4, 1998",
  v3: "3.0: The unreleased version, imagined.",
} as const;

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "v3" ? v3Theme : classicTheme;
  } catch {
    return classicTheme;
  }
}

export function EditorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initialized.current) return;
    initialized.current = true;

    const container = containerRef.current;
    let theme = getStoredTheme();

    // ---------------------------------------------------------------
    // 1. Canvas and render loop
    // ---------------------------------------------------------------
    const wcCanvas = new WildCardCanvas({
      container,
      logicalWidth: 512,
      logicalHeight: 342,
      theme,
    });

    const renderLoop = new RenderLoop(wcCanvas.ctx, theme);

    // ---------------------------------------------------------------
    // 2. UI components
    // ---------------------------------------------------------------
    const toolPalette = new ToolPalette(theme);
    const messageBox = new MessageBox(theme);
    const scriptEditor = new ScriptEditor(theme);
    const responsiveLayout = new ResponsiveLayout(theme);
    const paintConfig = defaultPaintConfig();

    // ---------------------------------------------------------------
    // 3. Input handlers
    // ---------------------------------------------------------------
    const mouseHandler = new MouseHandler();
    const keyboardHandler = new KeyboardHandler();
    const touchHandler = new TouchHandler();

    // ---------------------------------------------------------------
    // 4. All 17 tools
    // ---------------------------------------------------------------
    const browseTool = new BrowseTool();
    const buttonTool = new ButtonTool();
    const fieldTool = new FieldTool();
    const selectTool_ = new SelectTool();
    const lassoTool = new LassoTool();
    const pencilTool = new PencilTool();
    const brushTool = new BrushTool();
    const eraserTool = new EraserTool();
    const lineTool = new LineTool();
    const sprayTool = new SprayTool();
    const rectTool = new RectTool();
    const roundRectTool = new RoundRectTool();
    const bucketTool = new BucketTool();
    const ovalTool = new OvalTool();
    const curveTool = new CurveTool();
    const regularPolygonTool = new RegularPolygonTool();
    const textTool = new TextTool();

    const toolInstances: Record<ToolName, Tool> = {
      browse: browseTool,
      button: buttonTool,
      field: fieldTool,
      select: selectTool_,
      lasso: lassoTool,
      pencil: pencilTool,
      brush: brushTool,
      eraser: eraserTool,
      line: lineTool,
      spray: sprayTool,
      rect: rectTool,
      roundRect: roundRectTool,
      bucket: bucketTool,
      oval: ovalTool,
      curve: curveTool,
      regularPolygon: regularPolygonTool,
      text: textTool,
    };

    let activeTool: Tool = browseTool;
    browseTool.activate(renderLoop.cardCanvas, theme, paintConfig);

    // ---------------------------------------------------------------
    // 5. Auto-save and document title
    // ---------------------------------------------------------------
    let appRef: WildCardApp | null = null;
    const autoSaver = createAutoSaver(500);

    function updateDocumentTitle() {
      if (appRef?.stack) {
        const name = appRef.stack.name || "Untitled";
        const cardNum = appRef.currentCardIndex + 1;
        const total = appRef.stack.cards.length;
        document.title = `${name} \u2014 Card ${cardNum} of ${total}`;
      } else {
        document.title = "WildCard";
      }
    }

    function scheduleAutoSave() {
      if (appRef?.stack) {
        autoSaver.save(appRef.stack);
        try {
          localStorage.setItem("wildcard-stack", JSON.stringify(appRef.stack));
        } catch {
          /* full */
        }
        updateDocumentTitle();
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
      } else {
        const next = theme.name === "classic" ? v3Theme : classicTheme;
        theme = next;
        renderLoop.setState({ theme: next });
      }
      localStorage.setItem(THEME_STORAGE_KEY, theme.name);
      container.title = THEME_TOOLTIPS[theme.name];
      toolPalette.setTheme(theme);
      messageBox.setTheme(theme);
      scriptEditor.setTheme(theme);
      responsiveLayout.setTheme(theme);
    }

    // ---------------------------------------------------------------
    // 7. Tool selection — wires ALL 17 tools
    // ---------------------------------------------------------------
    function switchToTool(name: ToolName) {
      activeTool.deactivate();
      toolPalette.setSelectedTool(name);
      renderLoop.setState({ activeTool: name });

      const instance = toolInstances[name];
      activeTool = instance;
      activeTool.activate(renderLoop.cardCanvas, theme, paintConfig);
    }

    toolPalette.onToolSelect = (tool: ToolName) => {
      switchToTool(tool);
    };

    // ---------------------------------------------------------------
    // 8. Card navigation
    // ---------------------------------------------------------------
    function goNextCard() {
      if (!appRef?.stack) return;
      appRef.goToCard(Math.min(appRef.currentCardIndex + 1, appRef.stack.cards.length - 1));
      scheduleAutoSave();
    }

    function goPrevCard() {
      if (!appRef) return;
      appRef.goToCard(Math.max(appRef.currentCardIndex - 1, 0));
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
    // 9. Object creation
    // ---------------------------------------------------------------
    function refreshCardObjects() {
      if (!appRef?.stack) return;
      const card = appRef.getCurrentCard();
      if (!card) return;
      const bg = appRef.stack.backgrounds.find((b) => b.id === card.backgroundId);
      renderLoop.setState({ objects: [...(bg?.objects ?? []), ...card.objects] });
    }

    function addButtonToCard(x: number, y: number, w: number, h: number) {
      if (!appRef?.stack) return;
      const card = appRef.getCurrentCard();
      if (!card) return;
      card.objects.push(
        createButton({
          name: `Button ${card.objects.length + 1}`,
          rect: { x, y, width: w, height: h },
        }),
      );
      refreshCardObjects();
      scheduleAutoSave();
    }

    function addFieldToCard(x: number, y: number, w: number, h: number) {
      if (!appRef?.stack) return;
      const card = appRef.getCurrentCard();
      if (!card) return;
      card.objects.push(
        createField({
          name: `Field ${card.objects.length + 1}`,
          rect: { x, y, width: w, height: h },
        }),
      );
      refreshCardObjects();
      scheduleAutoSave();
    }

    buttonTool.onCreateButton = addButtonToCard;
    fieldTool.onCreateField = addFieldToCard;

    // ---------------------------------------------------------------
    // 10. Text tool — commit text to paint layer
    // ---------------------------------------------------------------
    textTool.onCommitText = (x, y, text) => {
      const ctx = wcCanvas.ctx;
      ctx.save();
      ctx.fillStyle = paintConfig.foregroundColor;
      ctx.font = `${theme.fonts.systemSize}px ${theme.fonts.system}`;
      ctx.textBaseline = "top";
      // Render text to paint layer pixel by pixel
      const menuH = theme.metrics.menuBarHeight;
      ctx.fillText(text, x, y + menuH);
      ctx.restore();
      // Also set pixels in the card canvas paint data for persistence
      const cardCanvas = renderLoop.cardCanvas;
      const paintData = cardCanvas.getPaintData();
      // Use a temporary canvas to rasterize the text into ImageData
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = paintData.width;
      tmpCanvas.height = paintData.height;
      const tmpCtx = tmpCanvas.getContext("2d")!;
      tmpCtx.fillStyle = paintConfig.foregroundColor;
      tmpCtx.font = `${theme.fonts.systemSize}px ${theme.fonts.system}`;
      tmpCtx.textBaseline = "top";
      tmpCtx.fillText(text, x, y);
      const rendered = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
      // Merge non-transparent pixels into paint data
      for (let i = 0; i < rendered.data.length; i += 4) {
        if (rendered.data[i + 3] > 128) {
          paintData.data[i] = rendered.data[i];
          paintData.data[i + 1] = rendered.data[i + 1];
          paintData.data[i + 2] = rendered.data[i + 2];
          paintData.data[i + 3] = 255;
        }
      }
      cardCanvas.markFullDirty();
      scheduleAutoSave();
    };

    // ---------------------------------------------------------------
    // 11. Eraser double-click — erase all paint
    // ---------------------------------------------------------------
    eraserTool.onDoubleClick = () => {
      renderLoop.cardCanvas.clearPaintData();
      scheduleAutoSave();
    };

    // ---------------------------------------------------------------
    // 12. Browse tool callbacks
    // ---------------------------------------------------------------
    browseTool.onObjectMouseDown = (_objectId) => {
      renderLoop.dispatchInputEvent({ type: "mouseDown" });
    };

    browseTool.onObjectMouseUp = () => {
      renderLoop.dispatchInputEvent({ type: "mouseUp" });
    };

    // Double-click opens script editor (always available — user level 5)
    browseTool.onObjectClick = (objectId) => {
      const obj = renderLoop.state.objects.find((o) => o.id === objectId);
      if (obj) {
        const title = `Script of ${obj.type} "${obj.name}"`;
        scriptEditor.open(title, obj.script ?? "");
        renderLoop.setState({
          scriptEditorVisible: true,
          scriptEditorTitle: title,
          scriptEditorContent: obj.script ?? "",
        });
        // Remember which object we're editing
        (scriptEditor as unknown as Record<string, string>)._editingObjectId = objectId;
      }
    };

    // Script editor close — save script back to the object
    scriptEditor.onClose = (content) => {
      renderLoop.setState({ scriptEditorVisible: false, scriptEditorContent: content });

      // Save script to the object
      const editingId = (scriptEditor as unknown as Record<string, string>)._editingObjectId;
      if (editingId && appRef?.stack) {
        const card = appRef.getCurrentCard();
        if (card) {
          const obj = card.objects.find((o) => o.id === editingId);
          if (obj) obj.script = content;
        }
      }

      if (appRef) {
        appRef.bridge.loadScript(content);
      }
      scheduleAutoSave();
    };

    // ---------------------------------------------------------------
    // 13. Menu bar actions
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
          if (trimmed === "Classic" || trimmed === "3.0") handleThemeSwitch();
          break;
        }
      }
    };

    function openStackFromFile() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,.wildcard.json";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file || !appRef) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            importStack(reader.result as string);
            if (appRef!.loadStack(reader.result as string)) {
              scheduleAutoSave();
            }
          } catch {
            /* invalid file */
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }

    function handleFileMenu(item: string) {
      switch (item) {
        case "New Stack":
          if (appRef) {
            appRef.newStack("Untitled");
            scheduleAutoSave();
          }
          break;
        case "Open Stack":
          openStackFromFile();
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
            appRef.stack.cards.push(createCard({ backgroundId: bgId }));
            appRef.goToCard(appRef.stack.cards.length - 1);
            scheduleAutoSave();
          }
          break;
        case "Delete Card":
          if (appRef?.stack && appRef.stack.cards.length > 1) {
            const idx = appRef.currentCardIndex;
            appRef.stack.cards.splice(idx, 1);
            appRef.goToCard(Math.min(idx, appRef.stack.cards.length - 1));
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
      if (tool) switchToTool(tool);
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
    // 14. Mouse input
    // ---------------------------------------------------------------
    const menuBarHeight = theme.metrics.menuBarHeight;

    mouseHandler.onMouseDown = (x, y, button) => {
      // Menu bar
      if (y < menuBarHeight) {
        const menuIdx = renderLoop.menuBar.hitTestTitle(x, y);
        if (menuIdx >= 0) {
          if (renderLoop.menuBar.isOpen) renderLoop.menuBar.close();
          else renderLoop.menuBar.openMenu(menuIdx);
        }
        return;
      }

      // Close open menu on click outside
      if (renderLoop.menuBar.isOpen) {
        renderLoop.menuBar.close();
        return;
      }

      // Tool palette hit test
      if (toolPalette.visible) {
        const pr = toolPalette.getRect();
        if (x >= pr.x && x < pr.x + pr.width && y >= pr.y && y < pr.y + pr.height) {
          const tool = toolPalette.hitTestTool(x, y);
          if (tool) switchToTool(tool);
          return;
        }
      }

      // Card-relative coordinates
      const cardY = y - menuBarHeight;
      activeTool.onMouseDown({
        x,
        y: cardY,
        shiftKey: keyboardHandler.shiftKey,
        optionKey: keyboardHandler.optionKey,
        commandKey: keyboardHandler.commandKey,
        button,
      });

      if (renderLoop.state.activeTool === "browse") {
        renderLoop.dispatchInputEvent({ type: "mouseDown" });
      }
    };

    mouseHandler.onMouseUp = (x, y, button) => {
      if (renderLoop.menuBar.isOpen) {
        const itemIdx = renderLoop.menuBar.hitTestDropdown(x, y);
        if (itemIdx >= 0) renderLoop.menuBar.selectItem(itemIdx);
        else renderLoop.menuBar.close();
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

      // Auto-save after paint strokes end
      const cat = activeTool.category;
      if (cat === "paint" || cat === "shape" || cat === "text" || cat === "authoring") {
        scheduleAutoSave();
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
          renderLoop.menuBar.highlightItem(renderLoop.menuBar.hitTestDropdown(x, y));
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
    // 15. Keyboard input
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

    // Cmd+O: open stack
    keyboardHandler.registerShortcut("o", ["Meta"], () => {
      openStackFromFile();
    });

    // Cmd+S: save a copy
    keyboardHandler.registerShortcut("s", ["Meta"], () => {
      handleFileMenu("Save a Copy");
    });

    keyboardHandler.onKeyDown = (key, modifiers) => {
      // Message box gets first crack when visible
      if (messageBox.isVisible) {
        const handled = messageBox.handleKeyDown(key, modifiers as string[]);
        if (handled) {
          renderLoop.setState({ messageBoxText: messageBox.text });
          return;
        }
      }

      // Script editor consumes all keys when open
      if (scriptEditor.isOpen) {
        if (key === "Escape") {
          scriptEditor.close();
          return;
        }
        // Route typing to script editor
        handleScriptEditorKey(key, modifiers as string[]);
        return;
      }

      // Text tool consumes printable keys when editing
      if (activeTool === textTool && textTool.isEditing) {
        if (textTool.onKeyDown) {
          textTool.onKeyDown(key, modifiers as string[]);
        }
        return;
      }

      // Curve tool needs Enter/Escape
      if (activeTool === curveTool && curveTool.onKeyDown) {
        if (key === "Enter" || key === "Escape") {
          curveTool.onKeyDown(key, modifiers as string[]);
          return;
        }
      }

      // Arrow key card navigation (only in browse mode)
      if (renderLoop.state.activeTool === "browse") {
        switch (key) {
          case "ArrowLeft":
            goPrevCard();
            return;
          case "ArrowRight":
            goNextCard();
            return;
        }
      }

      // Tab to cycle tools
      if (key === "Tab") {
        const toolNames = Object.keys(toolInstances) as ToolName[];
        const idx = toolNames.indexOf(renderLoop.state.activeTool);
        const nextIdx = (idx + 1) % toolNames.length;
        switchToTool(toolNames[nextIdx]);
        return;
      }

      renderLoop.dispatchInputEvent({ type: "keyDown" });
    };

    /** Route keystrokes into the ScriptEditor component. */
    function handleScriptEditorKey(key: string, _modifiers: string[]) {
      const lines = [...scriptEditor.lines] as string[];
      let curLine = scriptEditor.cursorLine;
      let curCol = scriptEditor.cursorCol;

      if (key === "Backspace") {
        if (curCol > 0) {
          lines[curLine] = lines[curLine].slice(0, curCol - 1) + lines[curLine].slice(curCol);
          curCol--;
        } else if (curLine > 0) {
          curCol = lines[curLine - 1].length;
          lines[curLine - 1] += lines[curLine];
          lines.splice(curLine, 1);
          curLine--;
        }
      } else if (key === "Enter" || key === "Return") {
        const before = lines[curLine].slice(0, curCol);
        const after = lines[curLine].slice(curCol);
        lines[curLine] = before;
        lines.splice(curLine + 1, 0, after);
        curLine++;
        curCol = 0;
      } else if (key === "ArrowUp") {
        curLine = Math.max(0, curLine - 1);
        curCol = Math.min(curCol, lines[curLine].length);
      } else if (key === "ArrowDown") {
        curLine = Math.min(lines.length - 1, curLine + 1);
        curCol = Math.min(curCol, lines[curLine].length);
      } else if (key === "ArrowLeft") {
        if (curCol > 0) curCol--;
        else if (curLine > 0) {
          curLine--;
          curCol = lines[curLine].length;
        }
      } else if (key === "ArrowRight") {
        if (curCol < lines[curLine].length) curCol++;
        else if (curLine < lines.length - 1) {
          curLine++;
          curCol = 0;
        }
      } else if (key === "Tab") {
        lines[curLine] = lines[curLine].slice(0, curCol) + "  " + lines[curLine].slice(curCol);
        curCol += 2;
      } else if (key.length === 1) {
        lines[curLine] = lines[curLine].slice(0, curCol) + key + lines[curLine].slice(curCol);
        curCol++;
      } else {
        return; // Unhandled key
      }

      scriptEditor.setContent(lines.join("\n"));
      scriptEditor.setCursor(curLine, curCol);
      renderLoop.setState({ scriptEditorContent: scriptEditor.content });
    }

    // ---------------------------------------------------------------
    // 16. Touch input (maps to mouse handler)
    // ---------------------------------------------------------------
    touchHandler.onMouseDown = (x, y) => mouseHandler.handleMouseDown(x, y, 0);
    touchHandler.onMouseUp = (x, y) => mouseHandler.handleMouseUp(x, y, 0);
    touchHandler.onMouseMove = (x, y) => mouseHandler.handleMouseMove(x, y);

    // ---------------------------------------------------------------
    // 17. Attach DOM event listeners
    // ---------------------------------------------------------------
    const screenToLogical = (sx: number, sy: number) => wcCanvas.screenToLogical(sx, sy);
    const detachMouse = mouseHandler.attachToCanvas(wcCanvas.canvas, screenToLogical);
    const detachKeyboard = keyboardHandler.attachToWindow();
    const detachTouch = touchHandler.attachToCanvas(wcCanvas.canvas, screenToLogical);

    // ---------------------------------------------------------------
    // 18. Responsive layout
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
    // 19. Rendering — paint layer + extra UI
    // ---------------------------------------------------------------
    let extraRafId: number | null = null;

    function renderPaintLayer() {
      const cardCanvas = renderLoop.cardCanvas;
      // Only render if there's paint data
      const paintData = cardCanvas.getPaintData();
      if (!paintData) return;

      const ctx = wcCanvas.ctx;
      const menuH = theme.metrics.menuBarHeight;

      // Draw paint layer between background and objects
      // putImageData ignores globalCompositeOperation, so we use a temp canvas
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = paintData.width;
      tmpCanvas.height = paintData.height;
      const tmpCtx = tmpCanvas.getContext("2d")!;
      tmpCtx.putImageData(paintData, 0, 0);

      // Draw only non-white pixels (preserve card background)
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(tmpCanvas, 0, menuH);
      ctx.restore();
    }

    function renderToolOverlay() {
      if (!activeTool.getOverlay) return;
      const overlay = activeTool.getOverlay();
      if (!overlay) return;

      const ctx = wcCanvas.ctx;
      const menuH = theme.metrics.menuBarHeight;
      ctx.save();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;

      if (overlay.marchingAnts) {
        ctx.setLineDash([4, 4]);
      }

      if (overlay.type === "rect" && overlay.points.length >= 2) {
        const [p0, p1] = overlay.points;
        const x = Math.min(p0.x, p1.x);
        const y = Math.min(p0.y, p1.y) + menuH;
        const w = Math.abs(p1.x - p0.x);
        const h = Math.abs(p1.y - p0.y);
        ctx.strokeRect(x + 0.5, y + 0.5, w, h);
      } else if (overlay.type === "line" && overlay.points.length >= 2) {
        const [p0, p1] = overlay.points;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y + menuH);
        ctx.lineTo(p1.x, p1.y + menuH);
        ctx.stroke();
      } else if (overlay.type === "oval" && overlay.points.length >= 2) {
        const [p0, p1] = overlay.points;
        const cx = (p0.x + p1.x) / 2;
        const cy = (p0.y + p1.y) / 2 + menuH;
        const rx = Math.abs(p1.x - p0.x) / 2;
        const ry = Math.abs(p1.y - p0.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (overlay.type === "lasso" && overlay.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(overlay.points[0].x, overlay.points[0].y + menuH);
        for (let i = 1; i < overlay.points.length; i++) {
          ctx.lineTo(overlay.points[i].x, overlay.points[i].y + menuH);
        }
        ctx.stroke();
      } else if (overlay.type === "text-cursor" && overlay.points.length >= 1) {
        const p = overlay.points[0];
        // Draw blinking cursor
        if (Math.floor(Date.now() / 500) % 2 === 0) {
          ctx.fillStyle = "#000";
          ctx.fillRect(p.x, p.y + menuH, 1, theme.fonts.systemSize + 2);
        }
      }

      ctx.restore();
    }

    function extraRenderTick() {
      if (renderLoop.isRunning) {
        renderPaintLayer();
        renderToolOverlay();
        drawPalette(wcCanvas.ctx, theme, toolPalette.getRenderState());
        drawMessageBox(wcCanvas.ctx, theme, messageBox, wcCanvas.logicalHeight);
        drawScriptEditor(wcCanvas.ctx, theme, scriptEditor);
        extraRafId = requestAnimationFrame(extraRenderTick);
      }
    }

    // ---------------------------------------------------------------
    // 20. Initialize engine and start
    // ---------------------------------------------------------------
    // Set user level to 5 (scripting) so double-click opens scripts
    renderLoop.setState({ userLevel: 5 });

    createWildCardApp({ renderer: renderLoop, messageBox, theme })
      .then((app) => {
        appRef = app;
        app.setMessageBox(messageBox);

        const saved = localStorage.getItem("wildcard-stack");
        if (saved) {
          if (!app.loadStack(saved)) app.newStack("Untitled");
        } else {
          app.newStack("Untitled");
        }

        updateDocumentTitle();
        renderLoop.start();
        extraRafId = requestAnimationFrame(extraRenderTick);
      })
      .catch(() => {
        renderLoop.start();
        extraRafId = requestAnimationFrame(extraRenderTick);
      });

    // ---------------------------------------------------------------
    // 21. Cleanup
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
