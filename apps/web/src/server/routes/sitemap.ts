import { Hono } from "hono";
import { gallery } from "./gallery.js";

// ---------------------------------------------------------------------------
// Sitemap — auto-generated XML sitemap for search engines.
// ---------------------------------------------------------------------------

const DOMAIN = "https://wildcard.you";

const sitemapRoutes = new Hono();

/** Static pages with their priorities and change frequencies. */
const STATIC_PAGES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/gallery", changefreq: "daily", priority: "0.9" },
  { path: "/learn", changefreq: "weekly", priority: "0.8" },
  { path: "/legal", changefreq: "monthly", priority: "0.3" },
];

function buildSitemap(): string {
  const today = new Date().toISOString().split("T")[0];

  const urls: string[] = [];

  // Static pages
  for (const page of STATIC_PAGES) {
    urls.push(`  <url>
    <loc>${DOMAIN}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
  }

  // Published gallery entries
  for (const entry of gallery.values()) {
    const lastmod = entry.publishedAt.split("T")[0];
    urls.push(`  <url>
    <loc>${DOMAIN}/s/${entry.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}

/** GET /sitemap.xml */
sitemapRoutes.get("/", async (c) => {
  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(buildSitemap());
});

export default sitemapRoutes;
