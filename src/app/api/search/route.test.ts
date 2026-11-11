import { afterEach, describe, expect, it, vi } from "vitest";
import { POST, parseSearchRequest } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/search validation", () => {
  it("accepts bounded text and rejects unknown fields or overlong queries", () => {
    expect(parseSearchRequest({ query: "a thoughtful gift" }).success).toBe(true);
    expect(
      parseSearchRequest({ query: "a thoughtful gift", count: 100 }).success,
    ).toBe(false);
    expect(parseSearchRequest({ query: "x".repeat(241) }).success).toBe(false);
  });

  it("returns safe errors for malformed, oversized, and unconfigured requests", async () => {
    const malformed = await POST(
      new Request("http://localhost/api/search", {
        method: "POST",
        body: "{",
      }),
    );
    expect(malformed.status).toBe(400);

    const oversized = await POST(
      new Request("http://localhost/api/search", {
        method: "POST",
        body: JSON.stringify({ query: "x".repeat(5000) }),
      }),
    );
    expect(oversized.status).toBe(413);

    vi.stubEnv("CHANNEL3_API_KEY", "");
    const unconfigured = await POST(
      new Request("http://localhost/api/search", {
        method: "POST",
        body: JSON.stringify({ query: "a thoughtful gift" }),
      }),
    );
    expect(unconfigured.status).toBe(503);
    expect(await unconfigured.json()).toEqual({
      error: "Live product search is not configured yet.",
    });
  });

  it("returns 429 with Retry-After after the per-client search limit", async () => {
    vi.stubEnv("CHANNEL3_API_KEY", "");
    const request = () =>
      POST(
        new Request("http://localhost/api/search", {
          method: "POST",
          headers: { "x-real-ip": "198.51.100.11" },
          body: JSON.stringify({ query: "a thoughtful gift" }),
        }),
      );

    for (let count = 0; count < 12; count += 1) {
      expect((await request()).status).toBe(503);
    }
    const limited = await request();
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toMatch(/^\d+$/);
  });
});
