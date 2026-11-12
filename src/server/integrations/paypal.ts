import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { demoCatalog, type DemoCatalogId } from "@/server/catalog/demo";
import type {
  DemoCartItem,
  PayPalOrderCaptured,
  PayPalOrderCreated,
} from "@/server/integrations/contracts";

const SANDBOX_URL = "https://api-m.sandbox.paypal.com";
const requestIdSchema = z.string().uuid().max(38);
const orderIdSchema = z.string().regex(/^[A-Za-z0-9-]{10,40}$/);

const cartSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productId: z.string().min(1).max(64),
            quantity: z.number().int().min(1).max(5),
          })
          .strict(),
      )
      .min(1)
      .max(5),
  })
  .strict()
  .superRefine(({ items }, context) => {
    const seen = new Set<string>();
    for (const [index, item] of items.entries()) {
      if (!Object.hasOwn(demoCatalog, item.productId)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "productId"],
          message: "Unknown demo item",
        });
      }
      if (seen.has(item.productId)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "productId"],
          message: "Duplicate demo item",
        });
      }
      seen.add(item.productId);
    }
  });

const orderCreatedSchema = z.object({
  id: orderIdSchema,
  status: z.literal("CREATED"),
});

const paypalOrderSchema = z
  .object({
    id: orderIdSchema,
    status: z.string(),
    intent: z.literal("CAPTURE"),
    purchase_units: z.array(
      z
        .object({
          custom_id: z.string().optional(),
          amount: z.object({
            currency_code: z.string(),
            value: z.string(),
          }),
          items: z
            .array(
              z
                .object({
                  sku: z.string(),
                  name: z.string(),
                  quantity: z.string(),
                  unit_amount: z.object({
                    currency_code: z.string(),
                    value: z.string(),
                  }),
                })
                .passthrough(),
            )
            .optional(),
          payments: z
            .object({
              captures: z
                .array(
                  z.object({
                    status: z.string(),
                    amount: z.object({
                      currency_code: z.string(),
                      value: z.string(),
                    }),
                  }),
                )
                .optional(),
            })
            .optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const captureResponseSchema = paypalOrderSchema;

export class PayPalError extends Error {
  constructor(
    readonly kind:
      | "not_configured"
      | "unavailable"
      | "invalid_order"
      | "not_approved"
      | "capture_failed",
    readonly diagnostic?: {
      stage:
        | "oauth-network"
        | "oauth-http"
        | "oauth-response"
        | "paypal-api-network"
        | "paypal-api-http"
        | "paypal-api-response"
        | "order-response-shape";
      upstreamStatus?: number;
    },
  ) {
    super(kind);
    this.name = "PayPalError";
  }
}

export type PayPalConfig = {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
};

type PayPalEnvironment = Record<string, string | undefined>;

function getPayPalConfig(
  env: PayPalEnvironment = process.env,
): PayPalConfig {
  const clientId = env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new PayPalError("not_configured");

  const baseUrl = env.PAYPAL_BASE_URL?.trim() || SANDBOX_URL;
  if (baseUrl !== SANDBOX_URL) throw new PayPalError("not_configured");
  return { clientId, clientSecret, baseUrl };
}

export function parseDemoCart(input: unknown) {
  return cartSchema.safeParse(input);
}

export function parsePayPalOrderId(input: unknown) {
  return orderIdSchema.safeParse(input);
}

export function parsePayPalRequestId(input: unknown) {
  return requestIdSchema.safeParse(input);
}

function amountString(cents: number): string {
  return `${Math.floor(cents / 100)}.${(cents % 100).toString().padStart(2, "0")}`;
}

export function buildPayPalOrderPayload(items: DemoCartItem[]) {
  const purchaseItems = items.map(({ productId, quantity }) => {
    const catalogItem = demoCatalog[productId as DemoCatalogId];
    return {
      name: catalogItem.name,
      description: catalogItem.description,
      sku: productId,
      quantity: String(quantity),
      category: "DIGITAL_GOODS",
      unit_amount: {
        currency_code: catalogItem.currency,
        value: amountString(catalogItem.amountCents),
      },
    };
  });
  const totalCents = items.reduce(
    (total, { productId, quantity }) =>
      total + demoCatalog[productId as DemoCatalogId].amountCents * quantity,
    0,
  );

  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: "shopilot-sandbox-demo",
        custom_id: "shopilot-sandbox-demo",
        description: "Sandbox demo checkout — no real fulfillment",
        amount: {
          currency_code: "USD",
          value: amountString(totalCents),
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: amountString(totalCents),
            },
          },
        },
        items: purchaseItems,
      },
    ],
  };
}

async function getAccessToken(
  config: PayPalConfig,
  fetcher: typeof fetch,
): Promise<string> {
  let response: Response;
  try {
    response = await fetcher(`${config.baseUrl ?? SANDBOX_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(
          `${config.clientId}:${config.clientSecret}`,
        ).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new PayPalError("unavailable", { stage: "oauth-network" });
  }

  if (!response.ok) {
    throw new PayPalError("unavailable", {
      stage: "oauth-http",
      upstreamStatus: response.status,
    });
  }
  const tokenResult: unknown = await response.json().catch(() => null);
  const token = z
    .object({ access_token: z.string().min(1) })
    .safeParse(tokenResult);
  if (!token.success) {
    throw new PayPalError("unavailable", {
      stage: "oauth-response",
      upstreamStatus: response.status,
    });
  }
  return token.data.access_token;
}

async function paypalRequest(
  path: string,
  token: string,
  fetcher: typeof fetch,
  init: RequestInit = {},
  baseUrl = SANDBOX_URL,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new PayPalError("unavailable", { stage: "paypal-api-network" });
  }

  if (!response.ok) {
    throw new PayPalError("unavailable", {
      stage: "paypal-api-http",
      upstreamStatus: response.status,
    });
  }
  return response.json().catch(() => {
    throw new PayPalError("unavailable", {
      stage: "paypal-api-response",
      upstreamStatus: response.status,
    });
  });
}

export async function createPayPalOrder(
  input: { items: DemoCartItem[]; requestId: string },
  options: {
    config?: PayPalConfig;
    fetcher?: typeof fetch;
  } = {},
): Promise<PayPalOrderCreated> {
  const cart = parseDemoCart({ items: input.items });
  const requestId = parsePayPalRequestId(input.requestId);
  if (!cart.success || !requestId.success) {
    throw new PayPalError("invalid_order");
  }

  const config = options.config ?? getPayPalConfig();
  const fetcher = options.fetcher ?? fetch;
  const token = await getAccessToken(config, fetcher);
  const body = await paypalRequest("/v2/checkout/orders", token, fetcher, {
    method: "POST",
    headers: {
      "PayPal-Request-Id": requestId.data,
      Prefer: "return=representation",
    },
    body: JSON.stringify(buildPayPalOrderPayload(cart.data.items)),
  }, config.baseUrl);
  const parsed = orderCreatedSchema.safeParse(body);
  if (!parsed.success) {
    throw new PayPalError("unavailable", { stage: "order-response-shape" });
  }
  return { orderId: parsed.data.id, status: "CREATED" };
}

function verifyOrderDetails(input: unknown) {
  const parsed = paypalOrderSchema.safeParse(input);
  if (!parsed.success || parsed.data.purchase_units.length !== 1) {
    throw new PayPalError("invalid_order");
  }

  const [unit] = parsed.data.purchase_units;
  if (
    unit.custom_id !== "shopilot-sandbox-demo" ||
    !unit.items?.length ||
    unit.items.length > 5
  ) {
    throw new PayPalError("invalid_order");
  }

  let totalCents = 0;
  for (const item of unit.items) {
    if (!Object.hasOwn(demoCatalog, item.sku)) {
      throw new PayPalError("invalid_order");
    }
    const catalogItem = demoCatalog[item.sku as DemoCatalogId];
    const quantity = Number(item.quantity);
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 5 ||
      item.name !== catalogItem.name ||
      item.unit_amount.currency_code !== catalogItem.currency ||
      item.unit_amount.value !== amountString(catalogItem.amountCents)
    ) {
      throw new PayPalError("invalid_order");
    }
    totalCents += catalogItem.amountCents * quantity;
  }

  const expectedValue = amountString(totalCents);
  if (
    unit.amount.currency_code !== "USD" ||
    unit.amount.value !== expectedValue
  ) {
    throw new PayPalError("invalid_order");
  }

  return {
    id: parsed.data.id,
    status: parsed.data.status,
    expectedValue,
    captures: unit.payments?.captures ?? [],
  };
}

function validateCompletedCapture(
  orderId: string,
  status: string,
  expectedValue: string,
  captures: Array<{
    status: string;
    amount: { currency_code: string; value: string };
  }>,
): PayPalOrderCaptured {
  const capture = captures.find((item) => item.status === "COMPLETED");
  if (
    status !== "COMPLETED" ||
    !capture ||
    capture.amount.currency_code !== "USD" ||
    capture.amount.value !== expectedValue
  ) {
    throw new PayPalError("capture_failed");
  }

  return {
    orderId,
    status: "COMPLETED",
    amount: { value: expectedValue, currency: "USD" },
  };
}

export async function capturePayPalOrder(
  input: { orderId: string },
  options: {
    config?: PayPalConfig;
    fetcher?: typeof fetch;
  } = {},
): Promise<PayPalOrderCaptured> {
  const parsedId = parsePayPalOrderId(input.orderId);
  if (!parsedId.success) throw new PayPalError("invalid_order");

  const config = options.config ?? getPayPalConfig();
  const fetcher = options.fetcher ?? fetch;
  const token = await getAccessToken(config, fetcher);
  const path = `/v2/checkout/orders/${encodeURIComponent(parsedId.data)}`;
  const orderDetails = verifyOrderDetails(
    await paypalRequest(path, token, fetcher, {}, config.baseUrl),
  );

  if (orderDetails.status === "COMPLETED") {
    return validateCompletedCapture(
      orderDetails.id,
      orderDetails.status,
      orderDetails.expectedValue,
      orderDetails.captures,
    );
  }
  if (orderDetails.status !== "APPROVED") {
    throw new PayPalError("not_approved");
  }

  const captureId = createHash("sha256")
    .update(`shopilot-capture:${orderDetails.id}`)
    .digest("hex")
    .slice(0, 32);
  const captureResponse = await paypalRequest(
    `${path}/capture`,
    token,
    fetcher,
    {
      method: "POST",
      headers: {
        "PayPal-Request-Id": captureId,
        Prefer: "return=representation",
      },
      body: "{}",
    },
    config.baseUrl,
  );
  const capture = captureResponseSchema.safeParse(captureResponse);
  if (
    !capture.success ||
    capture.data.id !== parsedId.data ||
    capture.data.purchase_units.length !== 1
  ) {
    throw new PayPalError("capture_failed");
  }

  const firstUnit = capture.data.purchase_units[0];
  if (
    !firstUnit ||
    firstUnit.custom_id !== "shopilot-sandbox-demo" ||
    firstUnit.amount.currency_code !== "USD" ||
    firstUnit.amount.value !== orderDetails.expectedValue
  ) {
    throw new PayPalError("capture_failed");
  }
  return validateCompletedCapture(
    capture.data.id,
    capture.data.status,
    orderDetails.expectedValue,
    firstUnit.payments?.captures ?? [],
  );
}

export function getPublicPayPalClientId(
  env: PayPalEnvironment = process.env,
): string | null {
  try {
    return getPayPalConfig(env).clientId;
  } catch (error) {
    if (error instanceof PayPalError && error.kind === "not_configured") {
      return null;
    }
    throw error;
  }
}
