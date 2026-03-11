import type { WildCardStack } from "@wildcard/types";
import { createCard, createBackground } from "@wildcard/types";
import { createButton, createField } from "@wildcard/types";

const bg = createBackground({ name: "Gallery Background" });
const bgId = bg.id;

// ---------- Card 1: Title Card ----------
const card1 = createCard({
  name: "My Gallery",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Title",
      style: "transparent",
      content: "My Gallery",
      rect: { x: 156, y: 50, width: 200, height: 50 },
      lockText: true,
    }),
    createField({
      name: "Description",
      style: "rectangle",
      content:
        "Welcome to your personal art gallery. Use the paint tools on " +
        "each card to create your artwork, then browse through your " +
        "collection with the navigation buttons.",
      rect: { x: 56, y: 120, width: 400, height: 80 },
      lockText: true,
    }),
    createButton({
      name: "View Gallery",
      style: "roundRect",
      rect: { x: 196, y: 270, width: 120, height: 30 },
      script: "on mouseUp\n  go to next card\nend mouseUp",
    }),
  ],
});

// ---------- Card 2: Artwork 1 — Sunset ----------
const card2 = createCard({
  name: "Artwork 1",
  backgroundId: bgId,
  objects: [
    createField({
      name: "ArtTitle",
      style: "transparent",
      content: "Sunset",
      rect: { x: 196, y: 8, width: 120, height: 24 },
      lockText: true,
    }),
    createField({
      name: "ArtDescription",
      style: "rectangle",
      content: "A beautiful sunset painted with WildCard tools",
      rect: { x: 56, y: 270, width: 290, height: 50 },
      lockText: true,
    }),
    createButton({
      name: "Prev",
      style: "roundRect",
      rect: { x: 360, y: 270, width: 60, height: 24 },
      script: 'on mouseUp\n  go to card "My Gallery"\nend mouseUp',
    }),
    createButton({
      name: "Next",
      style: "roundRect",
      rect: { x: 430, y: 270, width: 60, height: 24 },
      script: "on mouseUp\n  go to next card\nend mouseUp",
    }),
  ],
  paintData: null,
});

// ---------- Card 3: Artwork 2 — Mountains ----------
const card3 = createCard({
  name: "Artwork 2",
  backgroundId: bgId,
  objects: [
    createField({
      name: "ArtTitle",
      style: "transparent",
      content: "Mountains",
      rect: { x: 186, y: 8, width: 140, height: 24 },
      lockText: true,
    }),
    createField({
      name: "ArtDescription",
      style: "rectangle",
      content: "Majestic mountain peaks reaching toward the sky",
      rect: { x: 56, y: 270, width: 290, height: 50 },
      lockText: true,
    }),
    createButton({
      name: "Prev",
      style: "roundRect",
      rect: { x: 360, y: 270, width: 60, height: 24 },
      script: "on mouseUp\n  go to previous card\nend mouseUp",
    }),
    createButton({
      name: "Next",
      style: "roundRect",
      rect: { x: 430, y: 270, width: 60, height: 24 },
      script: "on mouseUp\n  go to next card\nend mouseUp",
    }),
  ],
  paintData: null,
});

// ---------- Card 4: Artwork 3 — Ocean ----------
const card4 = createCard({
  name: "Artwork 3",
  backgroundId: bgId,
  objects: [
    createField({
      name: "ArtTitle",
      style: "transparent",
      content: "Ocean",
      rect: { x: 206, y: 8, width: 100, height: 24 },
      lockText: true,
    }),
    createField({
      name: "ArtDescription",
      style: "rectangle",
      content: "Waves crashing against the shore at dusk",
      rect: { x: 56, y: 270, width: 290, height: 50 },
      lockText: true,
    }),
    createButton({
      name: "Prev",
      style: "roundRect",
      rect: { x: 360, y: 270, width: 60, height: 24 },
      script: "on mouseUp\n  go to previous card\nend mouseUp",
    }),
    createButton({
      name: "Next",
      style: "roundRect",
      rect: { x: 430, y: 270, width: 60, height: 24 },
      script: 'on mouseUp\n  go to card "My Gallery"\nend mouseUp',
    }),
  ],
  paintData: null,
});

// ---------- Assemble the stack ----------
const now = new Date().toISOString();

export const artGalleryStack: WildCardStack = {
  version: "1.0",
  name: "My Gallery",
  id: "stack_template_art_gallery",
  width: 512,
  height: 342,
  cards: [card1, card2, card3, card4],
  backgrounds: [bg],
  script: "",
  createdAt: now,
  modifiedAt: now,
};
