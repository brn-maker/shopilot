import { describe, expect, it, vi } from "vitest";
import {
  fallbackRecommendations,
  recommendProducts,
  recommendationJsonSchema,
  recommendationSchema,
  validateRecommendationOutput,
} from "./recommendations";
import type { ProductCandidate } from "./contracts";

const candidates: ProductCandidate[] = [
  {
    id: "candidate-1",
    title: "Canvas bag",
    description: "A light everyday bag",
    imageUrl: null,
    offer: {
      merchant: "shop.example",
      merchantDomain: "shop.example",
      price: { amount: 50, currency: "USD", display: "$50.00" },
      availability: "InStock",
      productUrl: "https://shop.example/item",
      affiliateUrl: "https://shop.example/item?ref=affiliate",
      maxCommissionRate: 0,
    },
  },
  {
    id: "candidate-2",
    title: "Bottle",
    description: "Steel bottle",
    imageUrl: null,
    offer: {
      merchant: "other.example",
      merchantDomain: "other.example",
      price: { amount: 20, currency: "USD", display: "$20.00" },
      availability: "InStock",
      productUrl: "https://other.example/item",
      affiliateUrl: "https://other.example/item",
      maxCommissionRate: 0,
    },
  },
];

function responseWithText(text: string) {
  return {
    id: "resp_test",
    object: "response",
    created_at: 1,
    status: "completed",
    model: "deepseek-flash",
    output: [
      {
        id: "reasoning_test",
        type: "reasoning",
        content: [{ type: "reasoning_text", text: "private reasoning" }],
      },
      {
        id: "message_test",
        type: "message",
        status: "completed",
        role: "assistant",
        content: [{ type: "output_text", text }],
      },
    ],
  };
}

describe("grounded recommendations", () => {
  it("keeps only valid candidate IDs, drops duplicates and malformed items", () => {
    const output = validateRecommendationOutput(
      {
        recommendations: [
          { productId: "candidate-2", reason: "A lighter price." },
          { productId: "invented-id", reason: "Not a candidate." },
          { productId: "candidate-2", reason: "Duplicate." },
          { productId: "candidate-1", reason: "x".repeat(181) },
          { productId: "candidate-1", reason: "Fits your everyday request." },
        ],
      },
      candidates,
    );

    expect(output).toEqual([
      { productId: "candidate-2", reason: "A lighter price." },
      { productId: "candidate-1", reason: "Fits your everyday request." },
    ]);
  });

  it("constrains the structured output schema to the active candidate IDs", () => {
    const schema = recommendationSchema(["candidate-1", "candidate-2"]);
    expect(
      schema.safeParse({
        recommendations: [
          { productId: "candidate-1", reason: "Matches the request." },
        ],
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        recommendations: [
          { productId: "invented-id", reason: "Hallucinated." },
        ],
      }).success,
    ).toBe(false);
    expect(
      recommendationJsonSchema(["candidate-1", "candidate-2"]),
    ).toMatchObject({
      properties: {
        recommendations: {
          items: {
            properties: {
              productId: {
                enum: ["candidate-1", "candidate-2"],
              },
            },
          },
        },
      },
    });
  });

  it("uses Channel3 order as a clearly deterministic fallback without an API key", async () => {
    const result = await recommendProducts("an everyday gift", candidates, {
      apiKey: "",
      model: "test-model",
    });

    expect(result).toEqual({
      source: "fallback",
      recommendations: fallbackRecommendations(candidates),
    });
  });

  it("uses the DeepSeek root Responses API and returns parsed candidate rankings", async () => {
    let requestUrl = "";
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request =
        input instanceof Request ? input : new Request(input, init);
      requestUrl = request.url;
      const body = (await request.clone().json()) as {
        model: string;
        reasoning: { effort: string };
        text: {
          format: {
            type: string;
            schema: {
              properties: {
                recommendations: {
                  items: { properties: { productId: { enum: string[] } } };
                };
              };
            };
          };
        };
      };
      expect(body.model).toBe("deepseek-flash");
      expect(body.reasoning.effort).toBe("none");
      expect(body.text.format.type).toBe("json_schema");
      expect(
        body.text.format.schema.properties.recommendations.items.properties
          .productId.enum,
      ).toEqual(["candidate-1", "candidate-2"]);
      return Response.json(
        responseWithText(
          JSON.stringify({
            recommendations: [
              { productId: "candidate-2", reason: "A useful everyday bottle." },
            ],
          }),
        ),
      );
    });

    const result = await recommendProducts("an everyday gift", candidates, {
        apiKey: "test-key",
        model: "deepseek-flash",
        fetcher,
      });
    expect(result).toEqual({
      source: "deepseek",
      recommendations: [
        { productId: "candidate-2", reason: "A useful everyday bottle." },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("private reasoning");
    expect(requestUrl).toBe("https://api.deepseek.com/responses");
    expect(requestUrl).not.toContain("/v1/");
  });

  it("supports the legacy AI environment variable names", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_MODEL", "");
    vi.stubEnv("AI_MODEL", "deepseek-flash");
    let requestUrl = "";
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request =
        input instanceof Request ? input : new Request(input, init);
      requestUrl = request.url;
      return Response.json(
        responseWithText(
          JSON.stringify({
            recommendations: [
              { productId: "candidate-1", reason: "A useful everyday bag." },
            ],
          }),
        ),
      );
    });

    try {
      await expect(
        recommendProducts("an everyday gift", candidates, { fetcher }),
      ).resolves.toMatchObject({ source: "deepseek" });
      expect(requestUrl).toBe("https://api.deepseek.com/responses");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("falls back safely for malformed JSON or invented candidate IDs", async () => {
    const malformedFetcher = vi.fn<typeof fetch>(async () =>
      Response.json(responseWithText("not valid JSON")),
    );
    await expect(
      recommendProducts("an everyday gift", candidates, {
        apiKey: "test-key",
        model: "deepseek-flash",
        fetcher: malformedFetcher,
      }),
    ).resolves.toEqual({
      source: "fallback",
      recommendations: fallbackRecommendations(candidates),
    });

    const inventedFetcher = vi.fn<typeof fetch>(async () =>
      Response.json(
        responseWithText(
          JSON.stringify({
            recommendations: [
              { productId: "invented-id", reason: "Not a live candidate." },
            ],
          }),
        ),
      ),
    );
    await expect(
      recommendProducts("an everyday gift", candidates, {
        apiKey: "test-key",
        model: "deepseek-flash",
        fetcher: inventedFetcher,
      }),
    ).resolves.toEqual({
      source: "fallback",
      recommendations: fallbackRecommendations(candidates),
    });
  });

  it("falls back safely when the provider request fails", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ error: "provider failure" }, { status: 502 }),
    );
    await expect(
      recommendProducts("an everyday gift", candidates, {
        apiKey: "test-key",
        model: "deepseek-flash",
        fetcher,
      }),
    ).resolves.toEqual({
      source: "fallback",
      recommendations: fallbackRecommendations(candidates),
    });
  });
});
