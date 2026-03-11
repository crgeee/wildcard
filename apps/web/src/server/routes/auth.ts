import { Hono } from "hono";
import { errorJson, parseJsonBody } from "../lib/responses.js";

// ---------------------------------------------------------------------------
// In-memory store — will be replaced by PostgreSQL + bcrypt + real JWT.
// ---------------------------------------------------------------------------

interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

const users = new Map<string, User>();
/** email → password (plain text — stub only, never do this in production). */
const passwords = new Map<string, string>();

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `user-${idCounter}`;
}

/** Reset store — exposed for tests. */
export function resetAuth(): void {
  users.clear();
  passwords.clear();
  idCounter = 0;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const authRoutes = new Hono();

// ---------------------------------------------------------------------------
// Production guard — these are stubs with plaintext passwords and fake JWTs.
// They must NOT be accessible in production until replaced with real auth.
// Set AUTH_ENABLED=true in env to opt-in (only after implementing bcrypt+JWT).
// ---------------------------------------------------------------------------

authRoutes.use("*", async (c, next) => {
  if (process.env.NODE_ENV === "production" && process.env.AUTH_ENABLED !== "true") {
    return c.json(errorJson(503, "Auth is not yet available"), 503);
  }
  return next();
});

authRoutes.post("/register", async (c) => {
  const b = await parseJsonBody(c);
  if (!b) {
    return c.json(errorJson(400, "Invalid JSON body"), 400);
  }

  if (typeof b.email !== "string" || typeof b.password !== "string") {
    return c.json(
      errorJson(400, "Missing required fields: email (string), password (string)"),
      400,
    );
  }

  if (passwords.has(b.email)) {
    return c.json(errorJson(409, "Email already registered"), 409);
  }

  const user: User = {
    id: nextId(),
    email: b.email,
    displayName: typeof b.displayName === "string" ? b.displayName : b.email,
    createdAt: new Date().toISOString(),
  };

  users.set(user.id, user);
  passwords.set(b.email, b.password);

  return c.json({ user, token: `fake-jwt-${user.id}` }, 201);
});

/**
 * POST /api/auth/login — log in (stub).
 *
 * TODO: Replace with real bcrypt comparison.
 * TODO: Issue real JWT with appropriate expiry and claims.
 * TODO: Add rate limiting to prevent brute force.
 */
authRoutes.post("/login", async (c) => {
  const b = await parseJsonBody(c);
  if (!b) {
    return c.json(errorJson(400, "Invalid JSON body"), 400);
  }

  if (typeof b.email !== "string" || typeof b.password !== "string") {
    return c.json(
      errorJson(400, "Missing required fields: email (string), password (string)"),
      400,
    );
  }

  const storedPassword = passwords.get(b.email);
  if (!storedPassword || storedPassword !== b.password) {
    return c.json(errorJson(401, "Invalid email or password"), 401);
  }

  const user = Array.from(users.values()).find((u) => u.email === b.email);
  if (!user) {
    return c.json(errorJson(401, "Invalid email or password"), 401);
  }

  return c.json({ user, token: `fake-jwt-${user.id}` }, 200);
});

/**
 * GET /api/auth/me — get current user (stub).
 *
 * TODO: Parse real JWT from Authorization header.
 * TODO: Validate token signature and expiry.
 */
authRoutes.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(errorJson(401, "Unauthorized — no token provided"), 401);
  }

  const token = authHeader.replace("Bearer ", "");
  // Stub: extract user ID from fake token format "fake-jwt-user-N"
  const userId = token.replace("fake-jwt-", "");
  const user = users.get(userId);

  if (!user) {
    return c.json(errorJson(401, "Unauthorized — invalid token"), 401);
  }

  return c.json({ user }, 200);
});

export default authRoutes;
