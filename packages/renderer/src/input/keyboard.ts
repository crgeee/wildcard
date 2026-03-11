/**
 * Keyboard handler — manages keyboard shortcuts and key state.
 *
 * Tracks modifier keys (Shift, Command/Meta, Option/Alt, Control).
 * Supports registering keyboard shortcuts.
 * Full shortcut system on desktop, long-press context menus on touch.
 */

export type Modifier = "Shift" | "Meta" | "Alt" | "Control";

interface ShortcutBinding {
  key: string;
  modifiers: Modifier[];
  callback: () => void;
}

export class KeyboardHandler {
  private _shiftKey = false;
  private _commandKey = false;
  private _optionKey = false;
  private _controlKey = false;
  private _shortcuts: ShortcutBinding[] = [];

  /** Generic callbacks */
  onKeyDown: ((key: string, modifiers: Modifier[]) => void) | null = null;
  onKeyUp: ((key: string) => void) | null = null;

  get shiftKey(): boolean {
    return this._shiftKey;
  }

  get commandKey(): boolean {
    return this._commandKey;
  }

  get optionKey(): boolean {
    return this._optionKey;
  }

  get controlKey(): boolean {
    return this._controlKey;
  }

  get currentModifiers(): Modifier[] {
    const mods: Modifier[] = [];
    if (this._shiftKey) mods.push("Shift");
    if (this._commandKey) mods.push("Meta");
    if (this._optionKey) mods.push("Alt");
    if (this._controlKey) mods.push("Control");
    return mods;
  }

  /**
   * Register a keyboard shortcut.
   * @param key The key to listen for (lowercase)
   * @param modifiers Required modifier keys
   * @param callback Function to call when shortcut is triggered
   */
  registerShortcut(key: string, modifiers: Modifier[], callback: () => void): void {
    this._shortcuts.push({ key: key.toLowerCase(), modifiers, callback });
  }

  /** Remove all shortcuts for a key+modifier combination */
  removeShortcut(key: string, modifiers: Modifier[]): void {
    this._shortcuts = this._shortcuts.filter(
      (s) => s.key !== key.toLowerCase() || !this._modifiersMatch(s.modifiers, modifiers),
    );
  }

  handleKeyDown(key: string, modifiers: Modifier[]): void {
    this._updateModifiers(key, true);

    // Check shortcuts
    const activeModifiers = modifiers.length > 0 ? modifiers : this.currentModifiers;
    for (const shortcut of this._shortcuts) {
      if (
        shortcut.key === key.toLowerCase() &&
        this._modifiersMatch(shortcut.modifiers, activeModifiers)
      ) {
        shortcut.callback();
        return; // Shortcut consumed the event
      }
    }

    if (this.onKeyDown) {
      this.onKeyDown(key, activeModifiers);
    }
  }

  handleKeyUp(key: string): void {
    this._updateModifiers(key, false);

    if (this.onKeyUp) {
      this.onKeyUp(key);
    }
  }

  /**
   * Attach DOM keyboard event listeners.
   */
  attachToWindow(): () => void {
    const onDown = (e: KeyboardEvent) => {
      const modifiers: Modifier[] = [];
      if (e.shiftKey) modifiers.push("Shift");
      if (e.metaKey) modifiers.push("Meta");
      if (e.altKey) modifiers.push("Alt");
      if (e.ctrlKey) modifiers.push("Control");

      this.handleKeyDown(e.key, modifiers);

      // Prevent default for our shortcuts
      for (const shortcut of this._shortcuts) {
        if (
          shortcut.key === e.key.toLowerCase() &&
          this._modifiersMatch(shortcut.modifiers, modifiers)
        ) {
          e.preventDefault();
          break;
        }
      }
    };

    const onUp = (e: KeyboardEvent) => {
      this.handleKeyUp(e.key);
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }

  private _updateModifiers(key: string, isDown: boolean): void {
    switch (key) {
      case "Shift":
        this._shiftKey = isDown;
        break;
      case "Meta":
      case "Command":
        this._commandKey = isDown;
        break;
      case "Alt":
      case "Option":
        this._optionKey = isDown;
        break;
      case "Control":
        this._controlKey = isDown;
        break;
    }
  }

  private _modifiersMatch(a: Modifier[], b: Modifier[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((m, i) => m === sortedB[i]);
  }
}
