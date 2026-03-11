import { Hono } from "hono";
import { SITE_URL } from "../config.js";

// ---------------------------------------------------------------------------
// robots.txt — crawler directives.
// ---------------------------------------------------------------------------

const ROBOTS_TXT = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

const robotsRoutes = new Hono();

/** GET /robots.txt */
robotsRoutes.get("/", async (c) => {
  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("Cache-Control", "public, max-age=86400");
  return c.body(ROBOTS_TXT);
});

export default robotsRoutes;
