import type { WildCardStack } from "@wildcard/types";
import { createCard, createBackground } from "@wildcard/types";
import { createButton, createField } from "@wildcard/types";

const bg = createBackground({ name: "Adventure Background" });
const bgId = bg.id;

// ---------- Card 1: The Enchanted Forest (intro) ----------
const card1 = createCard({
  name: "The Enchanted Forest",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Title",
      style: "transparent",
      content: "The Enchanted Forest",
      rect: { x: 116, y: 30, width: 280, height: 40 },
      lockText: true,
    }),
    createField({
      name: "Story",
      style: "scrolling",
      content:
        "You stand at the edge of an ancient forest. The trees tower above " +
        "you, their branches woven together like a cathedral ceiling. A faint " +
        "glow pulses from deep within, and you hear the distant sound of " +
        "running water. Something magical awaits inside.",
      rect: { x: 56, y: 80, width: 400, height: 150 },
      lockText: true,
    }),
    createButton({
      name: "Enter the forest",
      style: "roundRect",
      rect: { x: 176, y: 270, width: 160, height: 30 },
      script: 'on mouseUp\n  go to card "A Fork in the Path"\nend mouseUp',
    }),
  ],
});

// ---------- Card 2: A Fork in the Path ----------
const card2 = createCard({
  name: "A Fork in the Path",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Title",
      style: "transparent",
      content: "A Fork in the Path",
      rect: { x: 136, y: 30, width: 240, height: 40 },
      lockText: true,
    }),
    createField({
      name: "Story",
      style: "scrolling",
      content:
        "The trail splits in two directions. To the left, the path grows " +
        "dark and narrow, leading toward a rocky hillside where you can " +
        "just make out the mouth of a cave. To the right, the trees thin " +
        "out and warm sunlight spills across a meadow of wildflowers.",
      rect: { x: 56, y: 80, width: 400, height: 150 },
      lockText: true,
    }),
    createButton({
      name: "Go left",
      style: "roundRect",
      rect: { x: 76, y: 270, width: 160, height: 30 },
      script: 'on mouseUp\n  go to card "The Dark Cave"\nend mouseUp',
    }),
    createButton({
      name: "Go right",
      style: "roundRect",
      rect: { x: 276, y: 270, width: 160, height: 30 },
      script: 'on mouseUp\n  go to card "The Sunny Meadow"\nend mouseUp',
    }),
  ],
});

// ---------- Card 3: The Dark Cave ----------
const card3 = createCard({
  name: "The Dark Cave",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Title",
      style: "transparent",
      content: "The Dark Cave",
      rect: { x: 156, y: 30, width: 200, height: 40 },
      lockText: true,
    }),
    createField({
      name: "Story",
      style: "scrolling",
      content:
        "You step inside the cave. The air is cool and damp. Somewhere " +
        "in the darkness, you hear a low rumbling sound — breathing? " +
        "Your eyes slowly adjust. On the ground you spot a discarded " +
        "torch. The rumbling grows louder.",
      rect: { x: 56, y: 80, width: 400, height: 150 },
      lockText: true,
    }),
    createButton({
      name: "Light a torch",
      style: "roundRect",
      rect: { x: 56, y: 270, width: 180, height: 30 },
      script: 'on mouseUp\n  go to card "You Found the Treasure!"\nend mouseUp',
    }),
    createButton({
      name: "Turn back",
      style: "roundRect",
      rect: { x: 276, y: 270, width: 180, height: 30 },
      script: 'on mouseUp\n  go to card "A Fork in the Path"\nend mouseUp',
    }),
  ],
});

// ---------- Card 4: The Sunny Meadow ----------
const card4 = createCard({
  name: "The Sunny Meadow",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Title",
      style: "transparent",
      content: "The Sunny Meadow",
      rect: { x: 136, y: 30, width: 240, height: 40 },
      lockText: true,
    }),
    createField({
      name: "Story",
      style: "scrolling",
      content:
        "Warm sunlight bathes the meadow in gold. Butterflies flutter " +
        "among the wildflowers, and a gentle stream meanders through " +
        "the grass. It is peaceful here, but you notice something " +
        "glinting near the water's edge.",
      rect: { x: 56, y: 80, width: 400, height: 150 },
      lockText: true,
    }),
    createButton({
      name: "Pick flowers",
      style: "roundRect",
      rect: { x: 56, y: 270, width: 180, height: 30 },
      script: 'on mouseUp\n  go to card "The Dragon Wakes!"\nend mouseUp',
    }),
    createButton({
      name: "Follow the stream",
      style: "roundRect",
      rect: { x: 276, y: 270, width: 180, height: 30 },
      script: 'on mouseUp\n  go to card "You Found the Treasure!"\nend mouseUp',
    }),
  ],
});

// ---------- Card 5: You Found the Treasure! (win) ----------
const card5 = createCard({
  name: "You Found the Treasure!",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Title",
      style: "transparent",
      content: "You Found the Treasure!",
      rect: { x: 96, y: 40, width: 320, height: 40 },
      lockText: true,
    }),
    createField({
      name: "Story",
      style: "scrolling",
      content:
        "Hidden behind a curtain of vines, you discover an ancient chest " +
        "filled with golden coins and sparkling gems. A note inside " +
        'reads: "To the brave explorer — the real treasure was the ' +
        'adventure itself." Congratulations!',
      rect: { x: 56, y: 90, width: 400, height: 150 },
      lockText: true,
    }),
    createButton({
      name: "Play Again",
      style: "roundRect",
      rect: { x: 176, y: 270, width: 160, height: 30 },
      script: 'on mouseUp\n  go to card "The Enchanted Forest"\nend mouseUp',
    }),
  ],
});

// ---------- Card 6: The Dragon Wakes! (lose) ----------
const card6 = createCard({
  name: "The Dragon Wakes!",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Title",
      style: "transparent",
      content: "The Dragon Wakes!",
      rect: { x: 136, y: 40, width: 240, height: 40 },
      lockText: true,
    }),
    createField({
      name: "Story",
      style: "scrolling",
      content:
        "As you reach for the flowers, the ground trembles. A massive " +
        "dragon bursts from beneath the meadow, scales glittering like " +
        "emeralds. It fixes you with a fiery gaze. Perhaps picking " +
        "flowers in an enchanted forest was not the wisest choice!",
      rect: { x: 56, y: 90, width: 400, height: 150 },
      lockText: true,
    }),
    createButton({
      name: "Try Again",
      style: "roundRect",
      rect: { x: 176, y: 270, width: 160, height: 30 },
      script: 'on mouseUp\n  go to card "The Enchanted Forest"\nend mouseUp',
    }),
  ],
});

// ---------- Assemble the stack ----------
const now = new Date().toISOString();

export const adventureStack: WildCardStack = {
  version: "1.0",
  name: "The Enchanted Forest",
  id: "stack_template_adventure",
  width: 512,
  height: 342,
  cards: [card1, card2, card3, card4, card5, card6],
  backgrounds: [bg],
  script: "",
  createdAt: now,
  modifiedAt: now,
};
