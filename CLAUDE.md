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
     ┌─────────┬───────┼────────┬──────────┬──────────┬──────────┐
     |         |       |        |          |          |          |
  ENGINE   RENDERER  BACKEND  FRONTEND  CI/PERF  SECURITY  REVIEWER
  AGENT    AGENT     AGENT    AGENT     AGENT    AGENT     AGENT
```

### Team Lead (you, the main Claude session)
- Coordinates work across agents
- Dispatches Reviewer Agent after every phase or significant merge
- Manages phase transitions (don't start Phase N+1 until Phase N passes review)
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

### Security Agent
- **Owns:** Cross-cutting — audits everything
- **Scope:** Security gatekeeper. Runs before any deployment and periodically during development.
- **Checks:**
  1. **Dependency audit** — `cargo audit` + `npm audit`, flag known CVEs
  2. **WASM sandboxing** — ensure engine can't escape sandbox, no unsafe memory access
  3. **Input sanitization** — all user input (WildTalk scripts, stack JSON, gallery submissions) validated and sanitized
  4. **XSS prevention** — Canvas rendering is inherently safe, but check any DOM injection (message box, script editor, gallery pages)
  5. **CSP headers** — strict Content-Security-Policy on all served pages
  6. **Auth security** — bcrypt cost factor, JWT expiry, CSRF protection, rate limiting
  7. **Content moderation** — verify AI scan can't be bypassed, review DMCA flow
  8. **S3/storage** — no public write access, signed URLs for uploads, file type validation
  9. **Secrets** — no hardcoded keys, env vars only, `.env` in `.gitignore`
  10. **Supply chain** — lock files committed, verify dependency integrity
- **Output:** Security report with CRITICAL (blocks deploy), HIGH (blocks merge), MEDIUM (track as issue).
- **How to dispatch:**
  ```
  Agent: Security Agent — audit [scope]
    subagent_type: pr-review-toolkit:silent-failure-hunter (for error handling)
    — or —
    subagent_type: general-purpose (for full security audit)
  ```

### Reviewer Agent
- **Owns:** Nothing — reviews everything
- **Scope:** Code quality gatekeeper. Runs after every phase completion or significant merge.
- **Checks:**
  1. **DRY** — flag duplicated logic across and within packages. Suggest shared utilities.
  2. **Componentization** — ensure clean separation of concerns. No god objects. Single responsibility.
  3. **Performance** — flag unnecessary allocations, unneeded re-renders, missing caching, O(n²) in hot paths.
  4. **Consistency** — naming conventions, error handling patterns, import organization.
  5. **Test quality** — adequate coverage, edge cases, no brittle tests.
  6. **Security** — XSS vectors, unsafe eval, unvalidated input, dependency concerns.
  7. **HyperCard fidelity** — does the UI/behavior match the original? Reference the Visual Fidelity Checklist.
- **Output:** A review report with issues categorized as MUST FIX (blocks merge) or SHOULD FIX (tech debt).
- **How to dispatch:** See below.

## Review Process

**Every phase goes through review before being considered complete:**

```
Agent builds feature → Tests pass → Reviewer Agent reviews → Fixes applied → Push
```

### Dispatching the Reviewer Agent

After agents complete a phase, dispatch the Reviewer:

```
Agent: Reviewer Agent — review Phase N
  subagent_type: code-improvement-reviewer
  prompt: "Review the recent changes for WildCard Phase N.
           Focus on: DRY, componentization, performance, consistency,
           test quality, security, and HyperCard fidelity.
           Files changed: [list files or use git diff]
           Output a review with MUST FIX and SHOULD FIX categories."
```

For quick reviews of individual files, use:
- `pr-review-toolkit:code-reviewer` — general code review
- `pr-review-toolkit:silent-failure-hunter` — error handling gaps
- `code-improvement-reviewer` — DRY/readability/performance

### Review Checklist (for Team Lead)

Before pushing any phase:
- [ ] All tests pass (`cargo test` + `pnpm -r test`)
- [ ] Reviewer Agent report has no MUST FIX items
- [ ] No duplicated logic across packages (check bridge/types boundaries)
- [ ] No hardcoded values that should be in theme/config
- [ ] Performance: no sync WASM calls in render loop, no layout thrashing
- [ ] Canvas rendering uses dirty regions (not full repaints)
- [ ] New code follows existing patterns in the codebase

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

## Team Lead Responsibilities

The main Claude session acts as **Team Lead**. This means:
- **You are the coordinator** — the user should not need to manage agents directly
- **Answer questions** about the project, architecture, progress, and decisions
- **Dispatch agents** for implementation work and reviews
- **Fix integration issues** when agents produce conflicting changes
- **Gate quality** — nothing gets pushed without passing tests + reviewer
- **Track progress** — keep CLAUDE.md "Current Progress" section updated
- **Make decisions** — if an agent hits an ambiguous design question, resolve it based on the design doc rather than bothering the user

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
