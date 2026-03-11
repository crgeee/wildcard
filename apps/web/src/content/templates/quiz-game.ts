import type { WildCardStack } from "@wildcard/types";
import { createCard, createBackground } from "@wildcard/types";
import { createButton, createField } from "@wildcard/types";

const bg = createBackground({ name: "Quiz Background" });
const bgId = bg.id;

// Helper to create an answer button with correct/incorrect logic
function answerButton(
  label: string,
  x: number,
  y: number,
  isCorrect: boolean,
): ReturnType<typeof createButton> {
  const script = isCorrect
    ? [
        "on mouseUp",
        '  answer "Correct!" with "OK"',
        "  global quizScore",
        "  add 1 to quizScore",
        "  go to next card",
        "end mouseUp",
      ].join("\n")
    : ["on mouseUp", '  answer "Incorrect!" with "OK"', "  go to next card", "end mouseUp"].join(
        "\n",
      );
  return createButton({
    name: label,
    style: "roundRect",
    rect: { x, y, width: 200, height: 30 },
    script,
  });
}

// ---------- Card 1: Title Card ----------
const card1 = createCard({
  name: "Quiz Time!",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Title",
      style: "transparent",
      content: "Quiz Time!",
      rect: { x: 156, y: 60, width: 200, height: 50 },
      lockText: true,
    }),
    createField({
      name: "Subtitle",
      style: "transparent",
      content: "Test your knowledge of HyperCard history",
      rect: { x: 96, y: 120, width: 320, height: 30 },
      lockText: true,
    }),
    createButton({
      name: "Start Quiz",
      style: "roundRect",
      rect: { x: 196, y: 260, width: 120, height: 30 },
      script: [
        "on mouseUp",
        "  global quizScore",
        "  put 0 into quizScore",
        "  go to next card",
        "end mouseUp",
      ].join("\n"),
    }),
  ],
});

// ---------- Card 2: Question 1 ----------
const card2 = createCard({
  name: "Question 1",
  backgroundId: bgId,
  objects: [
    createField({
      name: "QuestionNumber",
      style: "transparent",
      content: "Question 1 of 3",
      rect: { x: 176, y: 20, width: 160, height: 24 },
      lockText: true,
    }),
    createField({
      name: "Question",
      style: "transparent",
      content: "What year was HyperCard created?",
      rect: { x: 56, y: 60, width: 400, height: 40 },
      lockText: true,
    }),
    answerButton("A: 1984", 56, 130, false),
    answerButton("B: 1987", 256, 130, true),
    answerButton("C: 1990", 56, 180, false),
    answerButton("D: 1995", 256, 180, false),
  ],
});

// ---------- Card 3: Question 2 ----------
const card3 = createCard({
  name: "Question 2",
  backgroundId: bgId,
  objects: [
    createField({
      name: "QuestionNumber",
      style: "transparent",
      content: "Question 2 of 3",
      rect: { x: 176, y: 20, width: 160, height: 24 },
      lockText: true,
    }),
    createField({
      name: "Question",
      style: "transparent",
      content: "Who created HyperCard?",
      rect: { x: 56, y: 60, width: 400, height: 40 },
      lockText: true,
    }),
    answerButton("A: Steve Jobs", 56, 130, false),
    answerButton("B: Steve Wozniak", 256, 130, false),
    answerButton("C: Bill Atkinson", 56, 180, true),
    answerButton("D: Jef Raskin", 256, 180, false),
  ],
});

// ---------- Card 4: Question 3 ----------
const card4 = createCard({
  name: "Question 3",
  backgroundId: bgId,
  objects: [
    createField({
      name: "QuestionNumber",
      style: "transparent",
      content: "Question 3 of 3",
      rect: { x: 176, y: 20, width: 160, height: 24 },
      lockText: true,
    }),
    createField({
      name: "Question",
      style: "transparent",
      content: "What game was prototyped in HyperCard?",
      rect: { x: 56, y: 60, width: 400, height: 40 },
      lockText: true,
    }),
    answerButton("A: SimCity", 56, 130, false),
    answerButton("B: Doom", 256, 130, false),
    answerButton("C: Tetris", 56, 180, false),
    answerButton("D: Myst", 256, 180, true),
  ],
});

// ---------- Card 5: Results ----------
const card5 = createCard({
  name: "Results",
  backgroundId: bgId,
  objects: [
    createField({
      name: "Title",
      style: "transparent",
      content: "Quiz Complete!",
      rect: { x: 156, y: 40, width: 200, height: 50 },
      lockText: true,
    }),
    createField({
      name: "Score",
      style: "rectangle",
      content: "",
      rect: { x: 136, y: 120, width: 240, height: 40 },
      lockText: true,
    }),
    createButton({
      name: "Play Again",
      style: "roundRect",
      rect: { x: 196, y: 260, width: 120, height: 30 },
      script: [
        "on mouseUp",
        "  global quizScore",
        "  put 0 into quizScore",
        '  go to card "Quiz Time!"',
        "end mouseUp",
      ].join("\n"),
    }),
  ],
  script: [
    "on openCard",
    "  global quizScore",
    '  put "You scored " & quizScore & " out of 3!" into field "Score"',
    "end openCard",
  ].join("\n"),
});

// ---------- Assemble the stack ----------
const now = new Date().toISOString();

export const quizGameStack: WildCardStack = {
  version: "1.0",
  name: "Quiz Time!",
  id: "stack_template_quiz_game",
  width: 512,
  height: 342,
  cards: [card1, card2, card3, card4, card5],
  backgrounds: [bg],
  script: "",
  createdAt: now,
  modifiedAt: now,
};
