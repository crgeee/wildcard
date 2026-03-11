# WildCard

_The HyperCard 3.0 that Apple never shipped._

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

| Package              | Description                                        |
| -------------------- | -------------------------------------------------- |
| `@wildcard/engine`   | Rust/WASM — WildTalk interpreter and stack runtime |
| `@wildcard/renderer` | TypeScript — Canvas 2D retro Mac rendering engine  |
| `@wildcard/types`    | TypeScript — shared types and FFI bridge           |
| `wildcard-web`       | TypeScript — web app (editor, player, gallery)     |

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
