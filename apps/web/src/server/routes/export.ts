import { Hono } from "hono";
import { errorJson, parseJsonBody } from "../lib/responses.js";
import { generateExportHtml } from "../../export/html.js";
import type { ExportableStack } from "../../export/html.js";

// ---------------------------------------------------------------------------
// Export routes — generate downloadable artefacts from stack data.
// ---------------------------------------------------------------------------

const exportRoutes = new Hono();

/** POST /api/export/html — return a self-contained HTML file for the stack. */
exportRoutes.post("/html", async (c) => {
  const body = await parseJsonBody(c);
  if (!body) {
    return c.json(errorJson(400, "Invalid JSON body"), 400);
  }

  // --- Validate required fields -------------------------------------------

  if (typeof body.name !== "string" || body.name.length === 0) {
    return c.json(errorJson(400, "Missing required field: name (string)"), 400);
  }

  if (body.data === undefined || body.data === null) {
    return c.json(errorJson(400, "Missing required field: data (string or object)"), 400);
  }

  // If `data` is an object, serialise it to JSON for the export template.
  const dataString: string = typeof body.data === "string" ? body.data : JSON.stringify(body.data);

  const stack: ExportableStack = {
    name: body.name as string,
    data: dataString,
  };

  const html = generateExportHtml(stack);

  // Build a filename-safe version of the stack name.
  const safeName =
    (body.name as string)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 64) || "stack";

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.html"`,
    },
  });
});

export default exportRoutes;
