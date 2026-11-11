import { z } from "zod";
import {
  createPayPalOrder,
  PayPalError,
  parseDemoCart,
} from "@/server/integrations/paypal";
import { rateLimitRequest } from "@/server/rate-limit";

const createOrderSchema = z
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
    requestId: z.string().uuid().max(38),
  })
  .strict();

export async function POST(request: Request) {
  const limited = rateLimitRequest(request, "checkout-orders");
  if (limited) return limited;

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4_096) {
      return Response.json({ error: "Checkout request is too large." }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid demo cart." }, { status: 400 });
  }
  if (!parseDemoCart({ items: parsed.data.items }).success) {
    return Response.json({ error: "Invalid demo cart." }, { status: 400 });
  }

  try {
    const result = await createPayPalOrder(parsed.data);
    return Response.json(result);
  } catch (error) {
    if (error instanceof PayPalError) {
      const status =
        error.kind === "not_configured"
          ? 503
          : error.kind === "invalid_order"
            ? 400
            : 502;
      return Response.json(
        {
          error:
            error.kind === "not_configured"
              ? "PayPal Sandbox is not configured."
              : "Could not start the Sandbox checkout.",
        },
        { status },
      );
    }
    return Response.json(
      { error: "Could not start the Sandbox checkout." },
      { status: 502 },
    );
  }
}
