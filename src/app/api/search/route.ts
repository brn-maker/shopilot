import { z } from "zod";
import { Channel3Error, searchChannel3 } from "@/server/integrations/channel3";
import { recommendProducts } from "@/server/integrations/recommendations";
import { rateLimitRequest } from "@/server/rate-limit";

const searchRequestSchema = z
  .object({
    query: z.string().trim().min(2).max(240),
  })
  .strict();

export function parseSearchRequest(input: unknown) {
  return searchRequestSchema.safeParse(input);
}

export async function POST(request: Request) {
  const limited = rateLimitRequest(request, "search");
  if (limited) return limited;

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4_096) {
      return Response.json({ error: "Search request is too large." }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid search request." }, { status: 400 });
  }

  const parsed = parseSearchRequest(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Enter a search phrase between 2 and 240 characters." },
      { status: 400 },
    );
  }

  try {
    const products = await searchChannel3(parsed.data.query);
    const recommendation = await recommendProducts(parsed.data.query, products);
    return Response.json({
      products,
      recommendations: recommendation.recommendations,
      recommendationSource: recommendation.source,
    });
  } catch (error) {
    if (error instanceof Channel3Error) {
      if (error.kind === "not_configured") {
        return Response.json(
          { error: "Live product search is not configured yet." },
          { status: 503 },
        );
      }
      if (error.kind === "timeout") {
        return Response.json(
          { error: "Product search took too long. Please try again." },
          { status: 504 },
        );
      }
    }

    return Response.json(
      { error: "Product search is temporarily unavailable." },
      { status: 502 },
    );
  }
}
