// ---------------------------------------------------------------------------
// Image content scanner — stub for future integration.
//
// TODO: Integrate with an image moderation API (e.g. Azure Content Safety,
//       AWS Rekognition, or Google Cloud Vision) in Phase 7.
// ---------------------------------------------------------------------------

import type { ModerationFlag } from "./text-scan.js";

/**
 * Scan image data for policy violations.
 *
 * Currently a stub that always returns an empty array.  The function
 * signature is exported so downstream code can integrate it now and
 * the implementation can be swapped in later without API changes.
 */
export async function scanImage(_imageData: string): Promise<ModerationFlag[]> {
  // TODO: Implement real image scanning with external moderation API.
  return [];
}
