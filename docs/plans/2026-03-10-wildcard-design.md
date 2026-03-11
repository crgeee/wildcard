# WildCard — Design Document

_"The HyperCard 3.0 that Apple never shipped."_

**Date**: 2026-03-10
**Status**: Approved

---

## 1. Vision

WildCard is an open-source web-based reimagining of Apple's HyperCard, presented as the
unreleased "version 3.0" that was shown at WWDC 1996 but never shipped. It combines faithful
retro Mac aesthetics with the features Apple never delivered: color, networking, and modern
extensibility.

It is educational, fun, and actually useful — people can build interactive stories, games,
flashcards, prototypes, digital zines, or anything they can imagine using cards, buttons,
fields, paint tools, and an English-like scripting language called WildTalk.

### The #1 Rule: Recreate the Experience

**This is not a "modern app inspired by HyperCard." This IS HyperCard — running in your
browser.** The goal is that someone who used HyperCard in 1996 should feel instant, visceral
recognition. Someone who never used it should feel like they've discovered a time capsule.

Every design decision must pass this test: **"Would this feel at home on a Mac in 1996?"**

What this means in practice:

- **Pixel-perfect UI chrome**: The menu bar, windows, scrollbars, buttons, and fields must
  look and behave exactly like classic Mac OS System 7-8. Not "similar to" — identical in
  spirit. The horizontal lines in the title bar. The close box in the top-left. The
  one-pixel borders. The Chicago-style bitmap font. The way menus highlight when you drag
  through them.
- **The same interaction model**: You click the Browse tool to interact. You click the Button
  tool to create buttons. You double-click an object to see its script. You open the Message
  Box and type commands. This isn't a modern UI with a retro skin — it's the original
  interaction model, preserved.
- **The same progressive disclosure**: HyperCard had five user levels (Browsing → Typing →
  Painting → Authoring → Scripting). New users start simple and discover power gradually.
  We don't dump a modern toolbar on them.
- **The same "magic moment"**: The magic of HyperCard was: you click a button, it goes to
  another card. You open the script, you see `on mouseUp / go to next card / end mouseUp`.
  You change "next" to "previous" and it works. That instant connection between action and
  code — that's what we're recreating.
- **The same sounds and feel**: Menu clicks, button highlights, card transitions (dissolve,
  wipe, barn door). The visual effects that made HyperCard feel alive.
- **The 3.0 layer is additive, not replacement**: When you toggle to 3.0 mode, the color and
  new features appear _within_ the classic chrome. The window frames, menus, and interaction
  model stay the same. It should feel like someone at Apple in 1996 added color support to
  HyperCard — not like a modern redesign.

What this does NOT mean:

- We don't sacrifice usability for nostalgia. Touch support, responsive scaling, and
  accessibility are modern additions that don't break the illusion.
- We don't emulate bugs or limitations that served no purpose (like the 32KB script limit).
- We don't require Classic Mac OS knowledge. The onboarding teaches you everything.

### Core Principles

- **Recreate the experience** — this should feel like using HyperCard, not like reading about it
- **Jump in immediately** — no account required to create, edit, or export
- **Faithful to the original** — pixel-perfect retro Mac UI, same interaction model, same magic
- **The 3.0 that never was** — toggle between Classic (1-bit B&W) and 3.0 (color) rendering
- **Open-source engine** — the core is a reusable library, not locked to our web app
- **Educational** — teaches HyperCard history and programming through the tool itself

---

## 2. Architecture

Monorepo with four packages:

```
wildcard/
├── packages/
│   ├── engine/        # @wildcard/engine — Rust/WASM
│   ├── renderer/      # @wildcard/renderer — TypeScript/Canvas 2D
│   └── types/         # @wildcard/types — TypeScript
├── apps/
│   └── web/           # wildcard-web — Hono + Vite
└── docs/
```

### Package Responsibilities

| Package              | Language    | Responsibility                                                             |
| -------------------- | ----------- | -------------------------------------------------------------------------- |
| `@wildcard/engine`   | Rust → WASM | WildTalk parser, interpreter, stack/card data model, event system          |
| `@wildcard/renderer` | TypeScript  | Canvas 2D rendering — retro Mac UI, two skins (Classic + 3.0), paint tools |
| `@wildcard/types`    | TypeScript  | Shared type definitions, stack file format (JSON), JS↔WASM FFI bridge      |
| `wildcard-web`       | TypeScript  | Hono API + Vite SPA — editor, player, gallery, auth, moderation, SEO       |

### Data Flow

```
User interaction (click/type/touch)
  → Event dispatched to @wildcard/engine (WASM)
  → WildTalk script executes (if any)
  → Engine emits state changes (GoToCard, SetField, PlaySound, etc.)
  → @wildcard/renderer receives state, paints to Canvas
  → User sees result
```

The engine is headless — it processes scripts and emits structured events. The renderer
subscribes to state and paints pixels. Clean separation.

---

## 3. WildTalk — The Scripting Language

### Philosophy

English-like syntax faithful to HyperTalk's spirit, with "3.0" additions for color,
networking, and multimedia.

### Syntax Examples

```wildtalk
-- Navigate between cards
on mouseUp
  go to next card
end mouseUp

-- Variables and fields
on mouseUp
  put "Hello, World" into field "greeting"
  put the first word of field "greeting" into myVar
  show myVar
end mouseUp

-- Conditionals
on mouseUp
  if field "score" > 10 then
    go to card "winner"
  else
    answer "Keep trying!"
  end if
end mouseUp

-- Loops
on mouseUp
  repeat with i = 1 to 5
    show "Card " & i
    wait 1 second
  end repeat
end mouseUp

-- "3.0" additions
on mouseUp
  set the color of button "submit" to "red"
  play sound "click.wav"
  fetch "https://api.example.com/data" into result
end mouseUp

-- Chunking expressions (HyperTalk's killer feature)
put the first word of the third line of field "data" into field "output"
sort the lines of field "Students" by the last word of each
```

### Interpreter Pipeline (Rust)

```
WildTalk source → Lexer → Parser → AST → Tree-walk interpreter
                                          ↕ (FFI bridge / JSON events)
                                    JS event system
```

- **Lexer/Parser**: Hand-written recursive descent — better error messages, full control
- **AST**: Rust enums with pattern matching
- **Interpreter**: Tree-walk for simplicity; bytecode VM possible later
- **FFI bridge**: Interpreter emits structured events as serialized JSON across the WASM boundary

### Message Passing Hierarchy

Faithful to the original:

```
button → card → background → stack → WildCard
```

If no handler is found, the message passes up. Scripts can use `pass` to forward explicitly.

---

## 4. Renderer — Retro Mac Aesthetic

**Reference standard**: The renderer should be visually indistinguishable from HyperCard 2.4
running on Mac OS System 7.5 when in Classic mode. Use actual screenshots of HyperCard as
the spec. Every pixel matters.

### Two Skins (Togglable)

| Mode        | Look                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Classic** | Pure 1-bit black-and-white, System 7 chrome, Chicago-style font, exactly how HyperCard looked 1987–1998                |
| **3.0**     | Color inside cards, smoother UI, the imagined evolution — but still using the same window chrome and interaction model |

Toggle is in the menu bar. Contextual tooltip explains: _"Classic: HyperCard 2.4, 1998"_ /
_"3.0: The unreleased version, imagined."_

Same stack, same scripts — only the rendering pass changes. The engine doesn't care.

### Visual Fidelity Checklist

These specific details MUST be accurate to the original:

- [ ] Menu bar: 1px black bottom border, system font, menus highlight as you drag
- [ ] Window title bar: horizontal lines pattern, close box top-left, title centered
- [ ] Buttons: roundRect default with 1px border, inverts (black fill) on click
- [ ] Fields: 1px inset border, I-beam cursor when typing, scroll arrows not scroll thumb
- [ ] Tool palette: floating window, 2-column icon grid, selected tool highlighted
- [ ] Card transitions: dissolve, wipe left/right/up/down, barn door, venetian blinds, checkerboard
- [ ] Cursors: browse hand (pointing finger), I-beam for text, crosshair for paint tools, watch for wait
- [ ] Dialog boxes: "Answer" dialog with button(s), "Ask" dialog with text input
- [ ] Message box: appears at bottom of screen, single-line input with scrollable output
- [ ] Script editor: monospace font, separate window per object, "Script of button 'X'" in title bar

### Canvas 2D Rendering

Everything drawn to `<canvas>` — no DOM for the HyperCard UI:

- Pixel-perfect retro aesthetic
- No CSS fighting
- Dirty-region repainting (only repaint what changed)
- Layer caching for static backgrounds
- `OffscreenCanvas` + `requestAnimationFrame`

### UI Components

| Component         | Description                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| **Menu bar**      | File, Edit, Go, Tools, Objects — classic Mac dropdowns                                                |
| **Card canvas**   | Main area for displaying and editing cards                                                            |
| **Tool palette**  | Floating: browse, button, field, select, pencil, brush, eraser, line, rect, oval, spray, bucket, text |
| **Inspector**     | Edit properties of selected objects (name, script, style, color)                                      |
| **Script editor** | WildTalk editor with syntax highlighting, opens as a "window"                                         |
| **Message box**   | Bottom bar for typing live WildTalk commands                                                          |

### User Levels (Progressive Disclosure)

1. **Browsing** — click around, experience stacks
2. **Typing** — enter text in fields
3. **Painting** — unlock paint tools
4. **Authoring** — create/edit buttons, fields, cards
5. **Scripting** — full WildTalk editor

New users start at level 1 and graduate up. Educational by design.

---

## 5. Web App (wildcard-web)

### Three Modes

| Mode        | Purpose                                                     |
| ----------- | ----------------------------------------------------------- |
| **Player**  | Browse/interact with stacks, no account needed              |
| **Editor**  | Full authoring environment                                  |
| **Gallery** | Community hub — browse, search, remix, featured collections |

### No-Account Experience

| Feature                | Without account                    | With account   |
| ---------------------- | ---------------------------------- | -------------- |
| Browse/play stacks     | Full access                        | Full access    |
| Create/edit stacks     | Full editor, saved to localStorage | Saved to cloud |
| Paint tools & WildTalk | Full access                        | Full access    |
| Export as HTML         | Yes                                | Yes            |
| Publish to gallery     | No — prompt to sign up             | Yes            |
| Shareable links        | No — prompt to sign up             | Yes            |
| Remix a stack          | Fork to localStorage               | Fork to cloud  |

localStorage work transfers seamlessly when a user creates an account.

### Tech Stack

| Layer              | Choice                                                    | Rationale                                           |
| ------------------ | --------------------------------------------------------- | --------------------------------------------------- |
| API                | Hono on Node                                              | Lightweight, fast, known                            |
| SPA shell          | Vite + minimal TS (Preact for UI chrome)                  | Keep DOM layer thin — Canvas does the heavy lifting |
| Database           | PostgreSQL                                                | Stack metadata, users, gallery, moderation queue    |
| File storage       | Hetzner Object Storage (S3-compatible)                    | Stack files, images, sounds                         |
| Auth               | Email/password + GitHub OAuth                             | Simple to start                                     |
| Content moderation | AI scan on publish + user reporting + manual review queue | Text + image scanning                               |
| Process manager    | pm2                                                       | Known, simple                                       |

### Sharing

- **Export as HTML**: Self-contained .html with WASM engine + renderer + stack data. Host anywhere.
- **Gallery**: Publish to community hub. Moderation scan runs first. Permalink at `/s/slug`.
- **Shareable links**: `wildcard.app/s/abc123` — instant playable link.

---

## 6. Performance

| Layer         | Strategy                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| Engine (WASM) | Near-native script execution. ~5ms cold start. Stack files parsed in Rust.                           |
| Renderer      | `OffscreenCanvas` + `requestAnimationFrame`. Dirty-region repainting. Layer caching for backgrounds. |
| Asset loading | Lazy-load per card. Images as WebP on Object Storage with CDN.                                       |
| Web app       | Static shell < 50KB gzipped (before WASM). WASM async loaded. Service worker for offline.            |
| Gallery       | Pre-generated thumbnails. Paginated API. SSR for meta tags.                                          |

---

## 7. Cross-Device Support

| Concern           | Approach                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Responsive canvas | Scales to viewport, maintains logical resolution (512x342 classic / custom in 3.0). Nearest-neighbor upscale for crisp pixels. |
| Touch             | Touch events mapped to mouseUp/mouseDown/mouseDrag. Pinch-to-zoom.                                                             |
| Mobile editing    | Collapsed tool palette as bottom drawer. Mobile-friendly script editor.                                                        |
| Tablet            | Full editor with touch. Apple Pencil support for paint tools.                                                                  |
| Keyboard          | Full shortcuts on desktop, long-press context menus on touch.                                                                  |

---

## 8. Extensibility (Plugin API)

Three extension points:

| Extension                | What it enables              | Example                                                |
| ------------------------ | ---------------------------- | ------------------------------------------------------ |
| Custom WildTalk commands | Register new verbs/functions | `translate field "text" to "spanish"`                  |
| Render themes            | Swap visual skin             | "Windows 3.1" theme, "NeXT" theme, "modern flat" theme |
| Tool palettes            | Add authoring/paint tools    | Pixel art brush pack, shape library, chart widget      |

### How Extensions Work

- **Engine extensions**: Official ones are Rust modules in the WASM bundle. Community plugins are JS functions registered via FFI bridge (sandboxed).
- **Render themes**: JSON + sprite sheets defining UI chrome.
- **Tool palettes**: JS classes implementing a `Tool` interface.
- **Stack format**: JSON-based and fully documented for third-party importers/exporters.

---

## 9. Historical Context & Education

| Where              | What                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| Onboarding         | Interactive intro stack (built in WildCard) telling the HyperCard story |
| About page         | Timeline 1987–2004, with screenshots and context                        |
| Classic/3.0 toggle | Tooltip explaining what each mode represents                            |
| Starter templates  | Recreations of famous HyperCard stacks with historical notes            |
| /learn section     | Tutorials on WildTalk, HyperCard history, building stacks               |

---

## 10. SEO

| Strategy          | Implementation                                                                    |
| ----------------- | --------------------------------------------------------------------------------- |
| SSR gallery pages | Each stack permalink has server-rendered meta tags, title, description, thumbnail |
| /learn content    | Static pages: HyperCard history, WildTalk tutorials. Long-tail keyword targets.   |
| Open Graph        | Every shared stack generates preview image + metadata for social cards            |
| Structured data   | JSON-LD for software application, creative works, educational content             |
| Sitemap           | Auto-generated from gallery + learn pages                                         |
| Semantic URLs     | `/learn/what-was-hypercard`, `/learn/wildtalk-basics`, `/s/my-cool-stack`         |
| Page speed        | Tiny shell, async WASM, pre-rendered thumbnails. Target 90+ Lighthouse.           |

---

## 11. Legal & Disclaimers

### Naming

- **Product**: WildCard (Bill Atkinson's original working name — the OG homage)
- **Language**: WildTalk
- **NOT using**: "HyperCard" (active Apple trademark) or "HyperTalk" (Apple TM claim)

### Disclaimers

- **App footer**: "WildCard is an independent open-source project inspired by Apple's HyperCard (1987–2004). Not affiliated with or endorsed by Apple Inc."
- **Legal page** (`/legal`): Full trademark acknowledgments, privacy policy, open-source license
- **Repo**: LICENSE (MIT) + disclaimer in README
- **Gallery ToS**: Content ownership, DMCA takedown process, prohibited content policy
- **Publish flow**: AI moderation scan + user checkbox agreement

### Legal Basis

- Programming language syntax is not copyrightable (Oracle v. Google, 2021)
- Referencing HyperCard as inspiration is nominative fair use
- No Apple logos, icons, or verbatim documentation used

---

## 12. Repository & CI

### Public Repo — Secured

- Branch protection on `main`: PR required, CI must pass, no direct pushes
- Dependabot enabled for dependency updates
- Secret scanning enabled
- No secrets in code — environment variables only

### CI Pipeline (GitHub Actions)

| Job              | What                                      |
| ---------------- | ----------------------------------------- |
| `lint`           | ESLint (TS) + Clippy (Rust)               |
| `format`         | Prettier (TS) + rustfmt (Rust)            |
| `typecheck`      | `tsc --noEmit` on all TS packages         |
| `test-engine`    | `cargo test`                              |
| `test-renderer`  | Vitest                                    |
| `test-web`       | Vitest                                    |
| `build-wasm`     | `wasm-pack build`                         |
| `build-web`      | Vite build                                |
| `license-check`  | Ensure MIT/Apache compatible dependencies |
| `security-audit` | `cargo audit` + `npm audit`               |

All jobs run on PR and push to `main`. WASM build cached for speed.

---

## 13. Agent Team Structure

```
                         ┌──────────────────┐
                         │    TEAM LEAD      │
                         │ Coordinates all   │
                         │ Reviews PRs       │
                         │ Manages releases  │
                         └────────┬──────────┘
        ┌──────────┬──────────┬───┴────┬──────────┬──────────┐
        │          │          │        │          │          │
   ┌────▼───┐ ┌───▼────┐ ┌──▼───┐ ┌──▼───┐ ┌───▼────┐ ┌───▼────┐
   │ENGINE  │ │RENDERER│ │BACK  │ │FRONT │ │SECURITY│ │CI/PERF │
   │AGENT   │ │AGENT   │ │END   │ │END   │ │AGENT   │ │AGENT   │
   └────────┘ └────────┘ └──────┘ └──────┘ └────────┘ └────────┘
```

| Agent              | Owns                                  | Responsibilities                                                                                                                     |
| ------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Team Lead**      | Everything                            | Phase gating, PR reviews, integration, conflict resolution, release management                                                       |
| **Engine Agent**   | `@wildcard/engine`, `@wildcard/types` | WildTalk lexer/parser/interpreter, WASM build, FFI bridge, stack data model                                                          |
| **Renderer Agent** | `@wildcard/renderer`                  | Canvas 2D, themes (Classic + 3.0), paint tools, Tool interface, responsive layout. Must use real HyperCard screenshots as reference. |
| **Backend Agent**  | `apps/web/src/server/`                | Hono API, PostgreSQL schema, auth, gallery endpoints, content moderation, S3 storage                                                 |
| **Frontend Agent** | `apps/web/src/` (client)              | Preact SPA, routing, editor UI, player, gallery page, learn pages, legal page, SEO/OG tags                                           |
| **Security Agent** | Cross-cutting                         | Dependency audits, secret scanning, CSP headers, input sanitization, WASM sandboxing, moderation review                              |
| **CI/Perf Agent**  | `.github/`, infra                     | GitHub Actions, Lighthouse audits, WASM bundle size, render perf profiling, deployment, caching                                      |

---

## 14. Domain

**Primary:** `wildcard.you` — PURCHASED. "WildCard. You build it." Puts the creator first, just like HyperCard did.

---

## 15. Reference Material — Recreating the Exact Experience

**The #1 rule applies here: study the original obsessively.**

### Play It Yourself (Required)

Before writing any rendering code, every agent MUST spend time in real HyperCard:

- **Infinite Mac** (https://infinitemac.org/) — Full Mac OS 8 with HyperCard 2.4 in the browser. No install needed. This is the primary reference. Click through menus, create stacks, write scripts, use paint tools. Feel how it responds.
- **HyperCard Adventures** (https://hypercardadventures.com) — PCE/macplus emulator focused on HyperCard

### Core Documentation (PDFs)

| Document                         | URL                                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| HyperCard Script Language Guide  | https://cancel.fm/stuff/share/HyperCard_Script_Language_Guide_1.pdf                                   |
| HyperCard Reference Manual 2.3.5 | https://cancel.fm/stuff/share/HyperCard_Reference_1.pdf                                               |
| HyperTalk Reference 2.4          | https://hypercard.org/HyperTalk%20Reference%202.4.pdf                                                 |
| HyperCard User's Guide (1987)    | https://vintageapple.org/macprogramming/pdf/HyperCard_Users_Guide_1987.pdf                            |
| HyperTalk Beginner's Guide       | https://vintageapple.org/macbooks/pdf/HyperTalk_Beginners_Guide_An_Introduction_to_Scripting_1989.pdf |

### Visual References

| Resource                    | URL                                                | What it shows                                                       |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| Folkstream: HyperCard Menus | https://folkstream.com/muse/teachhc/menu/menu.html | All menus with screenshots                                          |
| Folkstream: Teach HyperCard | https://folkstream.com/muse/teachhc/               | Full tutorial with UI screenshots                                   |
| hypercard.org               | https://hypercard.org/                             | Fan site with extensive visual material                             |
| WyldCard Wiki               | https://github.com/defano/wyldcard/wiki            | Faithful recreation with visual examples of all button/field styles |
| HyperCard Center            | https://www.hypercard.center/HyperTalkReference    | Best online HyperTalk reference                                     |

### Video References

| Video                                 | URL                                                               | What it shows                      |
| ------------------------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| Computer Chronicles: HyperCard (1987) | https://archive.org/details/CC501_hypercard                       | Bill Atkinson demos HyperCard live |
| HyperCard 2.0 Visual Effects          | https://archive.org/details/hypercard_hypercard-20-visual-effects | All card transition effects        |

### Code References (Study for Exact Behavior)

| Project         | URL                                | Why                                                       |
| --------------- | ---------------------------------- | --------------------------------------------------------- |
| WyldCard (Java) | https://github.com/defano/wyldcard | Highest-fidelity recreation. Study for exact UI behavior. |
| ViperCard (Web) | https://www.vipercard.net/         | Web-based, closest to HyperTalk syntax                    |
| Decker          | https://beyondloom.com/decker/     | Best polished modern reimagining                          |

### Complete Feature Set to Recreate

#### The Five User Levels

| Level | Name      | Unlocks                                                       |
| ----- | --------- | ------------------------------------------------------------- |
| 1     | Browsing  | Navigate, click buttons. View only.                           |
| 2     | Typing    | Edit text in unlocked fields.                                 |
| 3     | Painting  | All paint tools.                                              |
| 4     | Authoring | Create/edit buttons and fields. Background layer. Power Keys. |
| 5     | Scripting | Script editor. Message Box. Blind Typing.                     |

#### All 17 Tools

Browse, Button, Field, Select, Lasso, Pencil, Brush, Eraser, Line, Spray, Rectangle, Round Rectangle, Bucket, Oval, Curve, Regular Polygon, Text

#### All Button Styles

transparent, opaque, rectangle, roundRect (default), shadow, checkBox, radioButton, oval, popup, standard, default

#### All Field Styles

transparent, opaque, rectangle, shadow, scrolling

#### All Card Transition Effects

| Effect          | Directions                         |
| --------------- | ---------------------------------- |
| barn door       | open, close                        |
| checkerboard    | —                                  |
| dissolve        | —                                  |
| iris            | open, close                        |
| plain           | —                                  |
| scroll          | up, down, left, right              |
| shrink          | to top, to center, to bottom       |
| stretch         | from top, from center, from bottom |
| venetian blinds | —                                  |
| wipe            | up, down, left, right              |
| zoom            | open, close, in, out               |

Speeds: `very slow`, `slow`, `fast`, `very fast`, or ticks

#### All System Messages

appleEvent, arrowKey, closeBackground, closeCard, closeField, closeStack, commandKeyDown, controlKey, deleteBackground, deleteButton, deleteCard, deleteField, deleteStack, doMenu, enterInField, enterKey, errorDialog, exitField, functionKey, help, idle, keyDown, mouseDoubleClick, mouseDown, mouseEnter, mouseLeave, mouseStillDown, mouseUp, mouseWithin, moveWindow, newBackground, newButton, newCard, newField, newStack, openBackground, openCard, openField, openStack, quit, resize, resume, returnInField, returnKey, sizeWindow, startup, suspend, tabKey

#### All HyperTalk Commands

add, answer, ask, ask password, arrowKey, beep, choose, click, close file, close printing, commandKeyDown, controlKey, convert, create menu, debug checkpoint, delete, delete menu, dial, disable, divide, do, doMenu, drag, edit script, enable, enterInField, enterKey, export paint, find, functionKey, get, go, help, hide, hide menuBar, import paint, keyDown, lock error dialogs, lock messages, lock recent, lock screen, mark, multiply, open, open file, open printing, open report printing, palette, play, pop card, print, push card, put, read, reply, request, reset menuBar, reset paint, reset printing, returnInField, returnKey, run, save, select, send, set, show, show menuBar, sort, start using, stop using, subtract, tabKey, type, unlock error dialogs, unlock messages, unlock recent, unlock screen, unmark, visual, wait, write

#### All HyperTalk Functions

abs, annuity, atan, average, charToNum, clickChunk, clickH, clickLoc, clickLine, clickText, clickV, cmdKey, commandKey, compound, cos, date, diskSpace, exp, exp1, exp2, foundChunk, foundField, foundLine, foundText, heapSpace, length, ln, ln1, log2, max, menus, min, mouse, mouseClick, mouseH, mouseLoc, mouseV, number, numToChar, offset, optionKey, param, paramCount, params, programs, random, result, round, screenRect, seconds, selectedChunk, selectedField, selectedLine, selectedLoc, selectedText, shiftKey, sin, sound, sqrt, stackSpace, stacks, systemVersion, tan, target, ticks, time, tool, trunc, value, windows

#### Menu Structure

- **File:** New Stack, Open Stack, Close Stack, Save a Copy, Compact Stack, Protect Stack, Delete Stack, Page Setup, Print Field, Print Card, Print Stack, Print Report, Quit
- **Edit:** Undo, Cut, Copy, Paste, Clear, New Card, Delete Card, Cut Card, Copy Card, Text Style, Background, Icon, Audio, Audio Help
- **Go:** Back, Home, Help, Recent, First, Prev, Next, Last, Find, Message, Scroll, Next Window
- **Tools:** (opens palette)
- **Objects:** Button Info, Field Info, Card Info, Background Info, Stack Info, Bring Closer, Send Farther, New Button, New Field, New Background
- **Paint:** (when paint tool active) Select, Select All, Fill, Invert, Pickup, Darken, Lighten, Trace Edges, Rotate Left/Right, Flip Vertical/Horizontal, Opaque, Transparent, Keep, Revert, Draw Filled/Centered/Multiple, Polygon Sides, Edit Pattern, FatBits

#### Message Box

- Toggled with Cmd-M
- Single-line input at bottom of screen
- Accepts any HyperTalk command or expression
- Results appear in the box (e.g., type `the date` → shows current date)
- Up/down arrows cycle command history
- Blind Typing: at scripting level, typing goes to hidden Message Box

#### Paint Tool Options

- **40 fill patterns** (solid, crosshatch, dots, diagonals, bricks, etc.)
- **Line sizes:** 1, 2, 3, 4, 6, 8 pixels
- **Brush shapes:** Multiple round and square brushes
- **FatBits:** Pixel-level zoom editing
- **Grid:** Snap-to-grid option
