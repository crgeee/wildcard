import { describe, it, expect, beforeEach } from "vitest";
import { ScriptEditor } from "../components/script-editor";
import { MessageBox } from "../components/message-box";
import { classicTheme } from "../themes/classic";

describe("ScriptEditor", () => {
  let editor: ScriptEditor;

  beforeEach(() => {
    editor = new ScriptEditor(classicTheme);
  });

  it("opens with title and content", () => {
    editor.open("Script of button 'OK'", "on mouseUp\n  go to next card\nend mouseUp");
    expect(editor.isOpen).toBe(true);
    expect(editor.title).toBe("Script of button 'OK'");
    expect(editor.content).toContain("on mouseUp");
  });

  it("closes", () => {
    editor.open("Script of button 'OK'", "");
    editor.close();
    expect(editor.isOpen).toBe(false);
  });

  it("tracks cursor position", () => {
    editor.open("Test", "line 1\nline 2\nline 3");
    expect(editor.cursorLine).toBe(0);
    expect(editor.cursorCol).toBe(0);
    editor.setCursor(1, 3);
    expect(editor.cursorLine).toBe(1);
    expect(editor.cursorCol).toBe(3);
  });

  it("splits content into lines for rendering", () => {
    editor.open("Test", "line 1\nline 2\nline 3");
    expect(editor.lines.length).toBe(3);
    expect(editor.lines[0]).toBe("line 1");
  });

  it("has line numbers", () => {
    editor.open("Test", "a\nb\nc");
    expect(editor.lineCount).toBe(3);
  });

  it("highlights WildTalk keywords", () => {
    editor.open("Test", "on mouseUp\n  put 42 into x\nend mouseUp");
    const tokens = editor.tokenizeLine(0);
    expect(tokens.some((t) => t.type === "keyword" && t.text === "on")).toBe(true);
    expect(tokens.some((t) => t.type === "handler" && t.text === "mouseUp")).toBe(true);
  });

  it("highlights strings", () => {
    editor.open("Test", 'put "hello" into x');
    const tokens = editor.tokenizeLine(0);
    expect(tokens.some((t) => t.type === "string")).toBe(true);
  });

  it("highlights comments", () => {
    editor.open("Test", "-- this is a comment");
    const tokens = editor.tokenizeLine(0);
    expect(tokens.some((t) => t.type === "comment")).toBe(true);
  });

  it("uses monospace font", () => {
    expect(editor.font).toContain("Monaco");
  });

  it("has window rect for rendering", () => {
    editor.open("Test", "content");
    const rect = editor.getWindowRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });

  it("title follows pattern: Script of <type> '<name>'", () => {
    editor.open("Script of card 'Home'", "");
    expect(editor.title).toBe("Script of card 'Home'");
  });
});

describe("MessageBox", () => {
  let msgBox: MessageBox;

  beforeEach(() => {
    msgBox = new MessageBox(classicTheme);
  });

  it("starts hidden", () => {
    expect(msgBox.isVisible).toBe(false);
  });

  it("toggles visibility", () => {
    msgBox.toggle();
    expect(msgBox.isVisible).toBe(true);
    msgBox.toggle();
    expect(msgBox.isVisible).toBe(false);
  });

  it("accepts text input", () => {
    msgBox.show();
    msgBox.setText("the date");
    expect(msgBox.text).toBe("the date");
  });

  it("maintains command history", () => {
    msgBox.show();
    msgBox.execute("put 1 + 1");
    msgBox.execute("the date");
    expect(msgBox.history.length).toBe(2);
    expect(msgBox.history[0]).toBe("put 1 + 1");
  });

  it("navigates history with up/down", () => {
    msgBox.show();
    msgBox.execute("command 1");
    msgBox.execute("command 2");
    msgBox.historyUp();
    expect(msgBox.text).toBe("command 2");
    msgBox.historyUp();
    expect(msgBox.text).toBe("command 1");
    msgBox.historyDown();
    expect(msgBox.text).toBe("command 2");
  });

  it("has correct height from theme", () => {
    expect(msgBox.height).toBe(classicTheme.metrics.messageBoxHeight);
  });

  it("fires callback on execute", () => {
    let executed = "";
    msgBox.onExecute = (cmd) => {
      executed = cmd;
    };
    msgBox.show();
    msgBox.execute("go to next card");
    expect(executed).toBe("go to next card");
  });

  it("shows result text", () => {
    msgBox.show();
    msgBox.setResult("42");
    expect(msgBox.result).toBe("42");
  });

  it("appears at bottom of screen", () => {
    msgBox.show();
    const y = msgBox.getY(400);
    expect(y).toBe(400 - classicTheme.metrics.messageBoxHeight);
  });
});
