import { describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("in-memory per-client rate limiter", () => {
  it("limits a client and provides a remaining retry interval", () => {
    const now = vi.fn(() => 1_000);
    const limiter = createRateLimiter(now);
    const policy = { limit: 2, windowMs: 60_000 };

    expect(limiter.consume("192.0.2.1", "search", policy).allowed).toBe(true);
    expect(limiter.consume("192.0.2.1", "search", policy).allowed).toBe(true);
    expect(limiter.consume("192.0.2.1", "search", policy)).toEqual({
      allowed: false,
      retryAfter: 60,
    });
    expect(limiter.consume("192.0.2.2", "search", policy).allowed).toBe(true);
  });

  it("allows requests again after the fixed window expires", () => {
    let currentTime = 1_000;
    const limiter = createRateLimiter(() => currentTime);
    const policy = { limit: 1, windowMs: 1_500 };

    expect(limiter.consume("192.0.2.3", "search", policy).allowed).toBe(true);
    expect(limiter.consume("192.0.2.3", "search", policy).allowed).toBe(false);
    currentTime += 1_500;
    expect(limiter.consume("192.0.2.3", "search", policy).allowed).toBe(true);
  });
});
