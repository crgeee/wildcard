import type { WildCardStack } from "@wildcard/types";
import { addressBookStack } from "./address-book";
import { quizGameStack } from "./quiz-game";
import { adventureStack } from "./adventure";
import { artGalleryStack } from "./art-gallery";

export interface StackTemplate {
  id: string;
  name: string;
  description: string;
  stack: WildCardStack;
}

export const templates: StackTemplate[] = [
  {
    id: "address-book",
    name: "Address Book",
    description:
      "A classic personal address book with contact cards for name, phone, email, and address.",
    stack: addressBookStack,
  },
  {
    id: "quiz-game",
    name: "Quiz Time!",
    description: "An interactive trivia quiz about HyperCard history with score tracking.",
    stack: quizGameStack,
  },
  {
    id: "adventure",
    name: "The Enchanted Forest",
    description: "A choose-your-own-adventure story with branching paths, treasure, and a dragon.",
    stack: adventureStack,
  },
  {
    id: "art-gallery",
    name: "My Gallery",
    description: "A simple gallery viewer with cards for your artwork and navigation controls.",
    stack: artGalleryStack,
  },
];

export { addressBookStack, quizGameStack, adventureStack, artGalleryStack };
