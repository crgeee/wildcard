import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveStack,
  loadStack,
  listStacks,
  deleteStack,
  autoSave,
  exportStack,
  importStack,
  checkStorageQuota,
  STORAGE_FORMAT_VERSION,
} from "../storage/local";
import type { WildCardStack } from "@wildcard/types";
import { createStack } from "@wildcard/types";

// ---------- helpers ----------

function makeStack(name = "Test Stack"): WildCardStack {
  const stack = createStack(name);
  // Stable id for deterministic tests
  stack.id = "stack_test123";
  stack.createdAt = "2026-03-10T00:00:00.000Z";
  stack.modifiedAt = "2026-03-10T00:00:00.000Z";
  return stack;
}

// ---------- localStorage mock ----------

let store: Record<string, string>;

function mockLocalStorage() {
  store = {};
  const mock: Storage = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
  vi.stubGlobal("localStorage", mock);
  return mock;
}

// ---------- tests ----------

describe("localStorage stack persistence", () => {
  beforeEach(() => {
    mockLocalStorage();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ---- save / load roundtrip ----

  describe("saveStack / loadStack", () => {
    it("round-trips a stack through localStorage", () => {
      const stack = makeStack();
      saveStack(stack);

      const loaded = loadStack(stack.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe("Test Stack");
      expect(loaded!.id).toBe(stack.id);
      expect(loaded!.cards).toHaveLength(1);
      expect(loaded!.version).toBe("1.0");
    });

    it("stores with correct key prefix", () => {
      const stack = makeStack();
      saveStack(stack);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        `wildcard:stack:${stack.id}`,
        expect.any(String),
      );
    });

    it("includes storage format version in stored data", () => {
      const stack = makeStack();
      saveStack(stack);

      const raw = localStorage.getItem(`wildcard:stack:${stack.id}`);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed._storageVersion).toBe(STORAGE_FORMAT_VERSION);
      expect(parsed.stack).toBeDefined();
    });

    it("returns null for non-existent stack", () => {
      const loaded = loadStack("nonexistent");
      expect(loaded).toBeNull();
    });

    it("returns null for corrupted JSON", () => {
      localStorage.setItem("wildcard:stack:bad", "not valid json{{{");
      const loaded = loadStack("bad");
      expect(loaded).toBeNull();
    });
  });

  // ---- listStacks ----

  describe("listStacks", () => {
    it("returns empty array when no stacks saved", () => {
      expect(listStacks()).toEqual([]);
    });

    it("lists all saved stacks with summary info", () => {
      const s1 = makeStack("Alpha");
      s1.id = "stack_a";
      s1.modifiedAt = "2026-03-10T01:00:00.000Z";

      const s2 = makeStack("Beta");
      s2.id = "stack_b";
      s2.modifiedAt = "2026-03-10T02:00:00.000Z";
      s2.cards = [...s2.cards, ...s2.cards]; // 2 cards

      saveStack(s1);
      saveStack(s2);

      const list = listStacks();
      expect(list).toHaveLength(2);

      // sorted by modifiedAt descending (most recent first)
      expect(list[0].id).toBe("stack_b");
      expect(list[0].name).toBe("Beta");
      expect(list[0].cardCount).toBe(2);
      expect(list[0].modifiedAt).toBe("2026-03-10T02:00:00.000Z");

      expect(list[1].id).toBe("stack_a");
      expect(list[1].name).toBe("Alpha");
      expect(list[1].cardCount).toBe(1);
    });

    it("skips corrupted entries", () => {
      const stack = makeStack();
      saveStack(stack);
      // Add a corrupted entry
      localStorage.setItem("wildcard:stack:broken", "{{bad json}");

      const list = listStacks();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(stack.id);
    });

    it("ignores non-stack localStorage keys", () => {
      localStorage.setItem("other_key", "value");
      localStorage.setItem("wildcard:settings", "{}");

      const stack = makeStack();
      saveStack(stack);

      expect(listStacks()).toHaveLength(1);
    });
  });

  // ---- deleteStack ----

  describe("deleteStack", () => {
    it("removes a stack from localStorage", () => {
      const stack = makeStack();
      saveStack(stack);
      expect(loadStack(stack.id)).not.toBeNull();

      deleteStack(stack.id);
      expect(loadStack(stack.id)).toBeNull();
    });

    it("does not throw when deleting non-existent stack", () => {
      expect(() => deleteStack("nonexistent")).not.toThrow();
    });
  });

  // ---- autoSave ----

  describe("autoSave", () => {
    it("debounces saves by 500ms", () => {
      const stack = makeStack();

      autoSave(stack);
      autoSave(stack);
      autoSave(stack);

      // Should not have saved yet
      expect(loadStack(stack.id)).toBeNull();

      // Advance timer past debounce
      vi.advanceTimersByTime(500);

      // Now it should be saved
      expect(loadStack(stack.id)).not.toBeNull();
    });

    it("only saves once after rapid calls", () => {
      const stack = makeStack();

      autoSave(stack);
      vi.advanceTimersByTime(200);
      autoSave(stack);
      vi.advanceTimersByTime(200);
      autoSave(stack);
      vi.advanceTimersByTime(500);

      // setItem called once for the key (the debounced save)
      const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: string[]) => c[0] === `wildcard:stack:${stack.id}`,
      );
      expect(calls).toHaveLength(1);
    });

    it("saves the latest version of the stack", () => {
      const stack = makeStack("Version 1");
      autoSave(stack);

      stack.name = "Version 2";
      autoSave(stack);

      vi.advanceTimersByTime(500);

      const loaded = loadStack(stack.id);
      expect(loaded!.name).toBe("Version 2");
    });
  });

  // ---- exportStack / importStack ----

  describe("exportStack", () => {
    it("returns valid JSON string", () => {
      const stack = makeStack();
      const json = exportStack(stack);

      expect(typeof json).toBe("string");
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe("Test Stack");
      expect(parsed.version).toBe("1.0");
    });

    it("produces JSON that can be imported", () => {
      const stack = makeStack();
      const json = exportStack(stack);
      const imported = importStack(json);

      expect(imported.name).toBe(stack.name);
      expect(imported.id).toBe(stack.id);
      expect(imported.cards).toHaveLength(stack.cards.length);
    });
  });

  describe("importStack", () => {
    it("parses valid stack JSON", () => {
      const stack = makeStack();
      const json = JSON.stringify(stack);
      const imported = importStack(json);

      expect(imported.name).toBe("Test Stack");
      expect(imported.version).toBe("1.0");
    });

    it("throws on invalid JSON", () => {
      expect(() => importStack("not json")).toThrow();
    });

    it("throws on JSON missing required fields", () => {
      expect(() => importStack(JSON.stringify({ name: "test" }))).toThrow();
    });

    it("throws on invalid version", () => {
      const stack = makeStack();
      const data = { ...stack, version: "99.0" };
      expect(() => importStack(JSON.stringify(data))).toThrow();
    });

    it("throws when cards is not an array", () => {
      const stack = makeStack();
      const data = { ...stack, cards: "not-an-array" };
      expect(() => importStack(JSON.stringify(data))).toThrow();
    });
  });

  // ---- storage quota ----

  describe("checkStorageQuota", () => {
    it("returns quota info when navigator.storage is available", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          estimate: vi.fn().mockResolvedValue({ usage: 1024, quota: 5 * 1024 * 1024 }),
        },
      });

      const info = await checkStorageQuota();
      expect(info).not.toBeNull();
      expect(info!.usage).toBe(1024);
      expect(info!.quota).toBe(5 * 1024 * 1024);
      expect(info!.percentUsed).toBeCloseTo(0.02, 1);
      expect(info!.nearLimit).toBe(false);
    });

    it("marks nearLimit when usage > 80%", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          estimate: vi.fn().mockResolvedValue({ usage: 4500000, quota: 5000000 }),
        },
      });

      const info = await checkStorageQuota();
      expect(info!.nearLimit).toBe(true);
    });

    it("returns null when navigator.storage is unavailable", async () => {
      vi.stubGlobal("navigator", {});

      const info = await checkStorageQuota();
      expect(info).toBeNull();
    });
  });

  // ---- migration support ----

  describe("migration support", () => {
    it("loads stacks saved with current storage version", () => {
      const stack = makeStack();
      saveStack(stack);
      const loaded = loadStack(stack.id);
      expect(loaded).not.toBeNull();
    });

    it("storage envelope includes version for future migration", () => {
      const stack = makeStack();
      saveStack(stack);

      const raw = localStorage.getItem(`wildcard:stack:${stack.id}`)!;
      const envelope = JSON.parse(raw);

      expect(envelope._storageVersion).toBe(STORAGE_FORMAT_VERSION);
      expect(typeof envelope._storageVersion).toBe("number");
    });
  });
});
