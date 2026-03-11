import { describe, it, expect, beforeEach } from "vitest";
import { scanText } from "../server/moderation/text-scan.js";
import { moderateStack } from "../server/moderation/index.js";
import app from "../server/index.js";
import { resetGallery } from "../server/routes/gallery.js";
import { resetModeration } from "../server/routes/moderation.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function req(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  const init: RequestInit = { method, headers: { "Content-Type": "application/json", ...headers } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return app.request(path, init);
}

// ---------------------------------------------------------------------------
// Text scanner unit tests
// ---------------------------------------------------------------------------

describe("scanText", () => {
  it("catches profanity", () => {
    const flags = scanText("this is shit content");
    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe("profanity");
    expect(flags[0].severity).toBe("high");
  });

  it("is case-insensitive for profanity", () => {
    const flags = scanText("SHIT and Fuck");
    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe("profanity");
    expect(flags[0].detail).toContain("shit");
    expect(flags[0].detail).toContain("fuck");
  });

  it("respects word boundaries — does not flag 'class' or 'assassin'", () => {
    const flags = scanText("The class went on a field trip to see the assassin movie");
    expect(flags).toHaveLength(0);
  });

  it("catches excessive ALL CAPS", () => {
    const flags = scanText("THIS IS A REALLY LONG BLOCK OF TEXT THAT IS ALL IN UPPERCASE LETTERS");
    expect(flags.some((f) => f.type === "excessive_caps")).toBe(true);
    expect(flags.find((f) => f.type === "excessive_caps")!.severity).toBe("low");
  });

  it("does not flag short all-caps text", () => {
    const flags = scanText("OK FINE");
    expect(flags.some((f) => f.type === "excessive_caps")).toBe(false);
  });

  it("catches URL spam", () => {
    const urls = Array.from({ length: 6 }, (_, i) => `https://example.com/${i}`).join(" ");
    const flags = scanText(urls);
    expect(flags.some((f) => f.type === "url_spam")).toBe(true);
    expect(flags.find((f) => f.type === "url_spam")!.severity).toBe("medium");
  });

  it("does not flag a few URLs", () => {
    const flags = scanText("Visit https://example.com and https://other.com");
    expect(flags.some((f) => f.type === "url_spam")).toBe(false);
  });

  it("passes clean text with no flags", () => {
    const flags = scanText("Hello, welcome to my HyperCard stack!");
    expect(flags).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Moderation orchestrator
// ---------------------------------------------------------------------------

describe("moderateStack", () => {
  it("approves clean content", async () => {
    const result = await moderateStack({ title: "My Stack", description: "A cool stack" });
    expect(result.approved).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  it("rejects content with profanity (high severity)", async () => {
    const result = await moderateStack({ title: "shit stack" });
    expect(result.approved).toBe(false);
    expect(result.flags.some((f) => f.severity === "high")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Gallery publish integration
// ---------------------------------------------------------------------------

describe("Gallery publish with moderation", () => {
  beforeEach(() => {
    resetGallery();
    resetModeration();
  });

  it("publishes clean content with 201", async () => {
    const res = await req("POST", "/api/gallery/publish", {
      stackId: "stack-1",
      title: "My Nice Stack",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toBe("my-nice-stack");
  });

  it("rejects profanity with 400", async () => {
    const res = await req("POST", "/api/gallery/publish", {
      stackId: "stack-2",
      title: "shit stack",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("moderation");
    expect(body.flags.length).toBeGreaterThan(0);
  });

  it("queues content with medium flags (URL spam) with 202", async () => {
    const urls = Array.from({ length: 6 }, (_, i) => `https://spam.com/${i}`).join(" ");
    const res = await req("POST", "/api/gallery/publish", {
      stackId: "stack-3",
      title: "Link Collection",
      description: urls,
    });
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.message).toContain("moderation review");
    expect(body.queueId).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Moderation queue CRUD
// ---------------------------------------------------------------------------

describe("Moderation queue", () => {
  const adminHeaders = { Authorization: "Bearer admin-token" };

  beforeEach(() => {
    resetModeration();
  });

  it("requires admin auth for queue listing", async () => {
    const res = await req("GET", "/api/moderation/queue");
    expect(res.status).toBe(403);
  });

  it("lists pending items", async () => {
    // Seed the queue via gallery publish with medium flag content
    resetGallery();
    const urls = Array.from({ length: 6 }, (_, i) => `https://spam.com/${i}`).join(" ");
    await req("POST", "/api/gallery/publish", {
      stackId: "stack-q",
      title: "Spam Stack",
      description: urls,
    });

    const res = await req("GET", "/api/moderation/queue", undefined, adminHeaders);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBe(1);
    expect(body.items[0].status).toBe("pending");
  });

  it("approves a queued item", async () => {
    resetGallery();
    const urls = Array.from({ length: 6 }, (_, i) => `https://spam.com/${i}`).join(" ");
    const pubRes = await req("POST", "/api/gallery/publish", {
      stackId: "stack-a",
      title: "Approve Me",
      description: urls,
    });
    const { queueId } = await pubRes.json();

    const res = await req("POST", `/api/moderation/${queueId}/approve`, {}, adminHeaders);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("approved");
  });

  it("rejects a queued item with reason", async () => {
    resetGallery();
    const urls = Array.from({ length: 6 }, (_, i) => `https://spam.com/${i}`).join(" ");
    const pubRes = await req("POST", "/api/gallery/publish", {
      stackId: "stack-r",
      title: "Reject Me",
      description: urls,
    });
    const { queueId } = await pubRes.json();

    const res = await req(
      "POST",
      `/api/moderation/${queueId}/reject`,
      { reason: "Spam content" },
      adminHeaders,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("rejected");
    expect(body.rejectReason).toBe("Spam content");
  });

  it("returns 404 for non-existent moderation item", async () => {
    const res = await req("POST", "/api/moderation/mod-999/approve", {}, adminHeaders);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// User report endpoint
// ---------------------------------------------------------------------------

describe("User report endpoint", () => {
  beforeEach(() => {
    resetModeration();
  });

  it("creates a report", async () => {
    const res = await req("POST", "/api/moderation/report", {
      stackId: "stack-42",
      reason: "Inappropriate content",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.stackId).toBe("stack-42");
    expect(body.reason).toBe("Inappropriate content");
    expect(body.id).toBeDefined();
  });

  it("rejects report with missing fields", async () => {
    const res = await req("POST", "/api/moderation/report", { stackId: "stack-42" });
    expect(res.status).toBe(400);
  });
});
