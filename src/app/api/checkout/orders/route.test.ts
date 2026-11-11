import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/checkout/orders rate limiting", () => {
  it("limits requests per client and supplies Retry-After", async () => {
    vi.stubEnv("PAYPAL_CLIENT_ID", "");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "");
    const request = () =>
      POST(
        new Request("http://localhost/api/checkout/orders", {
          method: "POST",
          headers: { "x-real-ip": "198.51.100.21" },
          body: JSON.stringify({
            requestId: "c8ef02e8-9899-4c62-9c34-3ed67d347777",
            items: [{ productId: "sandbox-demo-item", quantity: 1 }],
          }),
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
