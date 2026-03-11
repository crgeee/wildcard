// ---------------------------------------------------------------------------
// Self-contained HTML export for WildCard stacks
//
// Generates a complete, offline-capable HTML file that embeds the stack data
// and renders a preview on a <canvas>. In production the WASM engine and
// renderer would be bundled inline; for now a placeholder is shown.
// ---------------------------------------------------------------------------

/** Minimal type describing a stack that can be exported. */
export interface ExportableStack {
  /** Human-readable stack name (used in <title> and canvas message). */
  name: string;
  /** JSON-serialised stack data (the full stack document). */
  data: string;
}

/**
 * Escape a JSON string so it can be safely embedded inside an HTML
 * `<script type="application/json">` tag.
 *
 * - `</script>` -> `<\/script>` (prevents early tag close)
 * - `<!--`      -> `<\!--`      (prevents HTML comment injection)
 */
function escapeJsonForHtml(raw: string): string {
  return raw
    .replace(/<\//g, "<\\/")
    .replace(/<!--/g, "<\\!--")
    .replace(/<script/gi, "\\u003cscript");
}

/**
 * Generate a fully self-contained HTML document that embeds the given stack
 * data and renders a simple preview using an inline `<canvas>` script.
 */
export function generateExportHtml(stack: ExportableStack): string {
  const escapedData = escapeJsonForHtml(stack.data);
  const escapedName = escapeHtmlText(stack.name);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="WildCard">
<meta name="description" content="${escapeAttr(stack.name)} — exported from WildCard">
<title>${escapedName} — WildCard</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#1a1a1a;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center}
canvas{border:2px solid #444;border-radius:4px;background:#fff;image-rendering:pixelated}
.footer{margin-top:16px;font-size:12px;color:#888;text-align:center}
.loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:14px;color:#666}
</style>
</head>
<body>
<script id="stack-data" type="application/json">${escapedData}</script>
<canvas id="card-canvas" width="512" height="342"></canvas>
<p class="footer">Made with WildCard &mdash; wildcard.you</p>
<script>
(function(){
  var raw = document.getElementById("stack-data").textContent;
  var stack;
  try { stack = JSON.parse(raw); } catch(e) { stack = null; }

  var canvas = document.getElementById("card-canvas");
  var ctx = canvas.getContext("2d");

  // --- Placeholder rendering -------------------------------------------------
  // In a production build the @wildcard/engine WASM binary and
  // @wildcard/renderer would be bundled inline here, allowing full
  // interactive playback of the stack. For now we render a static preview.
  // ---------------------------------------------------------------------------

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 18px 'Chicago', 'Monaco', monospace";
  ctx.textAlign = "center";
  ctx.fillText("This stack was exported from WildCard", canvas.width / 2, canvas.height / 2 - 20);

  ctx.font = "14px 'Geneva', 'Helvetica Neue', sans-serif";
  ctx.fillText(${escapeJsonForHtml(JSON.stringify(stack.name))}, canvas.width / 2, canvas.height / 2 + 10);

  ctx.fillStyle = "#888888";
  ctx.font = "12px 'Geneva', 'Helvetica Neue', sans-serif";
  ctx.fillText("wildcard.you", canvas.width / 2, canvas.height - 20);
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Escape text for safe embedding in HTML element content. */
function escapeHtmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escape text for safe embedding in an HTML attribute value. */
function escapeAttr(s: string): string {
  return escapeHtmlText(s).replace(/"/g, "&quot;");
}
