import { Hono } from "hono";
import { errorJson, parseJsonBody } from "../lib/responses.js";

// ---------------------------------------------------------------------------
// In-memory store — will be replaced by PostgreSQL in a later phase.
// ---------------------------------------------------------------------------

interface GalleryEntry {
  id: string;
  stackId: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  featured: boolean;
  publishedAt: string;
}

const gallery = new Map<string, GalleryEntry>();

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `gallery-${idCounter}`;
}

/** Reset store — exposed for tests. */
export function resetGallery(): void {
  gallery.clear();
  idCounter = 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const galleryRoutes = new Hono();

/** GET /api/gallery — list published stacks (paginated). */
galleryRoutes.get("/", async (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? "20")));

  const all = Array.from(gallery.values());
  const total = all.length;
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);

  return c.json(
    {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    200,
  );
});

/** POST /api/gallery/publish — publish a stack to the gallery. */
galleryRoutes.post("/publish", async (c) => {
  const b = await parseJsonBody(c);
  if (!b) {
    return c.json(errorJson(400, "Invalid JSON body"), 400);
  }

  if (typeof b.stackId !== "string" || typeof b.title !== "string") {
    return c.json(errorJson(400, "Missing required fields: stackId (string), title (string)"), 400);
  }

  const slug = slugify(b.title);

  if (gallery.has(slug)) {
    return c.json(errorJson(409, "A gallery entry with this slug already exists"), 409);
  }

  const entry: GalleryEntry = {
    id: nextId(),
    stackId: b.stackId,
    slug,
    title: b.title,
    description: typeof b.description === "string" ? b.description : "",
    thumbnailUrl: typeof b.thumbnailUrl === "string" ? b.thumbnailUrl : null,
    featured: false,
    publishedAt: new Date().toISOString(),
  };

  gallery.set(entry.slug, entry);
  return c.json(entry, 201);
});

/** GET /api/gallery/:slug — get a single gallery entry by slug. */
galleryRoutes.get("/:slug", async (c) => {
  const entry = gallery.get(c.req.param("slug"));
  if (!entry) {
    return c.json(errorJson(404, "Gallery entry not found"), 404);
  }
  return c.json(entry, 200);
});

export default galleryRoutes;
