import { Hono } from "hono";
import { errorJson, parseJsonBody } from "../lib/responses.js";

// ---------------------------------------------------------------------------
// In-memory stores — will be replaced by PostgreSQL in a later phase.
// ---------------------------------------------------------------------------

export interface QueueItem {
  id: string;
  stackId: string;
  title: string;
  flags: Array<{ type: string; severity: string; detail: string }>;
  status: "pending" | "approved" | "rejected";
  rejectReason: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  stackId: string;
  reason: string;
  createdAt: string;
}

const queue = new Map<string, QueueItem>();
const reports: Report[] = [];

let queueIdCounter = 0;
function nextQueueId(): string {
  queueIdCounter += 1;
  return `mod-${queueIdCounter}`;
}

let reportIdCounter = 0;
function nextReportId(): string {
  reportIdCounter += 1;
  return `report-${reportIdCounter}`;
}

/** Add an item to the moderation queue (used by gallery publish flow). */
export function enqueue(
  item: Omit<QueueItem, "id" | "status" | "rejectReason" | "createdAt">,
): QueueItem {
  const entry: QueueItem = {
    ...item,
    id: nextQueueId(),
    status: "pending",
    rejectReason: null,
    createdAt: new Date().toISOString(),
  };
  queue.set(entry.id, entry);
  return entry;
}

/** Reset stores — exposed for tests. */
export function resetModeration(): void {
  queue.clear();
  reports.length = 0;
  queueIdCounter = 0;
  reportIdCounter = 0;
}

// ---------------------------------------------------------------------------
// Stub auth check — will be replaced by real middleware.
// ---------------------------------------------------------------------------

function isAdmin(authHeader: string | undefined): boolean {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.replace("Bearer ", "");

  // In production, require ADMIN_TOKEN env var (a real secret).
  // In dev/test, accept any token starting with "admin-" for convenience.
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken) {
    return token === adminToken;
  }
  if (process.env.NODE_ENV === "production") {
    return false; // No ADMIN_TOKEN set in production = no admin access
  }
  return token.startsWith("admin-");
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const moderationRoutes = new Hono();

/** GET /api/moderation/queue — list pending moderation items (admin only). */
moderationRoutes.get("/queue", async (c) => {
  if (!isAdmin(c.req.header("Authorization"))) {
    return c.json(errorJson(403, "Admin access required"), 403);
  }

  const items = Array.from(queue.values()).filter((i) => i.status === "pending");
  return c.json({ items }, 200);
});

/** POST /api/moderation/:id/approve — approve a queued item. */
moderationRoutes.post("/:id/approve", async (c) => {
  if (!isAdmin(c.req.header("Authorization"))) {
    return c.json(errorJson(403, "Admin access required"), 403);
  }

  const item = queue.get(c.req.param("id"));
  if (!item) {
    return c.json(errorJson(404, "Moderation item not found"), 404);
  }

  item.status = "approved";
  return c.json(item, 200);
});

/** POST /api/moderation/:id/reject — reject a queued item with reason. */
moderationRoutes.post("/:id/reject", async (c) => {
  if (!isAdmin(c.req.header("Authorization"))) {
    return c.json(errorJson(403, "Admin access required"), 403);
  }

  const item = queue.get(c.req.param("id"));
  if (!item) {
    return c.json(errorJson(404, "Moderation item not found"), 404);
  }

  const b = await parseJsonBody(c);
  if (!b || typeof b.reason !== "string") {
    return c.json(errorJson(400, "Missing required field: reason (string)"), 400);
  }

  item.status = "rejected";
  item.rejectReason = b.reason;
  return c.json(item, 200);
});

/** POST /api/moderation/report — user reports a published stack. */
moderationRoutes.post("/report", async (c) => {
  const b = await parseJsonBody(c);
  if (!b) {
    return c.json(errorJson(400, "Invalid JSON body"), 400);
  }

  if (typeof b.stackId !== "string" || typeof b.reason !== "string") {
    return c.json(
      errorJson(400, "Missing required fields: stackId (string), reason (string)"),
      400,
    );
  }

  const report: Report = {
    id: nextReportId(),
    stackId: b.stackId,
    reason: b.reason,
    createdAt: new Date().toISOString(),
  };

  reports.push(report);
  return c.json(report, 201);
});

export default moderationRoutes;
