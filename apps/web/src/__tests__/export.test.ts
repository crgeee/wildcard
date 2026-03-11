import { describe, it, expect } from "vitest";
import { generateExportHtml } from "../export/html.js";
import type { ExportableStack } from "../export/html.js";
import app from "../server/index.js";

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

function makeStack(overrides: Partial<ExportableStack> = {}): ExportableStack {
  return {
    name: "Test Stack",
    data: JSON.stringify({ cards: [{ id: "c1" }] }),
    ...overrides,
  };
}

// ===========================================================================
// generateExportHtml — unit tests
// ===========================================================================

describe("generateExportHtml", () => {
  it("returns valid HTML with DOCTYPE", () => {
    const html = generateExportHtml(makeStack());
    expect(html).toMatch(/^<!DOCTYPE html>/);
  });

  it("contains the stack name in the <title>", () => {
    const html = generateExportHtml(makeStack({ name: "My Cool Stack" }));
    expect(html).toContain("<title>My Cool Stack");
  });

  it("embeds the stack data as a JSON script tag", () => {
    const data = JSON.stringify({ cards: [{ id: "c1" }] });
    const html = generateExportHtml(makeStack({ data }));
    expect(html).toContain('<script id="stack-data" type="application/json">');
    // The raw JSON should be present (possibly escaped) between the tags
    expect(html).toContain('"cards"');
  });

  it("escapes </script> in embedded JSON data", () => {
    const malicious = JSON.stringify({ text: "</script><script>alert(1)</script>" });
    const html = generateExportHtml(makeStack({ data: malicious }));
    // The literal sequence </script> must NOT appear in the data section
    // (it would prematurely close the script tag).
    const dataStart = html.indexOf('<script id="stack-data"');
    const dataEnd = html.indexOf("</script>", dataStart);
    const dataSection = html.slice(dataStart, dataEnd);
    expect(dataSection).not.toContain("</script>");
    // But the escaped version should be there
    expect(dataSection).toContain("<\\/script");
  });

  it("escapes <!-- in embedded JSON data", () => {
    const data = JSON.stringify({ comment: "<!-- hidden -->" });
    const html = generateExportHtml(makeStack({ data }));
    const dataStart = html.indexOf('<script id="stack-data"');
    const dataEnd = html.indexOf("</script>", dataStart);
    const dataSection = html.slice(dataStart, dataEnd);
    expect(dataSection).not.toContain("<!--");
    expect(dataSection).toContain("<\\!--");
  });

  it("has no external resource references (fully self-contained)", () => {
    const html = generateExportHtml(makeStack());
    // No <link rel="stylesheet" href="..."> or <script src="...">
    expect(html).not.toMatch(/<link[^>]+href\s*=/);
    expect(html).not.toMatch(/<script[^>]+src\s*=/);
    // No http:// or https:// URLs in tags (except inside the JSON data itself)
    // Strip the JSON data section first to avoid false positives
    const withoutData = html.replace(/<script id="stack-data"[^>]*>[\s\S]*?<\/script>/, "");
    expect(withoutData).not.toMatch(/https?:\/\//);
  });

  it("includes the WildCard footer note", () => {
    const html = generateExportHtml(makeStack());
    expect(html).toContain("wildcard.you");
    expect(html).toContain("Made with WildCard");
  });

  it("includes a <canvas> element", () => {
    const html = generateExportHtml(makeStack());
    expect(html).toContain("<canvas");
  });

  it("escapes HTML-special characters in the stack name", () => {
    const html = generateExportHtml(makeStack({ name: '<script>alert("xss")</script>' }));
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ===========================================================================
// POST /api/export/html — integration tests
// ===========================================================================

describe("POST /api/export/html", () => {
  it("returns HTML content type", async () => {
    const res = await app.request(
      "/api/export/html",
      json({ name: "My Stack", data: '{"cards":[]}' }),
    );
    expect(res.status).toBe(200);
    const ct = res.headers.get("Content-Type");
    expect(ct).toContain("text/html");
  });

  it("sets Content-Disposition header with filename", async () => {
    const res = await app.request(
      "/api/export/html",
      json({ name: "Cool Stack", data: '{"cards":[]}' }),
    );
    const cd = res.headers.get("Content-Disposition");
    expect(cd).toContain("attachment");
    expect(cd).toContain("Cool_Stack.html");
  });

  it("returns valid HTML in the body", async () => {
    const res = await app.request(
      "/api/export/html",
      json({ name: "Export Test", data: '{"cards":[]}' }),
    );
    const body = await res.text();
    expect(body).toMatch(/^<!DOCTYPE html>/);
    expect(body).toContain("Export Test");
  });

  it("accepts data as an object and stringifies it", async () => {
    const res = await app.request(
      "/api/export/html",
      json({ name: "Obj Data", data: { cards: [{ id: "c1" }] } }),
    );
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('"cards"');
  });

  it("returns 400 when name is missing", async () => {
    const res = await app.request("/api/export/html", json({ data: '{"cards":[]}' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when data is missing", async () => {
    const res = await app.request("/api/export/html", json({ name: "No Data" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await app.request("/api/export/html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is empty string", async () => {
    const res = await app.request("/api/export/html", json({ name: "", data: "{}" }));
    expect(res.status).toBe(400);
  });
});
