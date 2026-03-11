import { Hono } from "hono";
import { SITE_URL } from "./config.js";

// ---------------------------------------------------------------------------
// Thumbnail URL generation & stub endpoint
//
// For now, returns a placeholder 1x1 transparent PNG. Actual canvas-to-PNG
// rendering will replace this in a later phase.
// ---------------------------------------------------------------------------

/** Return the public URL for a stack thumbnail. */
export function getThumbnailUrl(stackId: string): string {
  return `${SITE_URL}/api/thumbnails/${stackId}.png`;
}

// 1x1 transparent PNG (68 bytes)
const TRANSPARENT_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02,
  0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const thumbnailRoutes = new Hono();

/** GET /api/thumbnails/:id.png — stub placeholder PNG. */
thumbnailRoutes.get("/:id.png", async (c) => {
  c.header("Content-Type", "image/png");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(TRANSPARENT_PNG);
});

export default thumbnailRoutes;
