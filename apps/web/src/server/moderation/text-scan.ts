// ---------------------------------------------------------------------------
// Text content scanner — keyword-based moderation for user-generated text.
//
// This is a simple demonstration scanner. Real AI-based scanning is planned
// for Phase 7.
// ---------------------------------------------------------------------------

export interface ModerationFlag {
  type: string;
  severity: "low" | "medium" | "high";
  detail: string;
}

// ---------------------------------------------------------------------------
// Built-in word list (short, common English profanity/slurs).
// Each entry is checked with word-boundary awareness so that e.g. "class"
// is NOT flagged for containing "ass".
// ---------------------------------------------------------------------------

const PROFANITY_LIST: string[] = [
  "shit",
  "fuck",
  "damn",
  "bitch",
  "bastard",
  "asshole",
  "crap",
  "dick",
  "piss",
  "slut",
  "cunt",
  "nigger",
  "faggot",
];

/** Build RegExp that matches any word in the list with word boundaries. */
function buildProfanityRegex(words: string[]): RegExp {
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(?:${escaped.join("|")})\\b`, "gi");
}

const PROFANITY_RE = buildProfanityRegex(PROFANITY_LIST);

const URL_RE = /https?:\/\/[^\s]+/gi;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function scanText(text: string): ModerationFlag[] {
  const flags: ModerationFlag[] = [];

  // --- Profanity check (high severity) ------------------------------------
  const profanityMatches = text.match(PROFANITY_RE);
  if (profanityMatches) {
    const unique = [...new Set(profanityMatches.map((m) => m.toLowerCase()))];
    flags.push({
      type: "profanity",
      severity: "high",
      detail: `Blocked words detected: ${unique.join(", ")}`,
    });
  }

  // --- Excessive ALL CAPS (low severity) ----------------------------------
  // Only flag if the text is "long" (>20 chars) and >70% uppercase letters.
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 20) {
    const uppercaseCount = (text.match(/[A-Z]/g) ?? []).length;
    if (uppercaseCount / letters.length > 0.7) {
      flags.push({
        type: "excessive_caps",
        severity: "low",
        detail: `Text is ${Math.round((uppercaseCount / letters.length) * 100)}% uppercase`,
      });
    }
  }

  // --- URL spam (medium severity) -----------------------------------------
  const urls = text.match(URL_RE);
  if (urls && urls.length > 5) {
    flags.push({
      type: "url_spam",
      severity: "medium",
      detail: `Text contains ${urls.length} URLs`,
    });
  }

  return flags;
}
