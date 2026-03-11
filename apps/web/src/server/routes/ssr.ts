import { Hono } from "hono";
import { gallery } from "./gallery.js";
import { getThumbnailUrl } from "../thumbnail.js";

// ---------------------------------------------------------------------------
// SSR routes — server-rendered HTML for stack permalinks.
//
// Provides rich OG meta tags and JSON-LD structured data so that link
// previews on Twitter, Discord, Slack, etc. display meaningful content.
// The page also bootstraps the Preact SPA for interactive use.
// ---------------------------------------------------------------------------

const DOMAIN = "https://wildcard.you";

const ssrRoutes = new Hono();

/** Escape HTML special characters to prevent XSS in meta tag values. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Build the full HTML page for a gallery entry. */
function buildSsrPage(entry: {
  title: string;
  description: string;
  slug: string;
  stackId: string;
}): string {
  const url = `${DOMAIN}/s/${entry.slug}`;
  const imageUrl = getThumbnailUrl(entry.stackId);
  const title = escapeHtml(entry.title);
  const description = escapeHtml(entry.description || "A stack built with WildCard");

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: title,
    description,
    url,
    applicationCategory: "Multimedia",
    operatingSystem: "Web",
  }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — WildCard</title>
  <meta name="description" content="${description}" />

  <!-- Open Graph -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="WildCard" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />

  <!-- JSON-LD structured data -->
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

/** SPA fallback shell — used when no gallery entry is found. */
function buildSpaFallback(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WildCard</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

/** GET /s/:slug — SSR page for a published stack. */
ssrRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const entry = gallery.get(slug);

  if (!entry) {
    return c.html(buildSpaFallback());
  }

  return c.html(buildSsrPage(entry));
});

export default ssrRoutes;
