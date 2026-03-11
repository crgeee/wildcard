import { describe, it, expect, beforeEach } from "vitest";
import app from "../server/index.js";
import { resetStacks } from "../server/routes/stacks.js";
import { resetGallery } from "../server/routes/gallery.js";
import { resetAuth } from "../server/routes/auth.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function patch(body: unknown): RequestInit {
  return {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ---------------------------------------------------------------------------
// Reset stores between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetStacks();
  resetGallery();
  resetAuth();
});

// ===========================================================================
// Health check
// ===========================================================================

describe("GET /api/health", () => {
  it("returns 200 with ok: true", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.timestamp).toBeDefined();
  });
});

// ===========================================================================
// Security headers
// ===========================================================================

describe("Security headers", () => {
  it("sets Content-Security-Policy", async () => {
    const res = await app.request("/api/health");
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
  });

  it("sets X-Content-Type-Options to nosniff", async () => {
    const res = await app.request("/api/health");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets X-Frame-Options to DENY", async () => {
    const res = await app.request("/api/health");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("sets Referrer-Policy", async () => {
    const res = await app.request("/api/health");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
});

// ===========================================================================
// Stacks CRUD
// ===========================================================================

describe("Stacks API", () => {
  describe("POST /api/stacks", () => {
    it("creates a stack and returns 201", async () => {
      const res = await app.request(
        "/api/stacks",
        json({ name: "My Stack", cards: [{ id: "c1" }] }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe("My Stack");
      expect(body.cards).toHaveLength(1);
    });

    it("returns 400 for missing name", async () => {
      const res = await app.request("/api/stacks", json({ cards: [] }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it("returns 400 for missing cards", async () => {
      const res = await app.request("/api/stacks", json({ name: "No Cards" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid JSON", async () => {
      const res = await app.request("/api/stacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/stacks/:id", () => {
    it("returns 200 for an existing stack", async () => {
      const create = await app.request("/api/stacks", json({ name: "Test", cards: [] }));
      const { id } = (await create.json()) as { id: string };

      const res = await app.request(`/api/stacks/${id}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("Test");
    });

    it("returns 404 for a non-existent stack", async () => {
      const res = await app.request("/api/stacks/does-not-exist");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/stacks/:id", () => {
    it("updates name and returns 200", async () => {
      const create = await app.request("/api/stacks", json({ name: "Old", cards: [] }));
      const { id } = (await create.json()) as { id: string };

      const res = await app.request(`/api/stacks/${id}`, patch({ name: "New" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("New");
    });

    it("updates cards and returns 200", async () => {
      const create = await app.request("/api/stacks", json({ name: "S", cards: [] }));
      const { id } = (await create.json()) as { id: string };

      const res = await app.request(
        `/api/stacks/${id}`,
        patch({ cards: [{ id: "c1" }, { id: "c2" }] }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.cards).toHaveLength(2);
    });

    it("returns 404 for non-existent stack", async () => {
      const res = await app.request("/api/stacks/nope", patch({ name: "X" }));
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid name type", async () => {
      const create = await app.request("/api/stacks", json({ name: "S", cards: [] }));
      const { id } = (await create.json()) as { id: string };

      const res = await app.request(`/api/stacks/${id}`, patch({ name: 123 }));
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/stacks/:id", () => {
    it("deletes and returns 200", async () => {
      const create = await app.request("/api/stacks", json({ name: "Bye", cards: [] }));
      const { id } = (await create.json()) as { id: string };

      const del = await app.request(`/api/stacks/${id}`, { method: "DELETE" });
      expect(del.status).toBe(200);

      const get = await app.request(`/api/stacks/${id}`);
      expect(get.status).toBe(404);
    });

    it("returns 404 for non-existent stack", async () => {
      const res = await app.request("/api/stacks/nope", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });
});

// ===========================================================================
// Gallery
// ===========================================================================

describe("Gallery API", () => {
  describe("GET /api/gallery", () => {
    it("returns paginated response with defaults", async () => {
      const res = await app.request("/api/gallery");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items).toEqual([]);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(20);
      expect(body.total).toBe(0);
      expect(body.totalPages).toBe(1);
    });

    it("respects page and limit params", async () => {
      const res = await app.request("/api/gallery?page=2&limit=5");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.page).toBe(2);
      expect(body.limit).toBe(5);
    });
  });

  describe("POST /api/gallery/publish", () => {
    it("publishes a stack and returns 201", async () => {
      const res = await app.request(
        "/api/gallery/publish",
        json({ stackId: "stack-1", title: "Cool Stack", description: "A demo" }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.slug).toBe("cool-stack");
      expect(body.title).toBe("Cool Stack");
      expect(body.stackId).toBe("stack-1");
    });

    it("returns 400 for missing fields", async () => {
      const res = await app.request("/api/gallery/publish", json({ title: "No Stack ID" }));
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/gallery/:slug", () => {
    it("returns 200 for a published entry", async () => {
      await app.request("/api/gallery/publish", json({ stackId: "s1", title: "My Entry" }));

      const res = await app.request("/api/gallery/my-entry");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBe("My Entry");
    });

    it("returns 404 for a non-existent slug", async () => {
      const res = await app.request("/api/gallery/nope");
      expect(res.status).toBe(404);
    });
  });

  describe("Pagination with data", () => {
    it("paginates published entries correctly", async () => {
      // Publish 3 entries
      for (let i = 1; i <= 3; i++) {
        await app.request("/api/gallery/publish", json({ stackId: `s${i}`, title: `Entry ${i}` }));
      }

      const page1 = await app.request("/api/gallery?page=1&limit=2");
      const body1 = await page1.json();
      expect(body1.items).toHaveLength(2);
      expect(body1.total).toBe(3);
      expect(body1.totalPages).toBe(2);

      const page2 = await app.request("/api/gallery?page=2&limit=2");
      const body2 = await page2.json();
      expect(body2.items).toHaveLength(1);
    });
  });
});

// ===========================================================================
// Auth
// ===========================================================================

describe("Auth API", () => {
  describe("POST /api/auth/register", () => {
    it("registers a user and returns 201 with token", async () => {
      const res = await app.request(
        "/api/auth/register",
        json({ email: "test@example.com", password: "secret123" }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.user.email).toBe("test@example.com");
      expect(body.token).toBeDefined();
    });

    it("returns 409 for duplicate email", async () => {
      await app.request("/api/auth/register", json({ email: "dup@example.com", password: "pw" }));
      const res = await app.request(
        "/api/auth/register",
        json({ email: "dup@example.com", password: "pw2" }),
      );
      expect(res.status).toBe(409);
    });

    it("returns 400 for missing fields", async () => {
      const res = await app.request(
        "/api/auth/register",
        json({ email: "no-password@example.com" }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in with correct credentials", async () => {
      await app.request("/api/auth/register", json({ email: "u@e.com", password: "pass" }));

      const res = await app.request(
        "/api/auth/login",
        json({ email: "u@e.com", password: "pass" }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.token).toBeDefined();
    });

    it("returns 401 for wrong password", async () => {
      await app.request("/api/auth/register", json({ email: "u@e.com", password: "pass" }));

      const res = await app.request(
        "/api/auth/login",
        json({ email: "u@e.com", password: "wrong" }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 401 for non-existent user", async () => {
      const res = await app.request(
        "/api/auth/login",
        json({ email: "nobody@e.com", password: "pw" }),
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns user for valid token", async () => {
      const reg = await app.request(
        "/api/auth/register",
        json({ email: "me@e.com", password: "pw" }),
      );
      const { token } = (await reg.json()) as { token: string };

      const res = await app.request("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.email).toBe("me@e.com");
    });

    it("returns 401 without Authorization header", async () => {
      const res = await app.request("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("returns 401 for invalid token", async () => {
      const res = await app.request("/api/auth/me", {
        headers: { Authorization: "Bearer fake-jwt-nonexistent" },
      });
      expect(res.status).toBe(401);
    });
  });
});
