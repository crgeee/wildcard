import type { MiddlewareHandler } from "hono";

/**
 * Security headers middleware.
 *
 * Adds defence-in-depth HTTP headers to every response:
 *   - Content-Security-Policy
 *   - X-Content-Type-Options
 *   - X-Frame-Options
 *   - Referrer-Policy
 *
 * TODO: Add rate limiting middleware (token bucket or sliding window).
 *       Will need a real store (Redis / in-memory with TTL) for production.
 */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();

  // Content-Security-Policy — restrictive baseline.
  // Loosen `script-src` / `connect-src` as features land.
  c.header(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "media-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
};
