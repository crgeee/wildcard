# WildCard — Design Document

*"The HyperCard 3.0 that Apple never shipped."*

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

### Core Principles

- **Jump in immediately** — no account required to create, edit, or export
- **Faithful to the original** — the UX should feel like using HyperCard on a classic Mac
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

| Package | Language | Responsibility |
|---------|----------|----------------|
| `@wildcard/engine` | Rust → WASM | WildTalk parser, interpreter, stack/card data model, event system |
| `@wildcard/renderer` | TypeScript | Canvas 2D rendering — retro Mac UI, two skins (Classic + 3.0), paint tools |
| `@wildcard/types` | TypeScript | Shared type definitions, stack file format (JSON), JS↔WASM FFI bridge |
| `wildcard-web` | TypeScript | Hono API + Vite SPA — editor, player, gallery, auth, moderation, SEO |

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

### Two Skins (Togglable)

| Mode | Look |
|------|------|
| **Classic** | Pure 1-bit black-and-white, System 7 chrome, Chicago-style font, exactly how HyperCard looked 1987–1998 |
| **3.0** | Color inside cards, smoother UI, the imagined evolution that never shipped |

Toggle is in the menu bar. Contextual tooltip explains: *"Classic: HyperCard 2.4, 1998"* /
*"3.0: The unreleased version, imagined."*

Same stack, same scripts — only the rendering pass changes. The engine doesn't care.

### Canvas 2D Rendering

Everything drawn to `<canvas>` — no DOM for the HyperCard UI:

- Pixel-perfect retro aesthetic
- No CSS fighting
- Dirty-region repainting (only repaint what changed)
- Layer caching for static backgrounds
- `OffscreenCanvas` + `requestAnimationFrame`

### UI Components

| Component | Description |
|-----------|-------------|
| **Menu bar** | File, Edit, Go, Tools, Objects — classic Mac dropdowns |
| **Card canvas** | Main area for displaying and editing cards |
| **Tool palette** | Floating: browse, button, field, select, pencil, brush, eraser, line, rect, oval, spray, bucket, text |
| **Inspector** | Edit properties of selected objects (name, script, style, color) |
| **Script editor** | WildTalk editor with syntax highlighting, opens as a "window" |
| **Message box** | Bottom bar for typing live WildTalk commands |

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

| Mode | Purpose |
|------|---------|
| **Player** | Browse/interact with stacks, no account needed |
| **Editor** | Full authoring environment |
| **Gallery** | Community hub — browse, search, remix, featured collections |

### No-Account Experience

| Feature | Without account | With account |
|---------|----------------|-------------|
| Browse/play stacks | Full access | Full access |
| Create/edit stacks | Full editor, saved to localStorage | Saved to cloud |
| Paint tools & WildTalk | Full access | Full access |
| Export as HTML | Yes | Yes |
| Publish to gallery | No — prompt to sign up | Yes |
| Shareable links | No — prompt to sign up | Yes |
| Remix a stack | Fork to localStorage | Fork to cloud |

localStorage work transfers seamlessly when a user creates an account.

### Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| API | Hono on Node | Lightweight, fast, known |
| SPA shell | Vite + minimal TS (Preact for UI chrome) | Keep DOM layer thin — Canvas does the heavy lifting |
| Database | PostgreSQL | Stack metadata, users, gallery, moderation queue |
| File storage | Hetzner Object Storage (S3-compatible) | Stack files, images, sounds |
| Auth | Email/password + GitHub OAuth | Simple to start |
| Content moderation | AI scan on publish + user reporting + manual review queue | Text + image scanning |
| Process manager | pm2 | Known, simple |

### Sharing

- **Export as HTML**: Self-contained .html with WASM engine + renderer + stack data. Host anywhere.
- **Gallery**: Publish to community hub. Moderation scan runs first. Permalink at `/s/slug`.
- **Shareable links**: `wildcard.app/s/abc123` — instant playable link.

---

## 6. Performance

| Layer | Strategy |
|-------|----------|
| Engine (WASM) | Near-native script execution. ~5ms cold start. Stack files parsed in Rust. |
| Renderer | `OffscreenCanvas` + `requestAnimationFrame`. Dirty-region repainting. Layer caching for backgrounds. |
| Asset loading | Lazy-load per card. Images as WebP on Object Storage with CDN. |
| Web app | Static shell < 50KB gzipped (before WASM). WASM async loaded. Service worker for offline. |
| Gallery | Pre-generated thumbnails. Paginated API. SSR for meta tags. |

---

## 7. Cross-Device Support

| Concern | Approach |
|---------|----------|
| Responsive canvas | Scales to viewport, maintains logical resolution (512x342 classic / custom in 3.0). Nearest-neighbor upscale for crisp pixels. |
| Touch | Touch events mapped to mouseUp/mouseDown/mouseDrag. Pinch-to-zoom. |
| Mobile editing | Collapsed tool palette as bottom drawer. Mobile-friendly script editor. |
| Tablet | Full editor with touch. Apple Pencil support for paint tools. |
| Keyboard | Full shortcuts on desktop, long-press context menus on touch. |

---

## 8. Extensibility (Plugin API)

Three extension points:

| Extension | What it enables | Example |
|-----------|----------------|---------|
| Custom WildTalk commands | Register new verbs/functions | `translate field "text" to "spanish"` |
| Render themes | Swap visual skin | "Windows 3.1" theme, "NeXT" theme, "modern flat" theme |
| Tool palettes | Add authoring/paint tools | Pixel art brush pack, shape library, chart widget |

### How Extensions Work

- **Engine extensions**: Official ones are Rust modules in the WASM bundle. Community plugins are JS functions registered via FFI bridge (sandboxed).
- **Render themes**: JSON + sprite sheets defining UI chrome.
- **Tool palettes**: JS classes implementing a `Tool` interface.
- **Stack format**: JSON-based and fully documented for third-party importers/exporters.

---

## 9. Historical Context & Education

| Where | What |
|-------|------|
| Onboarding | Interactive intro stack (built in WildCard) telling the HyperCard story |
| About page | Timeline 1987–2004, with screenshots and context |
| Classic/3.0 toggle | Tooltip explaining what each mode represents |
| Starter templates | Recreations of famous HyperCard stacks with historical notes |
| /learn section | Tutorials on WildTalk, HyperCard history, building stacks |

---

## 10. SEO

| Strategy | Implementation |
|----------|---------------|
| SSR gallery pages | Each stack permalink has server-rendered meta tags, title, description, thumbnail |
| /learn content | Static pages: HyperCard history, WildTalk tutorials. Long-tail keyword targets. |
| Open Graph | Every shared stack generates preview image + metadata for social cards |
| Structured data | JSON-LD for software application, creative works, educational content |
| Sitemap | Auto-generated from gallery + learn pages |
| Semantic URLs | `/learn/what-was-hypercard`, `/learn/wildtalk-basics`, `/s/my-cool-stack` |
| Page speed | Tiny shell, async WASM, pre-rendered thumbnails. Target 90+ Lighthouse. |

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

| Job | What |
|-----|------|
| `lint` | ESLint (TS) + Clippy (Rust) |
| `format` | Prettier (TS) + rustfmt (Rust) |
| `typecheck` | `tsc --noEmit` on all TS packages |
| `test-engine` | `cargo test` |
| `test-renderer` | Vitest |
| `test-web` | Vitest |
| `build-wasm` | `wasm-pack build` |
| `build-web` | Vite build |
| `license-check` | Ensure MIT/Apache compatible dependencies |
| `security-audit` | `cargo audit` + `npm audit` |

All jobs run on PR and push to `main`. WASM build cached for speed.
