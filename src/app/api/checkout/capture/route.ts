import { z } from "zod";
import {
  capturePayPalOrder,
  PayPalError,
} from "@/server/integrations/paypal";
import { rateLimitRequest } from "@/server/rate-limit";

const captureSchema = z
  .object({
    orderId: z.string().regex(/^[A-Za-z0-9-]{10,40}$/),
  })
  .strict();

export async function POST(request: Request) {
  const limited = rateLimitRequest(request, "checkout-capture");
  if (limited) return limited;

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 1_024) {
      return Response.json({ error: "Checkout request is too large." }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const parsed = captureSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid PayPal order." }, { status: 400 });
  }

  try {
    return Response.json(await capturePayPalOrder(parsed.data));
  } catch (error) {
    if (error instanceof PayPalError) {
      const status =
        error.kind === "not_configured"
          ? 503
          : error.kind === "not_approved"
            ? 409
            : error.kind === "invalid_order"
              ? 400
              : 502;
      return Response.json(
        {
          error:
            error.kind === "not_configured"
              ? "PayPal Sandbox is not configured."
              : error.kind === "not_approved"
                ? "Approve the order in PayPal before capturing it."
                : "Could not verify or capture the Sandbox order.",
        },
        { status },
      );
    }
    return Response.json(
      { error: "Could not verify or capture the Sandbox order." },
      { status: 502 },
    );
  }
}
