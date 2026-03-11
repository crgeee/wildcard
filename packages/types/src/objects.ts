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
