import { describe, it, expect, beforeEach } from "vitest";
import app from "../server/index.js";
import { resetGallery } from "../server/routes/gallery.js";
import { resetStacks } from "../server/routes/stacks.js";
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

/** Publish a gallery entry and return its slug. */
async function publishEntry(stackId: string, title: string, description = ""): Promise<string> {
  const res = await app.request("/api/gallery/publish", json({ stackId, title, description }));
  const body = (await res.json()) as { slug: string };
  return body.slug;
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
// SSR — OG meta tags
// ===========================================================================

describe("SSR stack permalinks", () => {
  it("returns correct OG meta tags for a published stack", async () => {
    const slug = await publishEntry("stack-42", "My Cool Stack", "A demo stack");

    const res = await app.request(`/s/${slug}`);
    expect(res.status).toBe(200);

    const html = await res.text();

    // OG tags
    expect(html).toContain('<meta property="og:title" content="My Cool Stack"');
    expect(html).toContain('<meta property="og:description" content="A demo stack"');
    expect(html).toContain(
      '<meta property="og:image" content="https://wildcard.you/api/thumbnails/stack-42.png"',
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://wildcard.you/s/my-cool-stack"',
    );

    // Twitter card tags
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"');
    expect(html).toContain('<meta name="twitter:title" content="My Cool Stack"');
    expect(html).toContain('<meta name="twitter:description" content="A demo stack"');
    expect(html).toContain(
      '<meta name="twitter:image" content="https://wildcard.you/api/thumbnails/stack-42.png"',
    );
  });

  it("returns SPA fallback for non-existent slug", async () => {
    const res = await app.request("/s/does-not-exist");
    expect(res.status).toBe(200);

    const html = await res.text();

    // Should be a basic SPA shell
    expect(html).toContain('<div id="app"></div>');
    expect(html).toContain('<script type="module" src="/src/main.tsx"></script>');

    // Should NOT contain OG tags
    expect(html).not.toContain("og:title");
    expect(html).not.toContain("og:description");
  });

  it("escapes HTML in title and description", async () => {
    const slug = await publishEntry(
      "s1",
      'Title <script>alert("xss")</script>',
      'Desc "with" quotes',
    );

    const res = await app.request(`/s/${slug}`);
    const html = await res.text();

    // Should be escaped
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ===========================================================================
// JSON-LD structured data
// ===========================================================================

describe("JSON-LD structured data", () => {
  it("includes JSON-LD in SSR HTML for a published stack", async () => {
    const slug = await publishEntry("stack-7", "LD Stack", "Schema test");

    const res = await app.request(`/s/${slug}`);
    const html = await res.text();

    expect(html).toContain('<script type="application/ld+json">');

    // Extract JSON-LD
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();

    const jsonLd = JSON.parse(match![1]);
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("SoftwareApplication");
    expect(jsonLd.name).toBe("LD Stack");
    expect(jsonLd.description).toBe("Schema test");
    expect(jsonLd.url).toBe("https://wildcard.you/s/ld-stack");
    expect(jsonLd.applicationCategory).toBe("Multimedia");
    expect(jsonLd.operatingSystem).toBe("Web");
  });

  it("does not include JSON-LD in SPA fallback", async () => {
    const res = await app.request("/s/nonexistent");
    const html = await res.text();

    expect(html).not.toContain("application/ld+json");
  });
});

// ===========================================================================
// Sitemap
// ===========================================================================

describe("Sitemap", () => {
  it("returns valid XML with correct static URLs", async () => {
    const res = await app.request("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/xml");

    const xml = await res.text();

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<urlset");
    expect(xml).toContain("http://www.sitemaps.org/schemas/sitemap/0.9");

    // Static pages
    expect(xml).toContain("<loc>https://wildcard.you/</loc>");
    expect(xml).toContain("<loc>https://wildcard.you/gallery</loc>");
    expect(xml).toContain("<loc>https://wildcard.you/learn</loc>");
    expect(xml).toContain("<loc>https://wildcard.you/legal</loc>");

    // Structural elements
    expect(xml).toContain("<lastmod>");
    expect(xml).toContain("<changefreq>");
    expect(xml).toContain("<priority>");
  });

  it("includes published gallery entry URLs", async () => {
    await publishEntry("s1", "Sitemap Entry");

    const res = await app.request("/sitemap.xml");
    const xml = await res.text();

    expect(xml).toContain("<loc>https://wildcard.you/s/sitemap-entry</loc>");
  });
});

// ===========================================================================
// Robots.txt
// ===========================================================================

describe("Robots.txt", () => {
  it("returns correct content", async () => {
    const res = await app.request("/robots.txt");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const text = await res.text();
    expect(text).toContain("User-agent: *");
    expect(text).toContain("Allow: /");
    expect(text).toContain("Sitemap: https://wildcard.you/sitemap.xml");
  });
});

// ===========================================================================
// Thumbnail endpoint
// ===========================================================================

describe("Thumbnail endpoint", () => {
  it("returns image/png content type", async () => {
    const res = await app.request("/api/thumbnails/some-stack.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns a non-empty body", async () => {
    const res = await app.request("/api/thumbnails/some-stack.png");
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });
});
