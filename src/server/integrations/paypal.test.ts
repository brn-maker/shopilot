import { describe, expect, it, vi } from "vitest";
import {
  buildPayPalOrderPayload,
  capturePayPalOrder,
  createPayPalOrder,
  getPublicPayPalClientId,
  parseDemoCart,
  type PayPalConfig,
} from "./paypal";

const config: PayPalConfig = {
  clientId: "sandbox-test-client-id",
  clientSecret: "sandbox-test-secret",
};

const orderDetails = {
  id: "ORDER-123456789",
  status: "APPROVED",
  intent: "CAPTURE",
  purchase_units: [
    {
      custom_id: "shopilot-sandbox-demo",
      amount: { currency_code: "USD", value: "1.00" },
      items: [
        {
          sku: "sandbox-demo-item",
          name: "Shopilot Sandbox demo item",
          quantity: "1",
          unit_amount: { currency_code: "USD", value: "1.00" },
        },
      ],
    },
  ],
};

describe("server-priced PayPal Sandbox checkout", () => {
  it("exposes only the public client ID when private Sandbox credentials are set", () => {
    expect(
      getPublicPayPalClientId({
        PAYPAL_CLIENT_ID: "sandbox-public-client-id",
        PAYPAL_CLIENT_SECRET: "private-secret",
      }),
    ).toBe("sandbox-public-client-id");
    expect(
      getPublicPayPalClientId({
        PAYPAL_CLIENT_ID: "sandbox-public-client-id",
      }),
    ).toBeNull();
  });

  it("rejects malformed, duplicate, unknown, and client-priced carts", () => {
    expect(
      parseDemoCart({
        items: [{ productId: "sandbox-demo-item", quantity: 1 }],
      }).success,
    ).toBe(true);
    expect(
      parseDemoCart({
        items: [
          { productId: "sandbox-demo-item", quantity: 1, price: 0.01 },
        ],
      }).success,
    ).toBe(false);
    expect(
      parseDemoCart({
        items: [
          { productId: "sandbox-demo-item", quantity: 1 },
          { productId: "sandbox-demo-item", quantity: 1 },
        ],
      }).success,
    ).toBe(false);
    expect(
      parseDemoCart({
        items: [{ productId: "__proto__", quantity: 1 }],
      }).success,
    ).toBe(false);
  });

  it("builds PayPal line items and totals from the server catalog", () => {
    const payload = buildPayPalOrderPayload([
      { productId: "sandbox-demo-item", quantity: 2 },
    ]);
    expect(payload.purchase_units[0]?.amount).toEqual({
      currency_code: "USD",
      value: "2.00",
      breakdown: {
        item_total: { currency_code: "USD", value: "2.00" },
      },
    });
    expect(payload.purchase_units[0]?.items[0]?.unit_amount.value).toBe("1.00");
  });

  it("creates an order with PayPal-Request-Id and server catalog pricing", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      if (String(input).endsWith("/v1/oauth2/token")) {
        return Response.json({ access_token: "mock-access-token" });
      }
      expect(String(input)).toBe(
        "https://api-m.sandbox.paypal.com/v2/checkout/orders",
      );
      expect(new Headers(init?.headers).get("PayPal-Request-Id")).toBe(
        "c8ef02e8-9899-4c62-9c34-3ed67d347777",
      );
      const body = JSON.parse(String(init?.body)) as {
        purchase_units: Array<{ amount: { value: string } }>;
      };
      expect(body.purchase_units[0]?.amount.value).toBe("1.00");
      return Response.json({ id: "ORDER-123456789", status: "CREATED" });
    });

    await expect(
      createPayPalOrder(
        {
          items: [{ productId: "sandbox-demo-item", quantity: 1 }],
          requestId: "c8ef02e8-9899-4c62-9c34-3ed67d347777",
        },
        { config, fetcher },
      ),
    ).resolves.toEqual({ orderId: "ORDER-123456789", status: "CREATED" });
  });

  it("identifies OAuth and order API failures without exposing provider bodies", async () => {
    const oauthFailure = vi.fn<typeof fetch>(async () =>
      Response.json({ error: "provider detail" }, { status: 401 }),
    );
    await expect(
      createPayPalOrder(
        {
          items: [{ productId: "sandbox-demo-item", quantity: 1 }],
          requestId: "c8ef02e8-9899-4c62-9c34-3ed67d347777",
        },
        { config, fetcher: oauthFailure },
      ),
    ).rejects.toMatchObject({
      kind: "unavailable",
      diagnostic: { stage: "oauth-http", upstreamStatus: 401 },
    });

    const fetcher = vi.fn<typeof fetch>(async (input) =>
      String(input).endsWith("/v1/oauth2/token")
        ? Response.json({ access_token: "mock-access-token" })
        : Response.json({ error: "provider detail" }, { status: 500 }),
    );

    await expect(
      createPayPalOrder(
        {
          items: [{ productId: "sandbox-demo-item", quantity: 1 }],
          requestId: "c8ef02e8-9899-4c62-9c34-3ed67d347777",
        },
        { config, fetcher },
      ),
    ).rejects.toMatchObject({
      kind: "unavailable",
      diagnostic: { stage: "paypal-api-http", upstreamStatus: 500 },
    });
  });

  it("verifies and captures an approved order, then checks capture amount/status", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/v1/oauth2/token")) {
        return Response.json({ access_token: "mock-access-token" });
      }
      if (url.endsWith("/v2/checkout/orders/ORDER-123456789")) {
        return Response.json(orderDetails);
      }
      if (url.endsWith("/v2/checkout/orders/ORDER-123456789/capture")) {
        return Response.json({
          ...orderDetails,
          status: "COMPLETED",
          purchase_units: [
            {
              ...orderDetails.purchase_units[0],
              payments: {
                captures: [
                  {
                    status: "COMPLETED",
                    amount: { currency_code: "USD", value: "1.00" },
                  },
                ],
              },
            },
          ],
        });
      }
      throw new Error("Unexpected mocked PayPal URL");
    });

    await expect(
      capturePayPalOrder({ orderId: "ORDER-123456789" }, { config, fetcher }),
    ).resolves.toEqual({
      orderId: "ORDER-123456789",
      status: "COMPLETED",
      amount: { value: "1.00", currency: "USD" },
    });
    const captureCall = fetcher.mock.calls.find(([url]) =>
      String(url).endsWith("/capture"),
    );
    expect(
      new Headers(captureCall?.[1]?.headers).get("PayPal-Request-Id"),
    ).toMatch(/^[a-f0-9]{32}$/);
  });

  it("rejects tampered PayPal order amounts and reports capture failures safely", async () => {
    const tamperedOrder = {
      ...orderDetails,
      purchase_units: [
        {
          ...orderDetails.purchase_units[0],
          amount: { currency_code: "USD", value: "0.01" },
        },
      ],
    };
    const tamperedFetcher = vi.fn<typeof fetch>(async (input) =>
      String(input).endsWith("/v1/oauth2/token")
        ? Response.json({ access_token: "mock-access-token" })
        : Response.json(tamperedOrder),
    );
    await expect(
      capturePayPalOrder(
        { orderId: "ORDER-123456789" },
        { config, fetcher: tamperedFetcher },
      ),
    ).rejects.toMatchObject({ kind: "invalid_order" });

    const failingCaptureFetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/v1/oauth2/token")) {
        return Response.json({ access_token: "mock-access-token" });
      }
      if (url.endsWith("/v2/checkout/orders/ORDER-123456789")) {
        return Response.json(orderDetails);
      }
      return Response.json({ error: "provider detail" }, { status: 500 });
    });
    await expect(
      capturePayPalOrder(
        { orderId: "ORDER-123456789" },
        { config, fetcher: failingCaptureFetcher },
      ),
    ).rejects.toMatchObject({ kind: "unavailable" });
  });
});
