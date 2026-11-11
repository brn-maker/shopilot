import { describe, expect, it, vi } from "vitest";
import {
  Channel3Error,
  normalizeChannel3Product,
  normalizeChannel3Products,
  searchChannel3,
} from "./channel3";

const sampleProduct = {
  id: "c3-item-1",
  title: "Canvas day bag",
  description: "A lightweight everyday bag.",
  images: [
    {
      url: "https://images.example.test/bag.jpg",
      cleaned_url: "https://cdn.example.test/bag.jpg",
      is_main_image: true,
    },
  ],
  offers: [
    {
      url: "https://shop.example.test/bag?ref=affiliate",
      domain: "shop.example.test",
      price: { price: 88.5, compare_at_price: null, currency: "USD" },
      availability: "InStock",
      max_commission_rate: 0.1,
    },
    {
      url: "https://other.example.test/bag",
      domain: "other.example.test",
      price: { price: 70, compare_at_price: null, currency: "USD" },
      availability: "OutOfStock",
    },
  ],
};

describe("Channel3 product normalization", () => {
  it("maps product, main image, offer, display price, availability, and affiliate URL", () => {
    expect(normalizeChannel3Product(sampleProduct)).toEqual({
      id: "c3-item-1",
      title: "Canvas day bag",
      description: "A lightweight everyday bag.",
      imageUrl: "https://cdn.example.test/bag.jpg",
      offer: {
        merchant: "shop.example.test",
        merchantDomain: "shop.example.test",
        price: {
          amount: 88.5,
          currency: "USD",
          display: "$88.50",
        },
        availability: "InStock",
        productUrl: "https://shop.example.test/bag?ref=affiliate",
        affiliateUrl: "https://shop.example.test/bag?ref=affiliate",
        maxCommissionRate: 0.1,
      },
    });

  });

  it("accepts the documented offer price amount field", () => {
    const result = normalizeChannel3Product({
      ...sampleProduct,
      offers: [
        {
          ...sampleProduct.offers[0],
          price: { amount: 88.5, compare_at_price: null, currency: "USD" },
        },
      ],
    });

    expect(result?.offer.price.amount).toBe(88.5);
  });

  it("drops products without a safe HTTPS offer link", () => {
    expect(
      normalizeChannel3Product({
        ...sampleProduct,
        offers: [
          {
            ...sampleProduct.offers[0],
            url: "javascript:alert(1)",
          },
        ],
      }),
    ).toBeNull();
  });

  it("discards malformed products and caps result count", () => {
    const products = Array.from({ length: 10 }, (_, index) => ({
      ...sampleProduct,
      id: `c3-${index}`,
    }));
    expect(normalizeChannel3Products({ products: [...products, null] })).toHaveLength(8);
    expect(() => normalizeChannel3Products({ products: "not-an-array" })).toThrow(
      Channel3Error,
    );
  });

  it("uses the documented endpoint and server-side x-api-key header", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toBe("https://api.trychannel3.com/v1/search");
      expect(new Headers(init?.headers).get("x-api-key")).toBe(
        "test-key-not-a-real-credential",
      );
      return Response.json({ products: [sampleProduct] });
    });

    await searchChannel3("a canvas bag", {
      apiKey: "test-key-not-a-real-credential",
      fetcher,
    });

    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api.trychannel3.com/v1/search");
    expect(new Headers(options?.headers).get("x-api-key")).toBe(
      "test-key-not-a-real-credential",
    );
    expect(JSON.parse(String(options?.body))).toMatchObject({
      query: "a canvas bag",
      limit: 8,
      config: { country: "US", currency: "USD" },
    });
  });

  it("returns a safe timeout error", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new DOMException("timed out", "TimeoutError");
    });

    await expect(
      searchChannel3("a canvas bag", { apiKey: "test-key", fetcher }),
    ).rejects.toMatchObject({ kind: "timeout" });
  });
});
