import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/checkout/capture rate limiting", () => {
  it("limits requests per client and supplies Retry-After", async () => {
    vi.stubEnv("PAYPAL_CLIENT_ID", "");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "");
    const request = () =>
      POST(
        new Request("http://localhost/api/checkout/capture", {
          method: "POST",
          headers: { "x-real-ip": "198.51.100.31" },
          body: JSON.stringify({ orderId: "ORDER-123456789" }),
        }),
      );

    for (let count = 0; count < 6; count += 1) {
      expect((await request()).status).toBe(503);
    }
    const limited = await request();
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toMatch(/^\d+$/);
  });
});
