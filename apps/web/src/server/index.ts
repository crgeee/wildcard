import { Hono } from "hono";
import { cors } from "hono/cors";
import { securityHeaders } from "./middleware/security.js";
import stackRoutes from "./routes/stacks.js";
import galleryRoutes from "./routes/gallery.js";
import authRoutes from "./routes/auth.js";
import moderationRoutes from "./routes/moderation.js";
import exportRoutes from "./routes/export.js";
import ssrRoutes from "./routes/ssr.js";
import sitemapRoutes from "./routes/sitemap.js";
import robotsRoutes from "./routes/robots.js";
import thumbnailRoutes from "./thumbnail.js";

// ---------------------------------------------------------------------------
// Hono application
//
// This module creates and configures the Hono app but does NOT start
// listening. The production entry point (or test harness) imports `app`
// and either calls `app.request()` or wraps it with `@hono/node-server`.
// ---------------------------------------------------------------------------

const app = new Hono();

// --- Global middleware -----------------------------------------------------

app.use(
  "*",
  cors({
    origin:
      process.env.ALLOWED_ORIGIN ??
      (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173"),
    allowMethods: ["GET", "POST", "PATCH", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);
app.use("*", securityHeaders);

// --- API routes ------------------------------------------------------------

app.route("/api/stacks", stackRoutes);
app.route("/api/gallery", galleryRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/moderation", moderationRoutes);
app.route("/api/export", exportRoutes);

// --- SEO & SSR routes ------------------------------------------------------

app.route("/s", ssrRoutes);
app.route("/sitemap.xml", sitemapRoutes);
app.route("/robots.txt", robotsRoutes);
app.route("/api/thumbnails", thumbnailRoutes);

// --- Health check ----------------------------------------------------------

app.get("/api/health", async (c) => {
  return c.json({ ok: true, timestamp: new Date().toISOString() }, 200);
});

export default app;
