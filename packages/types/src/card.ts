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
