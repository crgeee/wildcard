import type { WildCardStack } from "@wildcard/types";
import { createCard, createBackground } from "@wildcard/types";
import { createButton, createField } from "@wildcard/types";

const bg = createBackground({ name: "Address Book Background" });
const bgId = bg.id;

// ---------- Card 1: Title Card ----------
const card1 = createCard({
  name: "Address Book",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Title",
      style: "transparent",
      content: "Address Book",
      rect: { x: 136, y: 60, width: 240, height: 50 },
      lockText: true,
    }),
    createField({
      name: "Subtitle",
      style: "transparent",
      content: "Your personal contacts",
      rect: { x: 136, y: 110, width: 240, height: 30 },
      lockText: true,
    }),
    createButton({
      name: "Browse Contacts",
      style: "roundRect",
      rect: { x: 176, y: 260, width: 160, height: 30 },
      script: "on mouseUp\n  go to next card\nend mouseUp",
    }),
  ],
});

// ---------- Card 2: Contact Template ----------
const card2 = createCard({
  name: "Contact Template",
  backgroundId: bgId,
  objects: [
    createField({
      name: "CardTitle",
      style: "transparent",
      content: "Contact Card",
      rect: { x: 156, y: 10, width: 200, height: 30 },
      lockText: true,
    }),
    createField({
      name: "NameLabel",
      style: "transparent",
      content: "Name:",
      rect: { x: 40, y: 50, width: 80, height: 24 },
      lockText: true,
    }),
    createField({
      name: "Name",
      style: "rectangle",
      content: "",
      rect: { x: 130, y: 50, width: 340, height: 24 },
      lockText: false,
    }),
    createField({
      name: "PhoneLabel",
      style: "transparent",
      content: "Phone:",
      rect: { x: 40, y: 84, width: 80, height: 24 },
      lockText: true,
    }),
    createField({
      name: "Phone",
      style: "rectangle",
      content: "",
      rect: { x: 130, y: 84, width: 340, height: 24 },
      lockText: false,
    }),
    createField({
      name: "EmailLabel",
      style: "transparent",
      content: "Email:",
      rect: { x: 40, y: 118, width: 80, height: 24 },
      lockText: true,
    }),
    createField({
      name: "Email",
      style: "rectangle",
      content: "",
      rect: { x: 130, y: 118, width: 340, height: 24 },
      lockText: false,
    }),
    createField({
      name: "AddressLabel",
      style: "transparent",
      content: "Address:",
      rect: { x: 40, y: 152, width: 80, height: 24 },
      lockText: true,
    }),
    createField({
      name: "Address",
      style: "scrolling",
      content: "",
      rect: { x: 130, y: 152, width: 340, height: 80 },
      lockText: false,
    }),
    createButton({
      name: "Prev",
      style: "roundRect",
      rect: { x: 40, y: 300, width: 100, height: 30 },
      script: "on mouseUp\n  go to previous card\nend mouseUp",
    }),
    createButton({
      name: "New Contact",
      style: "roundRect",
      rect: { x: 196, y: 300, width: 120, height: 30 },
      script: 'on mouseUp\n  doMenu "New Card"\n  go to last card\nend mouseUp',
    }),
    createButton({
      name: "Next",
      style: "roundRect",
      rect: { x: 372, y: 300, width: 100, height: 30 },
      script: "on mouseUp\n  go to next card\nend mouseUp",
    }),
  ],
});

// ---------- Card 3: Sample Contact ----------
const card3 = createCard({
  name: "Jane Doe",
  backgroundId: bgId,
  objects: [
    createField({
      name: "CardTitle",
      style: "transparent",
      content: "Contact Card",
      rect: { x: 156, y: 10, width: 200, height: 30 },
      lockText: true,
    }),
    createField({
      name: "NameLabel",
      style: "transparent",
      content: "Name:",
      rect: { x: 40, y: 50, width: 80, height: 24 },
      lockText: true,
    }),
    createField({
      name: "Name",
      style: "rectangle",
      content: "Jane Doe",
      rect: { x: 130, y: 50, width: 340, height: 24 },
      lockText: false,
    }),
    createField({
      name: "PhoneLabel",
      style: "transparent",
      content: "Phone:",
      rect: { x: 40, y: 84, width: 80, height: 24 },
      lockText: true,
    }),
    createField({
      name: "Phone",
      style: "rectangle",
      content: "555-0123",
      rect: { x: 130, y: 84, width: 340, height: 24 },
      lockText: false,
    }),
    createField({
      name: "EmailLabel",
      style: "transparent",
      content: "Email:",
      rect: { x: 40, y: 118, width: 80, height: 24 },
      lockText: true,
    }),
    createField({
      name: "Email",
      style: "rectangle",
      content: "jane.doe@example.com",
      rect: { x: 130, y: 118, width: 340, height: 24 },
      lockText: false,
    }),
    createField({
      name: "AddressLabel",
      style: "transparent",
      content: "Address:",
      rect: { x: 40, y: 152, width: 80, height: 24 },
      lockText: true,
    }),
    createField({
      name: "Address",
      style: "scrolling",
      content: "123 Main Street\nAnytown, CA 90210",
      rect: { x: 130, y: 152, width: 340, height: 80 },
      lockText: false,
    }),
    createButton({
      name: "Prev",
      style: "roundRect",
      rect: { x: 40, y: 300, width: 100, height: 30 },
      script: "on mouseUp\n  go to previous card\nend mouseUp",
    }),
    createButton({
      name: "New Contact",
      style: "roundRect",
      rect: { x: 196, y: 300, width: 120, height: 30 },
      script: 'on mouseUp\n  doMenu "New Card"\n  go to last card\nend mouseUp',
    }),
    createButton({
      name: "Next",
      style: "roundRect",
      rect: { x: 372, y: 300, width: 100, height: 30 },
      script: "on mouseUp\n  go to next card\nend mouseUp",
    }),
  ],
});

// ---------- Assemble the stack ----------
const now = new Date().toISOString();

export const addressBookStack: WildCardStack = {
  version: "1.0",
  name: "Address Book",
  id: "stack_template_address_book",
  width: 512,
  height: 342,
  cards: [card1, card2, card3],
  backgrounds: [bg],
  script: "",
  createdAt: now,
  modifiedAt: now,
};
