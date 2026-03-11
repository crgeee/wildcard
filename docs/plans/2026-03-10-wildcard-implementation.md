# WildCard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build WildCard — an open-source, web-based HyperCard 3.0 reimagining with a Rust/WASM scripting engine, retro Canvas renderer, and community gallery.

**Architecture:** Monorepo with 4 packages: `@wildcard/engine` (Rust/WASM interpreter), `@wildcard/renderer` (TS/Canvas 2D), `@wildcard/types` (shared types + FFI), `wildcard-web` (Hono API + Vite SPA). Engine is headless, emits events; renderer paints pixels.

**Tech Stack:** Rust + wasm-pack, TypeScript, Canvas 2D, Hono, Vite, Preact, PostgreSQL, Hetzner Object Storage, GitHub Actions.

---

## Agent Team Structure

```
                    ┌─────────────────┐
                    │   TEAM LEAD     │
                    │  Coordinates    │
                    │  Reviews PRs    │
                    │  Unblocks       │
                    └───────┬─────────┘
            ┌───────────────┼───────────────┐
            │               │               │
   ┌────────▼──────┐ ┌─────▼───────┐ ┌─────▼───────┐
   │ ENGINE AGENT  │ │ RENDERER    │ │ WEB APP     │
   │ Rust/WASM     │ │ AGENT       │ │ AGENT       │
   │ WildTalk      │ │ Canvas/UI   │ │ Hono/Vite   │
   │ interpreter   │ │ retro Mac   │ │ gallery/API │
   └───────────────┘ └─────────────┘ └─────────────┘
```

- **Team Lead**: Runs phases sequentially. Reviews each agent's output before moving to the next phase. Manages integration points.
- **Engine Agent**: Owns `@wildcard/engine` (Rust) and `@wildcard/types` (TS). Builds the WildTalk interpreter and FFI bridge.
- **Renderer Agent**: Owns `@wildcard/renderer`. Builds the Canvas 2D retro Mac rendering engine.
- **Web App Agent**: Owns `wildcard-web`. Builds the Hono API, Vite SPA shell, gallery, auth, and content moderation.

Agents work in **phases**. Within a phase, independent tasks run in parallel. The Team Lead gates phase transitions.

---

## Phase 0: Project Scaffolding & CI

*All agents blocked until this completes. Team Lead executes.*

### Task 0.1: Monorepo Scaffolding

**Files:**
- Create: `package.json` (root workspace)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`
- Create: `packages/renderer/package.json`
- Create: `packages/renderer/tsconfig.json`
- Create: `packages/renderer/src/index.ts`
- Create: `packages/engine/Cargo.toml`
- Create: `packages/engine/src/lib.rs`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/src/index.ts`

**Step 1: Initialize pnpm workspace**

```json
// package.json (root)
{
  "name": "wildcard",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "prettier": "^3.5.0",
    "typescript": "^5.7.0"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
```

**Step 2: Create @wildcard/types package**

```json
// packages/types/package.json
{
  "name": "@wildcard/types",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "eslint": "^9.0.0"
  }
}
```

```typescript
// packages/types/src/index.ts
export const VERSION = "0.0.1";
```

**Step 3: Create @wildcard/engine Rust crate**

```toml
# packages/engine/Cargo.toml
[package]
name = "wildcard-engine"
version = "0.0.1"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
opt-level = "s"
lto = true
```

```rust
// packages/engine/src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn version() -> String {
    "0.0.1".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert_eq!(version(), "0.0.1");
    }
}
```

**Step 4: Create @wildcard/renderer package**

```json
// packages/renderer/package.json
{
  "name": "@wildcard/renderer",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/",
    "test": "vitest run"
  },
  "dependencies": {
    "@wildcard/types": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "eslint": "^9.0.0"
  }
}
```

```typescript
// packages/renderer/src/index.ts
export const VERSION = "0.0.1";
```

**Step 5: Create wildcard-web app**

```json
// apps/web/package.json
{
  "name": "wildcard-web",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src/",
    "test": "vitest run"
  },
  "dependencies": {
    "@wildcard/types": "workspace:*",
    "@wildcard/renderer": "workspace:*",
    "hono": "^4.7.0",
    "preact": "^10.25.0"
  },
  "devDependencies": {
    "vite": "^6.2.0",
    "vitest": "^3.0.0",
    "eslint": "^9.0.0"
  }
}
```

**Step 6: Install dependencies and verify**

Run: `pnpm install`
Run: `cd packages/engine && cargo build`
Expected: Both succeed with no errors.

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo with all four packages"
```

---

### Task 0.2: CI Pipeline (GitHub Actions)

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`
- Create: `.prettierrc`
- Create: `.prettierignore`

**Step 1: Write CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  CARGO_TERM_COLOR: always

jobs:
  lint-format:
    name: Lint & Format
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint

  lint-rust:
    name: Clippy & Rustfmt
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: packages/engine
      - run: cd packages/engine && cargo fmt --check
      - run: cd packages/engine && cargo clippy -- -D warnings

  typecheck:
    name: TypeScript Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r build

  test-engine:
    name: Test Engine (Rust)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: packages/engine
      - run: cd packages/engine && cargo test

  test-ts:
    name: Test TypeScript Packages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r test

  build-wasm:
    name: Build WASM
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: packages/engine
      - run: cargo install wasm-pack
      - run: cd packages/engine && wasm-pack build --target web

  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high || true
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo install cargo-audit
      - run: cd packages/engine && cargo audit
```

**Step 2: Write Dependabot config**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "cargo"
    directory: "/packages/engine"
    schedule:
      interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

**Step 3: Write Prettier config**

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

```
# .prettierignore
dist/
node_modules/
packages/engine/target/
packages/engine/pkg/
*.wasm
```

**Step 4: Commit**

```bash
git add -A
git commit -m "ci: add GitHub Actions pipeline, Dependabot, and Prettier config"
```

---

### Task 0.3: Legal Files & README

**Files:**
- Create: `LICENSE`
- Create: `README.md`
- Create: `.gitignore`

**Step 1: Write MIT License**

```
MIT License

Copyright (c) 2026 WildCard Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 2: Write README with disclaimers**

```markdown
# WildCard

*The HyperCard 3.0 that Apple never shipped.*

WildCard is an open-source, web-based reimagining of HyperCard — the legendary
hypermedia tool created by Bill Atkinson in 1987. Build interactive stories, games,
flashcards, prototypes, and more using cards, buttons, paint tools, and WildTalk —
an English-like scripting language.

## Features

- **Jump right in** — no account needed to create and explore
- **Classic & 3.0 modes** — toggle between faithful B&W and the color version Apple never shipped
- **WildTalk scripting** — English-like language inspired by HyperTalk
- **Share your stacks** — export as HTML, share links, or publish to the gallery
- **Open-source engine** — embed WildCard in your own projects

## Packages

| Package | Description |
|---------|-------------|
| `@wildcard/engine` | Rust/WASM — WildTalk interpreter and stack runtime |
| `@wildcard/renderer` | TypeScript — Canvas 2D retro Mac rendering engine |
| `@wildcard/types` | TypeScript — shared types and FFI bridge |
| `wildcard-web` | TypeScript — web app (editor, player, gallery) |

## Getting Started

```bash
pnpm install
cd packages/engine && cargo build
pnpm dev
```

## Disclaimer

WildCard is an independent open-source project inspired by Apple's HyperCard
(1987–2004). It is not affiliated with, endorsed by, or associated with Apple Inc.
in any way.

"HyperCard" and "HyperTalk" are trademarks of Apple Inc. WildCard does not use
these trademarks as product names. References to HyperCard are for historical and
educational purposes only, constituting nominative fair use.

## License

[MIT](LICENSE)
```

**Step 3: Write .gitignore**

```
node_modules/
dist/
target/
pkg/
*.wasm
.env
.env.*
.DS_Store
```

**Step 4: Commit**

```bash
git add -A
git commit -m "docs: add README with disclaimers, MIT license, and .gitignore"
```

---

## Phase 1: @wildcard/types — Shared Foundation

*Engine Agent executes. No dependencies on other agents.*

### Task 1.1: Stack File Format Types

**Files:**
- Create: `packages/types/src/stack.ts`
- Create: `packages/types/src/card.ts`
- Create: `packages/types/src/objects.ts`
- Test: `packages/types/src/__tests__/stack.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/types/src/__tests__/stack.test.ts
import { describe, it, expect } from "vitest";
import { createStack, createCard, createButton, createField } from "../index";

describe("Stack format", () => {
  it("creates a default stack", () => {
    const stack = createStack("My Stack");
    expect(stack.name).toBe("My Stack");
    expect(stack.cards).toHaveLength(1);
    expect(stack.version).toBe("1.0");
  });

  it("creates a card with default background", () => {
    const card = createCard();
    expect(card.id).toBeDefined();
    expect(card.objects).toEqual([]);
    expect(card.backgroundId).toBeDefined();
  });

  it("creates a button with script", () => {
    const btn = createButton({ name: "Go", script: 'on mouseUp\n  go to next card\nend mouseUp' });
    expect(btn.type).toBe("button");
    expect(btn.name).toBe("Go");
    expect(btn.script).toContain("mouseUp");
  });

  it("creates a text field", () => {
    const field = createField({ name: "greeting", content: "Hello" });
    expect(field.type).toBe("field");
    expect(field.content).toBe("Hello");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/types && pnpm test`
Expected: FAIL — functions not defined

**Step 3: Write stack format types and factory functions**

```typescript
// packages/types/src/stack.ts
export interface WildCardStack {
  version: "1.0";
  name: string;
  id: string;
  width: number;
  height: number;
  cards: WildCardCard[];
  backgrounds: WildCardBackground[];
  script: string;
  createdAt: string;
  modifiedAt: string;
}

export interface WildCardCard {
  id: string;
  name: string;
  backgroundId: string;
  objects: WildCardObject[];
  script: string;
  paintData: string | null;
}

export interface WildCardBackground {
  id: string;
  name: string;
  objects: WildCardObject[];
  script: string;
  paintData: string | null;
}

export type WildCardObject = WildCardButton | WildCardField;

export interface WildCardButton {
  type: "button";
  id: string;
  name: string;
  rect: Rect;
  style: ButtonStyle;
  script: string;
  visible: boolean;
  enabled: boolean;
  hilite: boolean;
  color: string | null; // null = inherit (B&W in classic mode)
}

export interface WildCardField {
  type: "field";
  id: string;
  name: string;
  rect: Rect;
  style: FieldStyle;
  content: string;
  script: string;
  visible: boolean;
  lockText: boolean;
  color: string | null;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ButtonStyle = "rectangle" | "roundRect" | "checkbox" | "radioButton" | "transparent" | "shadow";
export type FieldStyle = "rectangle" | "scrolling" | "transparent" | "shadow";
```

```typescript
// packages/types/src/objects.ts
import type { WildCardButton, WildCardField } from "./stack";

let nextId = 1;
function genId(): string {
  return `obj_${nextId++}_${Date.now().toString(36)}`;
}

export function createButton(opts: Partial<WildCardButton> = {}): WildCardButton {
  return {
    type: "button",
    id: opts.id ?? genId(),
    name: opts.name ?? "New Button",
    rect: opts.rect ?? { x: 100, y: 100, width: 120, height: 30 },
    style: opts.style ?? "roundRect",
    script: opts.script ?? "",
    visible: opts.visible ?? true,
    enabled: opts.enabled ?? true,
    hilite: opts.hilite ?? false,
    color: opts.color ?? null,
  };
}

export function createField(opts: Partial<WildCardField> = {}): WildCardField {
  return {
    type: "field",
    id: opts.id ?? genId(),
    name: opts.name ?? "New Field",
    rect: opts.rect ?? { x: 100, y: 100, width: 200, height: 100 },
    style: opts.style ?? "rectangle",
    content: opts.content ?? "",
    script: opts.script ?? "",
    visible: opts.visible ?? true,
    lockText: opts.lockText ?? false,
    color: opts.color ?? null,
  };
}
```

```typescript
// packages/types/src/card.ts
import type { WildCardStack, WildCardCard, WildCardBackground } from "./stack";

let nextId = 1;
function genId(): string {
  return `card_${nextId++}_${Date.now().toString(36)}`;
}

function genBgId(): string {
  return `bg_${nextId++}_${Date.now().toString(36)}`;
}

export function createCard(opts: Partial<WildCardCard> = {}): WildCardCard {
  return {
    id: opts.id ?? genId(),
    name: opts.name ?? "",
    backgroundId: opts.backgroundId ?? genBgId(),
    objects: opts.objects ?? [],
    script: opts.script ?? "",
    paintData: opts.paintData ?? null,
  };
}

export function createBackground(opts: Partial<WildCardBackground> = {}): WildCardBackground {
  return {
    id: opts.id ?? genBgId(),
    name: opts.name ?? "",
    objects: opts.objects ?? [],
    script: opts.script ?? "",
    paintData: opts.paintData ?? null,
  };
}

export function createStack(name: string): WildCardStack {
  const bg = createBackground();
  const card = createCard({ backgroundId: bg.id });
  const now = new Date().toISOString();
  return {
    version: "1.0",
    name,
    id: `stack_${Date.now().toString(36)}`,
    width: 512,
    height: 342,
    cards: [card],
    backgrounds: [bg],
    script: "",
    createdAt: now,
    modifiedAt: now,
  };
}
```

```typescript
// packages/types/src/index.ts
export * from "./stack";
export * from "./card";
export * from "./objects";
```

**Step 4: Run test to verify it passes**

Run: `cd packages/types && pnpm test`
Expected: PASS — all 4 tests green

**Step 5: Commit**

```bash
git add packages/types/
git commit -m "feat(types): add stack file format types and factory functions"
```

---

### Task 1.2: Engine Event Types (FFI Bridge Contract)

**Files:**
- Create: `packages/types/src/events.ts`
- Test: `packages/types/src/__tests__/events.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/types/src/__tests__/events.test.ts
import { describe, it, expect } from "vitest";
import type { EngineEvent } from "../events";

describe("Engine events", () => {
  it("defines GoToCard event", () => {
    const event: EngineEvent = {
      type: "GoToCard",
      payload: { cardId: "card_1", direction: "next" },
    };
    expect(event.type).toBe("GoToCard");
  });

  it("defines SetField event", () => {
    const event: EngineEvent = {
      type: "SetField",
      payload: { fieldId: "field_1", content: "Hello" },
    };
    expect(event.type).toBe("SetField");
  });

  it("defines PlaySound event", () => {
    const event: EngineEvent = {
      type: "PlaySound",
      payload: { sound: "click.wav" },
    };
    expect(event.type).toBe("PlaySound");
  });

  it("defines ShowMessage event", () => {
    const event: EngineEvent = {
      type: "ShowMessage",
      payload: { message: "Hello!", style: "answer" },
    };
    expect(event.type).toBe("ShowMessage");
  });

  it("defines SetProperty event", () => {
    const event: EngineEvent = {
      type: "SetProperty",
      payload: { objectId: "btn_1", property: "color", value: "red" },
    };
    expect(event.type).toBe("SetProperty");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/types && pnpm test`
Expected: FAIL — EngineEvent type not found

**Step 3: Write event types**

```typescript
// packages/types/src/events.ts
export type EngineEvent =
  | { type: "GoToCard"; payload: { cardId: string; direction?: "next" | "prev" | "first" | "last" | "direct" } }
  | { type: "SetField"; payload: { fieldId: string; content: string } }
  | { type: "PlaySound"; payload: { sound: string } }
  | { type: "ShowMessage"; payload: { message: string; style: "answer" | "ask" } }
  | { type: "SetProperty"; payload: { objectId: string; property: string; value: string } }
  | { type: "VisualEffect"; payload: { effect: string; speed?: "fast" | "slow" | "normal" } }
  | { type: "HideObject"; payload: { objectId: string } }
  | { type: "ShowObject"; payload: { objectId: string } }
  | { type: "ScriptError"; payload: { message: string; line: number; handler: string } };

// Input events from renderer → engine
export type InputEvent =
  | { type: "mouseUp"; payload: { objectId: string | null; x: number; y: number } }
  | { type: "mouseDown"; payload: { objectId: string | null; x: number; y: number } }
  | { type: "keyDown"; payload: { key: string; modifiers: string[] } }
  | { type: "openCard"; payload: { cardId: string } }
  | { type: "closeCard"; payload: { cardId: string } }
  | { type: "idle"; payload: Record<string, never> }
  | { type: "executeScript"; payload: { script: string } };
```

Update `packages/types/src/index.ts` to add: `export * from "./events";`

**Step 4: Run test to verify it passes**

Run: `cd packages/types && pnpm test`
Expected: PASS — all tests green

**Step 5: Commit**

```bash
git add packages/types/
git commit -m "feat(types): add engine event types for WASM-JS bridge"
```

---

## Phase 2: @wildcard/engine — WildTalk Interpreter (Rust)

*Engine Agent executes. Depends on Phase 1 (event types define the FFI contract).*

### Task 2.1: WildTalk Lexer

**Files:**
- Create: `packages/engine/src/lexer.rs`
- Create: `packages/engine/src/token.rs`
- Modify: `packages/engine/src/lib.rs`

**Step 1: Write the failing test**

```rust
// In packages/engine/src/lexer.rs (bottom)
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lex_simple_handler() {
        let input = "on mouseUp\n  go to next card\nend mouseUp";
        let tokens = lex(input).unwrap();
        assert_eq!(tokens[0].kind, TokenKind::On);
        assert_eq!(tokens[1].kind, TokenKind::Identifier);
        assert_eq!(tokens[1].text, "mouseUp");
        assert_eq!(tokens[2].kind, TokenKind::Newline);
        assert_eq!(tokens[3].kind, TokenKind::Go);
    }

    #[test]
    fn test_lex_string_literal() {
        let input = r#"put "Hello, World" into field "name""#;
        let tokens = lex(input).unwrap();
        assert_eq!(tokens[0].kind, TokenKind::Put);
        assert_eq!(tokens[1].kind, TokenKind::StringLiteral);
        assert_eq!(tokens[1].text, "Hello, World");
    }

    #[test]
    fn test_lex_number() {
        let input = "put 42 into x";
        let tokens = lex(input).unwrap();
        assert_eq!(tokens[1].kind, TokenKind::NumberLiteral);
        assert_eq!(tokens[1].text, "42");
    }

    #[test]
    fn test_lex_comment() {
        let input = "-- this is a comment\nput 1 into x";
        let tokens = lex(input).unwrap();
        // Comments are skipped
        assert_eq!(tokens[0].kind, TokenKind::Newline);
        assert_eq!(tokens[1].kind, TokenKind::Put);
    }

    #[test]
    fn test_lex_operators() {
        let input = "if x > 10 then";
        let tokens = lex(input).unwrap();
        assert_eq!(tokens[0].kind, TokenKind::If);
        assert_eq!(tokens[2].kind, TokenKind::GreaterThan);
        assert_eq!(tokens[4].kind, TokenKind::Then);
    }
}
```

**Step 2: Run test to verify it fails**

Run: `cd packages/engine && cargo test`
Expected: FAIL — module not found

**Step 3: Write token types**

```rust
// packages/engine/src/token.rs
#[derive(Debug, Clone, PartialEq)]
pub enum TokenKind {
    // Keywords
    On, End, If, Then, Else, Repeat, With, To, Put, Into,
    Get, Set, The, Of, Go, Next, Prev, First, Last, Card,
    Field, Button, Show, Hide, Answer, Ask, Play, Sound,
    Wait, Second, Seconds, Pass, Send, Global, Return,
    Not, And, Or, Is, True, False, Fetch, Sort, By, Each,
    Lines, Words, Items, Characters, Line, Word, Item, Character,

    // Literals
    Identifier,
    StringLiteral,
    NumberLiteral,

    // Operators
    Plus, Minus, Star, Slash, Ampersand,
    Equals, NotEquals,
    LessThan, GreaterThan, LessOrEqual, GreaterOrEqual,
    LeftParen, RightParen, Comma,

    // Structure
    Newline,
    Eof,
}

#[derive(Debug, Clone)]
pub struct Token {
    pub kind: TokenKind,
    pub text: String,
    pub line: usize,
    pub col: usize,
}
```

**Step 4: Write the lexer**

```rust
// packages/engine/src/lexer.rs
use crate::token::{Token, TokenKind};

pub fn lex(input: &str) -> Result<Vec<Token>, String> {
    let mut tokens = Vec::new();
    let mut chars = input.chars().peekable();
    let mut line = 1;
    let mut col = 1;

    while let Some(&ch) = chars.peek() {
        match ch {
            // Skip spaces and tabs
            ' ' | '\t' => { chars.next(); col += 1; }

            // Newlines
            '\n' => {
                tokens.push(Token { kind: TokenKind::Newline, text: "\n".into(), line, col });
                chars.next(); line += 1; col = 1;
            }
            '\r' => {
                chars.next();
                if chars.peek() == Some(&'\n') { chars.next(); }
                tokens.push(Token { kind: TokenKind::Newline, text: "\n".into(), line, col });
                line += 1; col = 1;
            }

            // Comments
            '-' if { let mut peek = chars.clone(); peek.next(); peek.peek() == Some(&'-') } => {
                chars.next(); chars.next(); // skip --
                while let Some(&c) = chars.peek() {
                    if c == '\n' { break; }
                    chars.next();
                }
            }

            // String literals
            '"' => {
                chars.next(); // skip opening quote
                let start_col = col;
                col += 1;
                let mut s = String::new();
                loop {
                    match chars.next() {
                        Some('"') => { col += 1; break; }
                        Some(c) => { s.push(c); col += 1; }
                        None => return Err(format!("Unterminated string at line {line}")),
                    }
                }
                tokens.push(Token { kind: TokenKind::StringLiteral, text: s, line, col: start_col });
            }

            // Numbers
            '0'..='9' => {
                let start_col = col;
                let mut num = String::new();
                while let Some(&c) = chars.peek() {
                    if c.is_ascii_digit() || c == '.' { num.push(c); chars.next(); col += 1; }
                    else { break; }
                }
                tokens.push(Token { kind: TokenKind::NumberLiteral, text: num, line, col: start_col });
            }

            // Identifiers and keywords
            'a'..='z' | 'A'..='Z' | '_' => {
                let start_col = col;
                let mut word = String::new();
                while let Some(&c) = chars.peek() {
                    if c.is_alphanumeric() || c == '_' { word.push(c); chars.next(); col += 1; }
                    else { break; }
                }
                let kind = match word.to_lowercase().as_str() {
                    "on" => TokenKind::On,
                    "end" => TokenKind::End,
                    "if" => TokenKind::If,
                    "then" => TokenKind::Then,
                    "else" => TokenKind::Else,
                    "repeat" => TokenKind::Repeat,
                    "with" => TokenKind::With,
                    "to" => TokenKind::To,
                    "put" => TokenKind::Put,
                    "into" => TokenKind::Into,
                    "get" => TokenKind::Get,
                    "set" => TokenKind::Set,
                    "the" => TokenKind::The,
                    "of" => TokenKind::Of,
                    "go" => TokenKind::Go,
                    "next" => TokenKind::Next,
                    "prev" | "previous" => TokenKind::Prev,
                    "first" => TokenKind::First,
                    "last" => TokenKind::Last,
                    "card" => TokenKind::Card,
                    "field" => TokenKind::Field,
                    "button" => TokenKind::Button,
                    "show" => TokenKind::Show,
                    "hide" => TokenKind::Hide,
                    "answer" => TokenKind::Answer,
                    "ask" => TokenKind::Ask,
                    "play" => TokenKind::Play,
                    "sound" => TokenKind::Sound,
                    "wait" => TokenKind::Wait,
                    "second" => TokenKind::Second,
                    "seconds" => TokenKind::Seconds,
                    "pass" => TokenKind::Pass,
                    "send" => TokenKind::Send,
                    "global" => TokenKind::Global,
                    "return" => TokenKind::Return,
                    "not" => TokenKind::Not,
                    "and" => TokenKind::And,
                    "or" => TokenKind::Or,
                    "is" => TokenKind::Is,
                    "true" => TokenKind::True,
                    "false" => TokenKind::False,
                    "fetch" => TokenKind::Fetch,
                    "sort" => TokenKind::Sort,
                    "by" => TokenKind::By,
                    "each" => TokenKind::Each,
                    "lines" => TokenKind::Lines,
                    "words" => TokenKind::Words,
                    "items" => TokenKind::Items,
                    "characters" => TokenKind::Characters,
                    "line" => TokenKind::Line,
                    "word" => TokenKind::Word,
                    "item" => TokenKind::Item,
                    "character" => TokenKind::Character,
                    _ => TokenKind::Identifier,
                };
                tokens.push(Token { kind, text: word, line, col: start_col });
            }

            // Operators
            '+' => { tokens.push(Token { kind: TokenKind::Plus, text: "+".into(), line, col }); chars.next(); col += 1; }
            '*' => { tokens.push(Token { kind: TokenKind::Star, text: "*".into(), line, col }); chars.next(); col += 1; }
            '/' => { tokens.push(Token { kind: TokenKind::Slash, text: "/".into(), line, col }); chars.next(); col += 1; }
            '&' => { tokens.push(Token { kind: TokenKind::Ampersand, text: "&".into(), line, col }); chars.next(); col += 1; }
            '(' => { tokens.push(Token { kind: TokenKind::LeftParen, text: "(".into(), line, col }); chars.next(); col += 1; }
            ')' => { tokens.push(Token { kind: TokenKind::RightParen, text: ")".into(), line, col }); chars.next(); col += 1; }
            ',' => { tokens.push(Token { kind: TokenKind::Comma, text: ",".into(), line, col }); chars.next(); col += 1; }
            '=' => { tokens.push(Token { kind: TokenKind::Equals, text: "=".into(), line, col }); chars.next(); col += 1; }
            '<' => {
                chars.next(); col += 1;
                if chars.peek() == Some(&'=') {
                    chars.next(); col += 1;
                    tokens.push(Token { kind: TokenKind::LessOrEqual, text: "<=".into(), line, col: col - 2 });
                } else if chars.peek() == Some(&'>') {
                    chars.next(); col += 1;
                    tokens.push(Token { kind: TokenKind::NotEquals, text: "<>".into(), line, col: col - 2 });
                } else {
                    tokens.push(Token { kind: TokenKind::LessThan, text: "<".into(), line, col: col - 1 });
                }
            }
            '>' => {
                chars.next(); col += 1;
                if chars.peek() == Some(&'=') {
                    chars.next(); col += 1;
                    tokens.push(Token { kind: TokenKind::GreaterOrEqual, text: ">=".into(), line, col: col - 2 });
                } else {
                    tokens.push(Token { kind: TokenKind::GreaterThan, text: ">".into(), line, col: col - 1 });
                }
            }

            _ => {
                return Err(format!("Unexpected character '{ch}' at line {line}, col {col}"));
            }
        }
    }

    tokens.push(Token { kind: TokenKind::Eof, text: "".into(), line, col });
    Ok(tokens)
}

#[cfg(test)]
mod tests {
    // ... tests from Step 1 ...
}
```

Update `packages/engine/src/lib.rs`:
```rust
mod token;
mod lexer;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn version() -> String {
    "0.0.1".to_string()
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/engine && cargo test`
Expected: PASS — all 5 lexer tests green

**Step 5: Commit**

```bash
git add packages/engine/
git commit -m "feat(engine): add WildTalk lexer with keywords, literals, and operators"
```

---

### Task 2.2: WildTalk Parser (AST)

**Files:**
- Create: `packages/engine/src/ast.rs`
- Create: `packages/engine/src/parser.rs`

**Step 1: Write the failing test**

```rust
// packages/engine/src/parser.rs (bottom)
#[cfg(test)]
mod tests {
    use super::*;
    use crate::lexer::lex;

    #[test]
    fn test_parse_handler() {
        let tokens = lex("on mouseUp\n  go to next card\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        assert_eq!(script.handlers.len(), 1);
        assert_eq!(script.handlers[0].name, "mouseUp");
    }

    #[test]
    fn test_parse_put_into() {
        let tokens = lex("on mouseUp\n  put \"hello\" into field \"name\"\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Put { .. } => {} // ok
            other => panic!("Expected Put, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_if_else() {
        let tokens = lex("on mouseUp\n  if x > 10 then\n    go to next card\n  else\n    answer \"nope\"\n  end if\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::If { else_body, .. } => {
                assert!(else_body.is_some());
            }
            other => panic!("Expected If, got {:?}", other),
        }
    }

    #[test]
    fn test_parse_repeat() {
        let tokens = lex("on mouseUp\n  repeat with i = 1 to 5\n    show i\n  end repeat\nend mouseUp").unwrap();
        let script = parse(tokens).unwrap();
        match &script.handlers[0].body[0] {
            Statement::Repeat { .. } => {} // ok
            other => panic!("Expected Repeat, got {:?}", other),
        }
    }
}
```

**Step 2: Run test to verify it fails**

Run: `cd packages/engine && cargo test`
Expected: FAIL — ast/parser modules not found

**Step 3: Write AST types**

```rust
// packages/engine/src/ast.rs
#[derive(Debug, Clone)]
pub struct Script {
    pub handlers: Vec<Handler>,
}

#[derive(Debug, Clone)]
pub struct Handler {
    pub name: String,
    pub params: Vec<String>,
    pub body: Vec<Statement>,
}

#[derive(Debug, Clone)]
pub enum Statement {
    Put {
        value: Expression,
        target: Expression,
    },
    Go {
        destination: GoDestination,
    },
    If {
        condition: Expression,
        then_body: Vec<Statement>,
        else_body: Option<Vec<Statement>>,
    },
    Repeat {
        var: String,
        start: Expression,
        end: Expression,
        body: Vec<Statement>,
    },
    RepeatWhile {
        condition: Expression,
        body: Vec<Statement>,
    },
    Set {
        property: PropertyRef,
        value: Expression,
    },
    Show {
        target: Expression,
    },
    Hide {
        target: Expression,
    },
    Answer {
        message: Expression,
    },
    Ask {
        prompt: Expression,
    },
    PlaySound {
        sound: Expression,
    },
    Wait {
        duration: Expression,
    },
    Pass {
        message: String,
    },
    Return {
        value: Option<Expression>,
    },
    Send {
        message: String,
        target: Expression,
    },
    Global {
        names: Vec<String>,
    },
    Fetch {
        url: Expression,
        target: Expression,
    },
    ExpressionStatement {
        expr: Expression,
    },
}

#[derive(Debug, Clone)]
pub enum GoDestination {
    Next,
    Prev,
    First,
    Last,
    CardByName(String),
    CardByExpr(Expression),
}

#[derive(Debug, Clone)]
pub enum Expression {
    StringLiteral(String),
    NumberLiteral(f64),
    BoolLiteral(bool),
    Variable(String),
    FieldRef { name: Box<Expression> },
    ButtonRef { name: Box<Expression> },
    BinaryOp { left: Box<Expression>, op: BinaryOp, right: Box<Expression> },
    UnaryOp { op: UnaryOp, operand: Box<Expression> },
    FunctionCall { name: String, args: Vec<Expression> },
    PropertyOf { property: String, object: Box<Expression> },
    ChunkExpr { chunk_type: ChunkType, index: Box<Expression>, source: Box<Expression> },
    It,
    The(Box<Expression>),
}

#[derive(Debug, Clone)]
pub struct PropertyRef {
    pub property: String,
    pub object: Expression,
}

#[derive(Debug, Clone)]
pub enum BinaryOp {
    Add, Subtract, Multiply, Divide, Concat,
    Equal, NotEqual, LessThan, GreaterThan, LessOrEqual, GreaterOrEqual,
    And, Or, Is,
}

#[derive(Debug, Clone)]
pub enum UnaryOp {
    Not, Negate,
}

#[derive(Debug, Clone)]
pub enum ChunkType {
    Character, Word, Item, Line,
}
```

**Step 4: Write the parser** (recursive descent)

The parser is substantial (~300-400 lines). The agent should implement a recursive descent parser that:
- Parses `on <name> ... end <name>` handler blocks
- Parses statements: `put`, `go`, `if/then/else/end if`, `repeat/end repeat`, `set`, `show`, `hide`, `answer`, `ask`, `play sound`, `wait`, `pass`, `return`, `global`, `fetch`
- Parses expressions: literals, variables, field/button refs, binary ops, chunking expressions
- Skips newlines between statements
- Returns `Result<Script, String>` with useful error messages including line numbers

Key parsing functions:
```rust
pub fn parse(tokens: Vec<Token>) -> Result<Script, String> { ... }
fn parse_handler(tokens: &[Token], pos: &mut usize) -> Result<Handler, String> { ... }
fn parse_statement(tokens: &[Token], pos: &mut usize) -> Result<Statement, String> { ... }
fn parse_expression(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> { ... }
fn parse_comparison(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> { ... }
fn parse_addition(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> { ... }
fn parse_primary(tokens: &[Token], pos: &mut usize) -> Result<Expression, String> { ... }
```

Update `lib.rs` to add: `mod ast; mod parser;`

**Step 5: Run test to verify it passes**

Run: `cd packages/engine && cargo test`
Expected: PASS — all parser tests green

**Step 6: Commit**

```bash
git add packages/engine/
git commit -m "feat(engine): add WildTalk parser with AST for handlers, statements, and expressions"
```

---

### Task 2.3: Tree-Walk Interpreter

**Files:**
- Create: `packages/engine/src/interpreter.rs`
- Create: `packages/engine/src/runtime.rs`

**Step 1: Write the failing test**

```rust
// packages/engine/src/interpreter.rs (bottom)
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_put_into_variable() {
        let mut rt = Runtime::new_test();
        rt.execute_script("on test\n  put 42 into x\nend test").unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("x"), Some(Value::Number(42.0)));
    }

    #[test]
    fn test_if_true() {
        let mut rt = Runtime::new_test();
        rt.execute_script("on test\n  put 1 into x\n  if x = 1 then\n    put \"yes\" into result\n  end if\nend test").unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("result"), Some(Value::Text("yes".into())));
    }

    #[test]
    fn test_repeat_loop() {
        let mut rt = Runtime::new_test();
        rt.execute_script("on test\n  put 0 into sum\n  repeat with i = 1 to 5\n    put sum + i into sum\n  end repeat\nend test").unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("sum"), Some(Value::Number(15.0)));
    }

    #[test]
    fn test_string_concat() {
        let mut rt = Runtime::new_test();
        rt.execute_script("on test\n  put \"Hello\" & \" World\" into msg\nend test").unwrap();
        rt.send_message("test");
        assert_eq!(rt.get_variable("msg"), Some(Value::Text("Hello World".into())));
    }

    #[test]
    fn test_go_emits_event() {
        let mut rt = Runtime::new_test();
        rt.execute_script("on test\n  go to next card\nend test").unwrap();
        rt.send_message("test");
        assert!(rt.events().iter().any(|e| matches!(e, EngineOutput::GoToCard { .. })));
    }
}
```

**Step 2: Run test to verify it fails**

Run: `cd packages/engine && cargo test`
Expected: FAIL

**Step 3: Write the runtime and interpreter**

The runtime holds:
- `variables: HashMap<String, Value>` — local and global variables
- `handlers: HashMap<String, Handler>` — compiled handlers
- `events: Vec<EngineOutput>` — emitted events (collected, then serialized to JSON for FFI)

```rust
// packages/engine/src/runtime.rs
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Text(String),
    Number(f64),
    Boolean(bool),
    Empty,
}

#[derive(Debug, Clone)]
pub enum EngineOutput {
    GoToCard { direction: String, card_id: Option<String> },
    SetField { field_id: String, content: String },
    ShowMessage { message: String, style: String },
    PlaySound { sound: String },
    SetProperty { object_id: String, property: String, value: String },
    HideObject { object_id: String },
    ShowObject { object_id: String },
}

pub struct Runtime {
    pub variables: HashMap<String, Value>,
    pub globals: HashMap<String, Value>,
    handlers: HashMap<String, crate::ast::Handler>,
    events: Vec<EngineOutput>,
    pub fields: HashMap<String, String>, // field name -> content
}
```

The interpreter implements:
- `execute_handler(handler, args)` — runs a handler's body
- `execute_statement(stmt)` — dispatches each statement type
- `evaluate_expression(expr)` — evaluates to `Value`
- `send_message(name)` — looks up and executes a handler
- Arithmetic on `Value` (auto-coerce text↔number like HyperTalk)
- String concatenation with `&`
- Comparison operators
- Event emission for `go`, `answer`, `play sound`, `set`, `show`, `hide`

Update `lib.rs` to add: `mod runtime; mod interpreter;`

**Step 4: Run test to verify it passes**

Run: `cd packages/engine && cargo test`
Expected: PASS — all interpreter tests green

**Step 5: Commit**

```bash
git add packages/engine/
git commit -m "feat(engine): add tree-walk interpreter with variables, control flow, and event emission"
```

---

### Task 2.4: WASM FFI Bridge

**Files:**
- Modify: `packages/engine/src/lib.rs`

**Step 1: Write the failing test**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wasm_create_runtime() {
        let rt = WildCardEngine::new();
        assert_eq!(rt.version(), "0.0.1");
    }

    #[test]
    fn test_wasm_load_and_execute() {
        let mut rt = WildCardEngine::new();
        rt.load_script("on mouseUp\n  put 42 into x\nend mouseUp");
        let events_json = rt.send_message("mouseUp");
        // Should return empty events array (put into variable doesn't emit)
        assert!(events_json.contains("[]") || events_json == "[]");
    }

    #[test]
    fn test_wasm_go_event() {
        let mut rt = WildCardEngine::new();
        rt.load_script("on mouseUp\n  go to next card\nend mouseUp");
        let events_json = rt.send_message("mouseUp");
        assert!(events_json.contains("GoToCard"));
    }
}
```

**Step 2: Run test to verify it fails**

Run: `cd packages/engine && cargo test`
Expected: FAIL

**Step 3: Write WASM-exposed API**

```rust
// packages/engine/src/lib.rs
mod token;
mod lexer;
mod ast;
mod parser;
mod runtime;
mod interpreter;

use wasm_bindgen::prelude::*;
use runtime::Runtime;

#[wasm_bindgen]
pub struct WildCardEngine {
    runtime: Runtime,
}

#[wasm_bindgen]
impl WildCardEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { runtime: Runtime::new() }
    }

    pub fn version(&self) -> String {
        "0.0.1".to_string()
    }

    /// Load a WildTalk script (compiles handlers)
    pub fn load_script(&mut self, source: &str) -> String {
        match self.runtime.load_script(source) {
            Ok(()) => "ok".to_string(),
            Err(e) => format!("error: {e}"),
        }
    }

    /// Send a message (e.g. "mouseUp") and get back JSON array of events
    pub fn send_message(&mut self, message: &str) -> String {
        self.runtime.send_message(message);
        let events = self.runtime.drain_events();
        serde_json::to_string(&events).unwrap_or_else(|_| "[]".to_string())
    }

    /// Execute a single line from the message box
    pub fn execute_line(&mut self, line: &str) -> String {
        match self.runtime.execute_line(line) {
            Ok(result) => result,
            Err(e) => format!("error: {e}"),
        }
    }

    /// Load a stack (JSON) into the runtime
    pub fn load_stack(&mut self, json: &str) -> String {
        match self.runtime.load_stack_json(json) {
            Ok(()) => "ok".to_string(),
            Err(e) => format!("error: {e}"),
        }
    }

    /// Get current stack state as JSON
    pub fn get_state(&self) -> String {
        self.runtime.get_state_json()
    }
}
```

**Step 4: Run tests and build WASM**

Run: `cd packages/engine && cargo test`
Expected: PASS

Run: `cd packages/engine && wasm-pack build --target web`
Expected: Creates `pkg/` directory with `.wasm` + JS glue

**Step 5: Commit**

```bash
git add packages/engine/
git commit -m "feat(engine): add WASM FFI bridge exposing WildCardEngine to JavaScript"
```

---

## Phase 3: @wildcard/renderer — Retro Mac Canvas

*Renderer Agent executes. Can start once types (Phase 1) are done. Does not depend on engine.*

### Task 3.1: Canvas Setup & Theme System

**Files:**
- Create: `packages/renderer/src/canvas.ts`
- Create: `packages/renderer/src/theme.ts`
- Create: `packages/renderer/src/themes/classic.ts`
- Create: `packages/renderer/src/themes/v3.ts`
- Test: `packages/renderer/src/__tests__/theme.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/renderer/src/__tests__/theme.test.ts
import { describe, it, expect } from "vitest";
import { classicTheme } from "../themes/classic";
import { v3Theme } from "../themes/v3";
import type { Theme } from "../theme";

describe("Theme system", () => {
  it("classic theme has B&W colors only", () => {
    expect(classicTheme.colors.background).toBe("#ffffff");
    expect(classicTheme.colors.foreground).toBe("#000000");
    expect(classicTheme.name).toBe("classic");
  });

  it("v3 theme has color support", () => {
    expect(v3Theme.colors.accent).toBeDefined();
    expect(v3Theme.name).toBe("v3");
  });

  it("both themes implement Theme interface", () => {
    const themes: Theme[] = [classicTheme, v3Theme];
    for (const theme of themes) {
      expect(theme.colors).toBeDefined();
      expect(theme.fonts).toBeDefined();
      expect(theme.metrics).toBeDefined();
    }
  });
});
```

**Step 2: Run to verify failure, then implement Theme interface, classic theme (System 7 B&W), and v3 theme (color).**

The Theme defines: colors, fonts (Chicago-style bitmap font metrics), metrics (border widths, scrollbar sizes, title bar height, menu bar height), and drawing primitives (how to render a button, field, window, scrollbar, menu).

**Step 3: Commit**

```bash
git add packages/renderer/
git commit -m "feat(renderer): add theme system with Classic and 3.0 skins"
```

---

### Task 3.2: Window Chrome & Menu Bar

**Files:**
- Create: `packages/renderer/src/components/menubar.ts`
- Create: `packages/renderer/src/components/window.ts`
- Create: `packages/renderer/src/components/titlebar.ts`
- Test: `packages/renderer/src/__tests__/menubar.test.ts`

Implements:
- Menu bar rendering (File, Edit, Go, Tools, Objects)
- Dropdown menu rendering with keyboard navigation
- Classic Mac window chrome (title bar with horizontal lines, close box, resize)
- Window dragging and z-ordering
- Both Classic (B&W pixel patterns) and 3.0 (color gradients) rendering

**Step 1-5: TDD cycle as above.**

**Commit:**
```bash
git commit -m "feat(renderer): add menu bar and window chrome with Classic/3.0 rendering"
```

---

### Task 3.3: Card Canvas & Object Rendering

**Files:**
- Create: `packages/renderer/src/components/card.ts`
- Create: `packages/renderer/src/components/button.ts`
- Create: `packages/renderer/src/components/field.ts`
- Create: `packages/renderer/src/render-loop.ts`

Implements:
- Card canvas at 512x342 (classic) with nearest-neighbor scaling
- Button rendering (all 6 styles) in both themes
- Field rendering (all 4 styles) with text wrapping and scrolling
- Dirty-region tracking — only repaint changed areas
- `requestAnimationFrame` render loop with layer caching

**Commit:**
```bash
git commit -m "feat(renderer): add card canvas with button and field rendering"
```

---

### Task 3.4: Tool Palette & Paint Tools

**Files:**
- Create: `packages/renderer/src/components/palette.ts`
- Create: `packages/renderer/src/tools/browse.ts`
- Create: `packages/renderer/src/tools/pencil.ts`
- Create: `packages/renderer/src/tools/brush.ts`
- Create: `packages/renderer/src/tools/eraser.ts`
- Create: `packages/renderer/src/tools/line.ts`
- Create: `packages/renderer/src/tools/rect.ts`
- Create: `packages/renderer/src/tools/oval.ts`
- Create: `packages/renderer/src/tools/spray.ts`
- Create: `packages/renderer/src/tools/bucket.ts`
- Create: `packages/renderer/src/tools/text.ts`
- Create: `packages/renderer/src/tools/tool.ts` (interface)

Implements:
- Floating tool palette with all classic tools
- `Tool` interface that extensions can implement
- Each tool handles mouseDown/mouseMove/mouseUp on the card canvas
- Paint data stored as pixel data on the card/background
- Browse tool sends events to the engine (mouseUp on buttons)

**Commit:**
```bash
git commit -m "feat(renderer): add tool palette with paint tools and Tool interface"
```

---

### Task 3.5: Script Editor & Message Box

**Files:**
- Create: `packages/renderer/src/components/script-editor.ts`
- Create: `packages/renderer/src/components/message-box.ts`

Implements:
- Script editor opens as a draggable window
- Basic syntax highlighting for WildTalk (keywords, strings, comments)
- Line numbers
- Message box at bottom of screen — type commands, press Enter to execute
- Both render in the active theme

**Commit:**
```bash
git commit -m "feat(renderer): add script editor with syntax highlighting and message box"
```

---

### Task 3.6: Touch & Responsive Support

**Files:**
- Create: `packages/renderer/src/input/touch.ts`
- Create: `packages/renderer/src/input/mouse.ts`
- Create: `packages/renderer/src/input/keyboard.ts`
- Create: `packages/renderer/src/layout/responsive.ts`

Implements:
- Touch event → mouse event mapping
- Pinch-to-zoom on canvas
- Responsive canvas scaling (nearest-neighbor upscale)
- Mobile tool palette as bottom drawer
- Keyboard shortcut system (desktop) and long-press context menus (touch)

**Commit:**
```bash
git commit -m "feat(renderer): add touch support, responsive layout, and input handling"
```

---

## Phase 4: Integration — Engine + Renderer

*Team Lead coordinates. Both agents collaborate.*

### Task 4.1: Wire Engine WASM to Renderer

**Files:**
- Create: `packages/renderer/src/bridge.ts`
- Modify: `packages/renderer/src/render-loop.ts`

Implements:
- Load WASM module async
- Create `WildCardEngine` instance
- Route input events (mouse, keyboard) → engine
- Route engine output events → renderer updates
- Handle `GoToCard` (switch displayed card), `SetField` (update field content), `ShowMessage` (dialog), etc.

**Commit:**
```bash
git commit -m "feat: wire WASM engine to Canvas renderer via event bridge"
```

---

### Task 4.2: Stack Load/Save (localStorage)

**Files:**
- Create: `packages/renderer/src/storage/local.ts`

Implements:
- Save stack to localStorage as JSON
- Load stack from localStorage
- Auto-save on changes (debounced)
- List saved stacks

**Commit:**
```bash
git commit -m "feat: add localStorage stack persistence with auto-save"
```

---

## Phase 5: Web App (wildcard-web)

*Web App Agent executes. Depends on Phases 3-4 for the renderer being functional.*

### Task 5.1: Vite + Preact SPA Shell

**Files:**
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app.tsx`
- Create: `apps/web/src/pages/editor.tsx`
- Create: `apps/web/src/pages/player.tsx`
- Create: `apps/web/src/pages/gallery.tsx`
- Create: `apps/web/src/pages/learn.tsx`
- Create: `apps/web/src/pages/legal.tsx`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`

Implements:
- Preact SPA with client-side routing
- Editor page: mounts the renderer canvas, full authoring environment
- Player page: loads a stack by ID, read-only browsing
- Gallery page: placeholder for community stacks
- Learn page: placeholder for tutorials
- Legal page: disclaimers, trademark acknowledgments, license

**Commit:**
```bash
git commit -m "feat(web): add Vite + Preact SPA with routing and page shells"
```

---

### Task 5.2: Hono API Server

**Files:**
- Create: `apps/web/src/server/index.ts`
- Create: `apps/web/src/server/routes/stacks.ts`
- Create: `apps/web/src/server/routes/auth.ts`
- Create: `apps/web/src/server/routes/gallery.ts`
- Create: `apps/web/src/server/db/schema.sql`
- Create: `apps/web/src/server/db/client.ts`

Implements:
- Hono server serving the Vite SPA + API routes
- `POST /api/stacks` — save a stack (authenticated)
- `GET /api/stacks/:id` — get a stack
- `GET /api/gallery` — list published stacks (paginated)
- `POST /api/gallery/publish` — publish a stack (with moderation)
- PostgreSQL schema: users, stacks, gallery_entries, moderation_queue
- Auth: email/password with bcrypt + JWT, GitHub OAuth

**Commit:**
```bash
git commit -m "feat(web): add Hono API with stack CRUD, auth, and gallery endpoints"
```

---

### Task 5.3: Gallery with SSR Meta Tags

**Files:**
- Modify: `apps/web/src/server/routes/gallery.ts`
- Create: `apps/web/src/server/routes/ssr.ts`
- Create: `apps/web/src/server/thumbnail.ts`

Implements:
- Stack permalink pages with server-rendered OG meta tags
- Thumbnail generation (render card 1 to canvas, export as PNG)
- Open Graph image for social sharing
- JSON-LD structured data
- Sitemap generation at `/sitemap.xml`

**Commit:**
```bash
git commit -m "feat(web): add SSR meta tags, thumbnails, OG cards, and sitemap for SEO"
```

---

### Task 5.4: Content Moderation

**Files:**
- Create: `apps/web/src/server/moderation/index.ts`
- Create: `apps/web/src/server/moderation/text-scan.ts`
- Create: `apps/web/src/server/moderation/image-scan.ts`

Implements:
- AI text scan on publish (check for hate speech, violence, etc.)
- Image scan for NSFW/harmful content
- Moderation queue for flagged content
- Admin review interface (simple)
- User reporting endpoint

**Commit:**
```bash
git commit -m "feat(web): add content moderation with AI scanning and review queue"
```

---

### Task 5.5: HTML Export

**Files:**
- Create: `apps/web/src/export/html.ts`

Implements:
- Bundle WASM engine + renderer + stack data into a single .html file
- Self-contained — no external dependencies
- Minified for reasonable file size
- Works offline

**Commit:**
```bash
git commit -m "feat(web): add self-contained HTML export for stacks"
```

---

## Phase 6: Historical Context & Onboarding

*Web App Agent or dedicated Content Agent.*

### Task 6.1: Onboarding Stack

Create an interactive WildCard stack (JSON) that teaches:
1. Card 1: "Welcome to WildCard" — what this is
2. Card 2: "The Story of HyperCard" — Bill Atkinson, 1987
3. Card 3: "What People Built" — Myst, wikis, the web
4. Card 4: "Why It Disappeared" — Apple's neglect
5. Card 5: "The 3.0 That Never Was" — what we're recreating
6. Card 6: "Your Turn" — try clicking this button → teaches interaction
7. Card 7: "Level Up" — introduces painting, then scripting

### Task 6.2: Learn Pages

Static content for `/learn`:
- What was HyperCard?
- WildTalk basics
- Building your first stack
- HyperCard timeline (1987–2004)

### Task 6.3: Starter Templates

Pre-built stacks:
- Address Book (classic HyperCard demo)
- Quiz Game
- Choose Your Own Adventure
- Simple Art Gallery

---

## Phase 7: Polish & Deploy

### Task 7.1: Service Worker & Offline Support
### Task 7.2: Performance Audit (Lighthouse 90+)
### Task 7.3: Hetzner VPS Deployment (pm2 + nginx)
### Task 7.4: Domain Setup & SSL
### Task 7.5: GitHub Repo — Public with Branch Protection

---

## Execution Order & Dependencies

```
Phase 0 (scaffolding) ──────────────────────────────┐
    │                                                │
    ├── Phase 1 (types) ─────────────────┐           │
    │       │                            │           │
    │       ├── Phase 2 (engine/Rust) ───┤           │
    │       │                            │           │
    │       └── Phase 3 (renderer/TS) ───┤           │
    │                                    │           │
    │               Phase 4 (integration)┘           │
    │                    │                           │
    │               Phase 5 (web app) ──────────────┘
    │                    │
    │               Phase 6 (content)
    │                    │
    └───────────── Phase 7 (polish & deploy)
```

**Parallel work**: Phases 2 and 3 can run simultaneously after Phase 1.
