// ---------------------------------------------------------------------------
// Moderation orchestrator — runs all content checks on a stack.
// ---------------------------------------------------------------------------

import { scanText, type ModerationFlag } from "./text-scan.js";
import { scanImage } from "./image-scan.js";

export type { ModerationFlag } from "./text-scan.js";

export interface ModerationResult {
  approved: boolean;
  flags: ModerationFlag[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively extract all string values from an unknown structure. */
function extractStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(extractStrings);
  if (typeof value === "object" && value !== null) {
    return Object.values(value as Record<string, unknown>).flatMap(extractStrings);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all moderation checks on a stack object.
 *
 * Extracts every string value from the stack, concatenates them, then
 * runs text scanning and image scanning (stub).  Returns a result
 * indicating whether the content is approved and any flags raised.
 */
export async function moderateStack(stack: unknown): Promise<ModerationResult> {
  const allText = extractStrings(stack).join("\n");
  const textFlags = scanText(allText);

  // Image scanning is currently a stub — include for future integration.
  const imageFlags = await scanImage(allText);

  const flags = [...textFlags, ...imageFlags];
  const hasHigh = flags.some((f) => f.severity === "high");

  return {
    approved: !hasHigh,
    flags,
  };
}
