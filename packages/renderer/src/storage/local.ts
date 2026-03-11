import type { WildCardStack } from "@wildcard/types";

// ---------- constants ----------

/** Current storage envelope version. Bump when changing the storage format. */
export const STORAGE_FORMAT_VERSION = 1;

const KEY_PREFIX = "wildcard:stack:";
const AUTOSAVE_DEBOUNCE_MS = 500;
const QUOTA_WARN_PERCENT = 80;

// ---------- types ----------

export interface StackSummary {
  id: string;
  name: string;
  modifiedAt: string;
  cardCount: number;
}

export interface StorageQuotaInfo {
  usage: number;
  quota: number;
  percentUsed: number;
  nearLimit: boolean;
}

/** Envelope wrapper for migration support. */
interface StorageEnvelope {
  _storageVersion: number;
  stack: WildCardStack;
}

// ---------- core CRUD ----------

/**
 * Serialize a stack to JSON and persist to localStorage.
 * Key format: `wildcard:stack:{id}`
 */
export function saveStack(stack: WildCardStack): void {
  const envelope: StorageEnvelope = {
    _storageVersion: STORAGE_FORMAT_VERSION,
    stack,
  };
  localStorage.setItem(`${KEY_PREFIX}${stack.id}`, JSON.stringify(envelope));
}

/**
 * Load a stack from localStorage by id.
 * Returns null if not found or data is corrupt.
 */
export function loadStack(id: string): WildCardStack | null {
  const raw = localStorage.getItem(`${KEY_PREFIX}${id}`);
  if (raw === null) return null;

  try {
    const envelope: StorageEnvelope = JSON.parse(raw);

    // Future: run migrations here based on envelope._storageVersion
    return envelope.stack ?? null;
  } catch {
    // Corrupted data — return null rather than crashing
    return null;
  }
}

/**
 * List all saved stacks as summaries, sorted by modifiedAt descending.
 */
export function listStacks(): StackSummary[] {
  const summaries: StackSummary[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(KEY_PREFIX)) continue;

    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const envelope: StorageEnvelope = JSON.parse(raw);
      const stack = envelope.stack;
      if (!stack || !stack.id) continue;

      summaries.push({
        id: stack.id,
        name: stack.name,
        modifiedAt: stack.modifiedAt,
        cardCount: Array.isArray(stack.cards) ? stack.cards.length : 0,
      });
    } catch {
      // Skip corrupted entries
    }
  }

  // Most recently modified first
  summaries.sort((a, b) => (b.modifiedAt > a.modifiedAt ? 1 : -1));

  return summaries;
}

/**
 * Remove a stack from localStorage.
 */
export function deleteStack(id: string): void {
  localStorage.removeItem(`${KEY_PREFIX}${id}`);
}

// ---------- auto-save ----------

export interface AutoSaver {
  /** Schedule a debounced save. Resets the timer on each call. */
  save(stack: WildCardStack): void;
  /** Cancel any pending debounced save. */
  cancel(): void;
  /** Whether a save is currently pending. */
  pending(): boolean;
}

/**
 * Create a standalone auto-saver instance with its own timer state.
 * Useful when multiple independent save contexts are needed.
 */
export function createAutoSaver(debounceMs = AUTOSAVE_DEBOUNCE_MS): AutoSaver {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    save(stack: WildCardStack): void {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        saveStack(stack);
        timer = null;
      }, debounceMs);
    },
    cancel(): void {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
    pending(): boolean {
      return timer !== null;
    },
  };
}

/** Default auto-saver instance used by the convenience `autoSave` function. */
const defaultAutoSaver = createAutoSaver();

/**
 * Debounced save — waits 500ms of inactivity before persisting.
 * Each call resets the timer, so rapid edits only trigger one write.
 * Convenience wrapper around the default `createAutoSaver()` instance.
 */
export function autoSave(stack: WildCardStack): void {
  defaultAutoSaver.save(stack);
}

// ---------- export / import ----------

/**
 * Export a stack as a standalone JSON string (for file download).
 * This is the raw stack — no storage envelope.
 */
export function exportStack(stack: WildCardStack): string {
  return JSON.stringify(stack, null, 2);
}

/**
 * Import a stack from a JSON string. Validates required fields.
 * @throws Error if JSON is invalid or missing required fields.
 */
export function importStack(json: string): WildCardStack {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON: could not parse stack data");
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid stack data: expected an object");
  }

  const obj = data as Record<string, unknown>;

  // Validate required fields
  if (!obj.version || typeof obj.version !== "string") {
    throw new Error("Invalid stack: missing or invalid 'version' field");
  }
  if (obj.version !== "1.0") {
    throw new Error(`Unsupported stack version: ${obj.version}`);
  }
  if (!obj.id || typeof obj.id !== "string") {
    throw new Error("Invalid stack: missing 'id' field");
  }
  if (!obj.name || typeof obj.name !== "string") {
    throw new Error("Invalid stack: missing 'name' field");
  }
  if (!Array.isArray(obj.cards)) {
    throw new Error("Invalid stack: 'cards' must be an array");
  }

  // Validate each card has at minimum an object with a string id
  for (let i = 0; i < (obj.cards as unknown[]).length; i++) {
    const card = (obj.cards as unknown[])[i];
    if (card == null || typeof card !== "object") {
      throw new Error(`Invalid stack: card at index ${i} must be an object`);
    }
    const cardObj = card as Record<string, unknown>;
    if (!cardObj.id || typeof cardObj.id !== "string") {
      throw new Error(`Invalid stack: card at index ${i} missing string 'id'`);
    }
  }

  return data as WildCardStack;
}

// ---------- storage quota ----------

/**
 * Check storage quota using the StorageManager API.
 * Returns null if the API is not available.
 */
export async function checkStorageQuota(): Promise<StorageQuotaInfo | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      usage,
      quota,
      percentUsed,
      nearLimit: percentUsed >= QUOTA_WARN_PERCENT,
    };
  } catch {
    return null;
  }
}
