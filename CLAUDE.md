# WildCard — Project Guide

*"The HyperCard 3.0 that Apple never shipped."*

**Domain:** wildcard.you
**Repo:** https://github.com/crgeee/wildcard

## Quick Reference

- **Design doc:** `docs/plans/2026-03-10-wildcard-design.md`
- **Implementation plan:** `docs/plans/2026-03-10-wildcard-implementation.md`
- **Types package:** `packages/types/` (TypeScript)
- **Engine:** `packages/engine/` (Rust/WASM — WildTalk interpreter)
- **Renderer:** `packages/renderer/` (TypeScript/Canvas 2D)
- **Web app:** `apps/web/` (Hono + Vite + Preact)

## The #1 Rule

**This is a faithful recreation of HyperCard.** Every UI element, interaction, and flow
must match the original HyperCard 2.4 experience. Use Infinite Mac (https://infinitemac.org/)
as the reference standard. Read the design doc Section 1 and Section 15 for details.

## Agent Team Structure

When working on this project, use the following agent team for parallel development:

```
                    TEAM LEAD
         (coordinates, reviews, integrates)
                       |
     ┌─────────┬───────┼────────┬──────────┐
     |         |       |        |          |
  ENGINE   RENDERER  BACKEND  FRONTEND  CI/PERF
  AGENT    AGENT     AGENT    AGENT     AGENT
```

### Team Lead (you, the main Claude session)
- Coordinates work across agents
- Reviews agent output before committing
- Manages phase transitions (don't start Phase N+1 until Phase N passes)
- Resolves integration conflicts between packages
- Runs final test suites before pushing

### Engine Agent
- **Owns:** `packages/engine/` (Rust), `packages/types/` (TypeScript)
- **Scope:** WildTalk lexer, parser, AST, interpreter, WASM build, FFI bridge
- **Tests:** `cargo test` must pass before any commit
- **Build:** `wasm-pack build --target web` must succeed

### Renderer Agent
- **Owns:** `packages/renderer/` (TypeScript)
- **Scope:** Canvas 2D rendering, themes (Classic + 3.0), paint tools, UI components, responsive layout
- **Tests:** `pnpm test` from `packages/renderer/`
- **Critical:** Must reference real HyperCard screenshots. Use Visual Fidelity Checklist in design doc.

### Backend Agent
- **Owns:** `apps/web/src/server/`
- **Scope:** Hono API, PostgreSQL, auth, gallery, content moderation, S3 storage
- **Tests:** `pnpm test` from `apps/web/`

### Frontend Agent
- **Owns:** `apps/web/src/` (client-side)
- **Scope:** Preact SPA, routing, editor/player/gallery pages, SEO, legal pages
- **Tests:** `pnpm test` from `apps/web/`

### CI/Perf Agent
- **Owns:** `.github/`, deployment scripts
- **Scope:** GitHub Actions, Lighthouse audits, WASM bundle size, deployment

## How to Dispatch Agents

Use the Agent tool with `run_in_background: true` for parallel work:

```
Agent: Engine Agent — implement [task]
  subagent_type: general-purpose
  run_in_background: true
  prompt: "You are the Engine Agent for WildCard. [task details]..."

Agent: Renderer Agent — implement [task]
  subagent_type: general-purpose
  run_in_background: true
  prompt: "You are the Renderer Agent for WildCard. [task details]..."
```

Always include in agent prompts:
1. Which agent role they are
2. The specific task from the implementation plan
3. Path to design doc and implementation plan
4. TDD requirement (tests first)
5. Commit message format with Co-Authored-By

## Development Commands

```bash
# Install dependencies
pnpm install

# Build types (must build first — other packages depend on it)
cd packages/types && pnpm build

# Run all TS tests
pnpm -r test

# Run engine tests
cd packages/engine && cargo test

# Build WASM
cd packages/engine && wasm-pack build --target web

# Format
pnpm format

# Lint
pnpm lint
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Engine | Rust → WASM (wasm-bindgen, serde) |
| Renderer | TypeScript, Canvas 2D API |
| Types | TypeScript (shared types, FFI bridge) |
| Web API | Hono (Node) |
| Web SPA | Preact + Vite |
| Database | PostgreSQL |
| Storage | Hetzner Object Storage (S3-compatible) |
| CI | GitHub Actions |
| Deploy | Hetzner VPS, pm2, nginx |

## Commit Conventions

- `feat(scope):` — new features
- `fix(scope):` — bug fixes
- `docs:` — documentation
- `chore:` — tooling, config
- `ci:` — CI pipeline changes
- Scopes: `engine`, `renderer`, `types`, `web`
- Always include: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

## Current Progress

### Completed
- [x] Phase 0: Monorepo scaffolding, CI pipeline, legal files
- [x] Phase 1: Shared types (stack format, events, FFI contract)
- [x] Phase 2: WildTalk engine (lexer, parser, interpreter, WASM bridge) — 110 tests
- [x] Phase 3: Canvas renderer (themes, window chrome, card canvas, tools, script editor, responsive) — 134 tests

### Next Up
- [ ] Phase 4: Integration (wire engine WASM to renderer, localStorage persistence)
- [ ] Phase 5: Web app (Vite SPA, Hono API, gallery, auth, moderation, SEO)
- [ ] Phase 6: Historical content (onboarding stack, learn pages, starter templates)
- [ ] Phase 7: Polish & deploy (service worker, Lighthouse, Hetzner deployment)

## Legal

WildCard is NOT affiliated with Apple. "HyperCard" and "HyperTalk" are Apple trademarks.
We use "WildCard" and "WildTalk" — Bill Atkinson's original working name.
Disclaimers must appear in: app footer, /legal page, README, gallery ToS.
