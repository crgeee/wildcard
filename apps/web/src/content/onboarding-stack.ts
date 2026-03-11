import type { WildCardStack } from "@wildcard/types";
import { createCard, createBackground } from "@wildcard/types";
import { createButton, createField } from "@wildcard/types";

const bg = createBackground({ name: "Onboarding Background" });
const bgId = bg.id;

// ---------- Card 1: Welcome to WildCard ----------
const card1 = createCard({
  name: "Welcome to WildCard",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Title",
      style: "transparent",
      content: "Welcome to WildCard",
      rect: { x: 56, y: 60, width: 400, height: 50 },
      lockText: true,
    }),
    createField({
      name: "Subtitle",
      style: "transparent",
      content: "The HyperCard that Apple never shipped.",
      rect: { x: 56, y: 120, width: 400, height: 30 },
      lockText: true,
    }),
    createButton({
      name: "Begin",
      style: "roundRect",
      rect: { x: 196, y: 280, width: 120, height: 30 },
      script: "on mouseUp\n  go to next card\nend mouseUp",
    }),
  ],
});

// ---------- Card 2: The Story of HyperCard ----------
const card2 = createCard({
  name: "The Story of HyperCard",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Story",
      style: "scrolling",
      content:
        "In 1987, Bill Atkinson created HyperCard for the Macintosh. " +
        "It let anyone \u2014 teachers, artists, kids \u2014 build interactive software " +
        "by stacking cards together. No programming degree required.",
      rect: { x: 56, y: 40, width: 400, height: 200 },
      lockText: true,
    }),
    createButton({
      name: "Next",
      style: "roundRect",
      rect: { x: 196, y: 280, width: 120, height: 30 },
      script: "on mouseUp\n  go to next card\nend mouseUp",
    }),
  ],
});

// ---------- Card 3: What People Built ----------
const card3 = createCard({
  name: "What People Built",
  backgroundId: bgId,
  objects: [
    createField({
      name: "WhatPeopleBuilt",
      style: "scrolling",
      content:
        "Myst (yes, the game) was prototyped in HyperCard. Teachers made " +
        "interactive lessons. Businesses built databases. Kids made " +
        "choose-your-own-adventures. It was the web before the web.",
      rect: { x: 56, y: 40, width: 400, height: 200 },
      lockText: true,
    }),
    createButton({
      name: "Next",
      style: "roundRect",
      rect: { x: 196, y: 280, width: 120, height: 30 },
      script: "on mouseUp\n  go to next card\nend mouseUp",
    }),
  ],
});

// ---------- Card 4: Why It Disappeared ----------
const card4 = createCard({
  name: "Why It Disappeared",
  backgroundId: bgId,
  objects: [
    createField({
      name: "WhyDisappeared",
      style: "scrolling",
      content:
        "Apple acquired HyperCard, then slowly let it die. Version 3.0 was " +
        "in development but never released. By 2004, it was officially " +
        "discontinued. A generation of creators lost their tool.",
      rect: { x: 56, y: 40, width: 400, height: 200 },
      lockText: true,
    }),
    createButton({
      name: "Next",
      style: "roundRect",
      rect: { x: 196, y: 280, width: 120, height: 30 },
      script: "on mouseUp\n  go to next card\nend mouseUp",
    }),
  ],
});

// ---------- Card 5: The 3.0 That Never Was ----------
const card5 = createCard({
  name: "The 3.0 That Never Was",
  backgroundId: bgId,
  objects: [
    createField({
      name: "ThreePointOh",
      style: "scrolling",
      content:
        "WildCard is the 3.0 that never shipped. Same card-and-stack " +
        "metaphor. Same English-like scripting (WildTalk instead of " +
        "HyperTalk). Same paint tools. But now in your browser, for everyone.",
      rect: { x: 56, y: 40, width: 400, height: 200 },
      lockText: true,
    }),
    createButton({
      name: "Next",
      style: "roundRect",
      rect: { x: 196, y: 280, width: 120, height: 30 },
      script: "on mouseUp\n  go to next card\nend mouseUp",
    }),
  ],
});

// ---------- Card 6: Your Turn ----------
const card6 = createCard({
  name: "Your Turn",
  backgroundId: bgId,
  objects: [
    createButton({
      name: "Click Me!",
      style: "roundRect",
      rect: { x: 176, y: 80, width: 160, height: 40 },
      script: 'on mouseUp\n  answer "You just ran your first WildTalk script!"\nend mouseUp',
    }),
    createField({
      name: "TryIt",
      style: "transparent",
      content: "Try clicking the button above. That's WildTalk \u2014 the scripting language.",
      rect: { x: 56, y: 150, width: 400, height: 60 },
      lockText: true,
    }),
    createButton({
      name: "Next",
      style: "roundRect",
      rect: { x: 196, y: 280, width: 120, height: 30 },
      script: "on mouseUp\n  go to next card\nend mouseUp",
    }),
  ],
});

// ---------- Card 7: Start Creating ----------
const card7 = createCard({
  name: "Start Creating",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Ready",
      style: "transparent",
      content:
        "You're ready. Click below to start with a blank stack, or explore " +
        "the gallery for inspiration.",
      rect: { x: 56, y: 40, width: 400, height: 100 },
      lockText: true,
    }),
    createButton({
      name: "New Stack",
      style: "roundRect",
      rect: { x: 96, y: 280, width: 140, height: 30 },
      script: "on mouseUp\n  go to editor\nend mouseUp",
    }),
    createButton({
      name: "Browse Gallery",
      style: "roundRect",
      rect: { x: 276, y: 280, width: 140, height: 30 },
      script: "on mouseUp\n  go to gallery\nend mouseUp",
    }),
  ],
});

// ---------- Assemble the stack ----------
const now = new Date().toISOString();

export const onboardingStack: WildCardStack = {
  version: "1.0",
  name: "Welcome to WildCard",
  id: "stack_onboarding",
  width: 512,
  height: 342,
  cards: [card1, card2, card3, card4, card5, card6, card7],
  backgrounds: [bg],
  script: "",
  createdAt: now,
  modifiedAt: now,
};
