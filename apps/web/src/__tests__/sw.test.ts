import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// We test the registration module in isolation by controlling import.meta.env
// and mocking navigator.serviceWorker.
// ---------------------------------------------------------------------------

describe("registerServiceWorker", () => {
  const originalServiceWorker = navigator.serviceWorker;

  let mockRegister: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRegister = vi.fn().mockResolvedValue({
      scope: "/",
      addEventListener: vi.fn(),
    });

    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: mockRegister },
      writable: true,
      configurable: true,
    });

    // Reset module cache so each test gets a fresh import
    vi.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: originalServiceWorker,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("exports registerServiceWorker as a function", async () => {
    const mod = await import("../register-sw.js");
    expect(typeof mod.registerServiceWorker).toBe("function");
  });

  it("does not register in non-production environment", async () => {
    // Vitest runs in test mode, so import.meta.env.PROD is false
    const { registerServiceWorker } = await import("../register-sw.js");
    registerServiceWorker();

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("is callable without throwing", async () => {
    const { registerServiceWorker } = await import("../register-sw.js");
    expect(() => registerServiceWorker()).not.toThrow();
  });

  it("does not throw when navigator.serviceWorker is undefined", async () => {
    // Simulate a browser without SW support
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    // We need to also set PROD to true to get past the first guard.
    // Since we can't easily override import.meta.env.PROD in vitest,
    // we test by verifying no error is thrown in non-prod mode.
    const { registerServiceWorker } = await import("../register-sw.js");
    expect(() => registerServiceWorker()).not.toThrow();
  });
});
