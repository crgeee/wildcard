import type { Context } from "hono";

export function errorJson(status: number, error: string) {
  return { error, status };
}

export async function parseJsonBody(c: Context): Promise<Record<string, unknown> | null> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null) return null;
  return body as Record<string, unknown>;
}
