import { Hono } from "hono";
import { errorJson, parseJsonBody } from "../lib/responses.js";

// ---------------------------------------------------------------------------
// In-memory store — will be replaced by PostgreSQL + S3 in a later phase.
// ---------------------------------------------------------------------------

interface Stack {
  id: string;
  name: string;
  cards: unknown[];
  createdAt: string;
  updatedAt: string;
}

const stacks = new Map<string, Stack>();

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `stack-${idCounter}`;
}

/** Reset store — exposed for tests. */
export function resetStacks(): void {
  stacks.clear();
  idCounter = 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidStackBody(body: unknown): body is { name: string; cards: unknown[] } {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.name === "string" && Array.isArray(b.cards);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const stackRoutes = new Hono();

/** POST /api/stacks — create a new stack. */
stackRoutes.post("/", async (c) => {
  const body = await parseJsonBody(c);
  if (!body) {
    return c.json(errorJson(400, "Invalid JSON body"), 400);
  }

  if (!isValidStackBody(body)) {
    return c.json(errorJson(400, "Missing required fields: name (string), cards (array)"), 400);
  }

  const now = new Date().toISOString();
  const stack: Stack = {
    id: nextId(),
    name: body.name,
    cards: body.cards,
    createdAt: now,
    updatedAt: now,
  };
  stacks.set(stack.id, stack);

  return c.json(stack, 201);
});

/** GET /api/stacks/:id — retrieve a stack by ID. */
stackRoutes.get("/:id", async (c) => {
  const stack = stacks.get(c.req.param("id"));
  if (!stack) {
    return c.json(errorJson(404, "Stack not found"), 404);
  }
  return c.json(stack, 200);
});

/** PATCH /api/stacks/:id — partially update a stack. */
stackRoutes.patch("/:id", async (c) => {
  const stack = stacks.get(c.req.param("id"));
  if (!stack) {
    return c.json(errorJson(404, "Stack not found"), 404);
  }

  const patch = await parseJsonBody(c);
  if (!patch) {
    return c.json(errorJson(400, "Invalid JSON body"), 400);
  }

  if (patch.name !== undefined) {
    if (typeof patch.name !== "string") {
      return c.json(errorJson(400, "name must be a string"), 400);
    }
    stack.name = patch.name;
  }

  if (patch.cards !== undefined) {
    if (!Array.isArray(patch.cards)) {
      return c.json(errorJson(400, "cards must be an array"), 400);
    }
    stack.cards = patch.cards;
  }

  stack.updatedAt = new Date().toISOString();
  return c.json(stack, 200);
});

/** DELETE /api/stacks/:id — delete a stack. */
stackRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  if (!stacks.has(id)) {
    return c.json(errorJson(404, "Stack not found"), 404);
  }
  stacks.delete(id);
  return c.json({ ok: true }, 200);
});

export default stackRoutes;
