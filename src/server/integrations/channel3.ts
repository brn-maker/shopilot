import "server-only";

import { z } from "zod";
import type { ProductCandidate } from "@/server/integrations/contracts";

const CHANNEL3_SEARCH_URL = "https://api.trychannel3.com/v1/search";
const SEARCH_TIMEOUT_MS = 8_000;
const PRODUCT_LIMIT = 8;

const productSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().nullable().optional(),
    images: z
      .array(
        z
          .object({
            url: z.string().url(),
            cleaned_url: z.string().url().nullable().optional(),
            is_main_image: z.boolean().optional(),
            alt_text: z.string().nullable().optional(),
          })
          .passthrough(),
      )
      .optional(),
    offers: z
      .array(
        z
          .object({
            url: z.string().url(),
            domain: z.string().min(1),
            price: z
              .object({
                amount: z.number().finite().nonnegative().optional(),
                price: z.number().finite().nonnegative().optional(),
                currency: z.string().regex(/^[A-Z]{3}$/),
              })
              .refine((price) => price.amount !== undefined || price.price !== undefined)
              .passthrough(),
            availability: z.enum(["InStock", "OutOfStock"]),
            max_commission_rate: z.number().finite().min(0).optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

const searchResponseSchema = z.object({
  products: z.array(z.unknown()),
});

export class Channel3Error extends Error {
  constructor(
    readonly kind: "not_configured" | "timeout" | "upstream",
  ) {
    super(kind);
    this.name = "Channel3Error";
  }
}

function httpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function normalizeChannel3Product(
  input: unknown,
): ProductCandidate | null {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return null;

  const offers = (parsed.data.offers ?? [])
    .map((offer) => {
      const url = httpsUrl(offer.url);
      if (!url) return null;
      try {
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: offer.price.currency,
        });
      } catch {
        return null;
      }

      const amount = offer.price.amount ?? offer.price.price;
      if (amount === undefined) return null;

      return {
        source: offer,
        url,
        amount,
      };
    })
    .filter((offer): offer is NonNullable<typeof offer> => offer !== null)
    .sort(
      (left, right) =>
        Number(right.source.price.currency === "USD") -
          Number(left.source.price.currency === "USD") ||
        Number(right.source.availability === "InStock") -
          Number(left.source.availability === "InStock") ||
        left.amount - right.amount,
    );
  const selectedOffer = offers[0];
  if (!selectedOffer) return null;

  const mainImage =
    parsed.data.images?.find((image) => image.is_main_image) ??
    parsed.data.images?.[0];
  const imageUrl = mainImage
    ? httpsUrl(mainImage.cleaned_url ?? mainImage.url)
    : null;
  const amount = selectedOffer.amount;
  const currency = selectedOffer.source.price.currency;

  return {
    id: parsed.data.id,
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    imageUrl,
    offer: {
      merchant: selectedOffer.source.domain,
      merchantDomain: selectedOffer.source.domain,
      price: {
        amount,
        currency,
        display: formatPrice(amount, currency),
      },
      availability: selectedOffer.source.availability,
      productUrl: selectedOffer.url,
      affiliateUrl: selectedOffer.url,
      maxCommissionRate: selectedOffer.source.max_commission_rate ?? 0,
    },
  };
}

export function normalizeChannel3Products(
  input: unknown,
): ProductCandidate[] {
  const parsed = searchResponseSchema.safeParse(input);
  if (!parsed.success) throw new Channel3Error("upstream");

  return parsed.data.products
    .map(normalizeChannel3Product)
    .filter((product): product is ProductCandidate => product !== null)
    .slice(0, PRODUCT_LIMIT);
}

export async function searchChannel3(
  query: string,
  options: {
    apiKey?: string;
    fetcher?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<ProductCandidate[]> {
  const apiKey = options.apiKey ?? process.env.CHANNEL3_API_KEY;
  if (!apiKey) throw new Channel3Error("not_configured");

  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(CHANNEL3_SEARCH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        limit: PRODUCT_LIMIT,
        filters: {
          availability: ["InStock", "OutOfStock"],
        },
        config: {
          language: "en",
          country: "US",
          currency: "USD",
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? SEARCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Channel3Error("timeout");
    }
    throw new Channel3Error("upstream");
  }

  if (!response.ok) throw new Channel3Error("upstream");

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Channel3Error("upstream");
  }

  return normalizeChannel3Products(body);
}
