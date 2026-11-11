"use client";

import { useReducer, useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";
import PayPalSandboxCheckout from "./paypal-sandbox-checkout";
import type {
  ProductCandidate,
  ProductRecommendation,
  RecommendationSource,
} from "@/server/integrations/contracts";
import { recommendationLabel } from "./recommendation-label";
import { savedSearchReducer } from "./search-state";

type Product = {
  id: string;
  name: string;
  detail: string;
  price: string;
  category: string;
  art: string;
  color: string;
  note: string;
};

const fallbackProducts: Product[] = [
  {
    id: "weekender",
    name: "The Weekender Tote",
    detail: "Recycled canvas · oat",
    price: "$68",
    category: "BAGS & TRAVEL",
    art: "tote",
    color: "lavender",
    note: "Room for the little extras",
  },
  {
    id: "bottle",
    name: "Daybreak Bottle",
    detail: "Insulated steel · moss",
    price: "$34",
    category: "EVERYDAY GOODS",
    art: "bottle",
    color: "peach",
    note: "Keeps its cool all day",
  },
  {
    id: "headphones",
    name: "Quiet Hours",
    detail: "Wireless audio · cloud",
    price: "$129",
    category: "TECH & AUDIO",
    art: "headphones",
    color: "blue",
    note: "A little space, anywhere",
  },
];

const suggestions = [
  "A thoughtful gift under $75",
  "Everyday things, made to last",
  "A calmer commute",
];

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 2.5c1.14 5.38 4.12 8.36 9.5 9.5-5.38 1.14-8.36 4.12-9.5 9.5-1.14-5.38-4.12-8.36-9.5-9.5 5.38-1.14 8.36-4.12 9.5-9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ProductArtwork({ product }: { product: Product }) {
  return (
    <div
      aria-label={`${product.name} placeholder illustration`}
      className={`product-art product-art--${product.color}`}
      role="img"
    >
      <span className={`art-object art-object--${product.art}`} />
      <Sparkle className="art-sparkle art-sparkle--one" />
      <Sparkle className="art-sparkle art-sparkle--two" />
      <span className="art-caption">SHOPILOT / OBJECT STUDY 0{fallbackProducts.indexOf(product) + 1}</span>
    </div>
  );
}

function OfflineProductCard({
  product,
  index,
  selected,
  onToggle,
}: {
  product: Product;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="product-card">
      <div className="card-image-wrap">
        <ProductArtwork product={product} />
        <span className="placeholder-label">OFFLINE PLACEHOLDER</span>
        <button
          aria-label={`${selected ? "Remove" : "Add"} ${product.name} ${selected ? "from" : "to"} your edit`}
          aria-pressed={selected}
          className={`save-button${selected ? " is-saved" : ""}`}
          onClick={onToggle}
          type="button"
        >
          {selected ? "✓" : "+"}
        </button>
        {index === 0 && <span className="pick-label">SAMPLE FIND</span>}
      </div>
      <div className="product-info">
        <div className="product-category">{product.category}</div>
        <div className="product-title-row">
          <h3>{product.name}</h3>
          <span>{product.price}</span>
        </div>
        <p>{product.detail}</p>
        <div className="product-note"><Sparkle /> {product.note}</div>
        <button
          className={`add-button${selected ? " added" : ""}`}
          onClick={onToggle}
          type="button"
        >
          {selected ? "Added to your edit" : "Add to your edit"}
          <span>{selected ? "✓" : "+"}</span>
        </button>
      </div>
    </article>
  );
}

function Channel3ProductCard({
  product,
  recommendation,
  recommendationSource,
  selected,
  onToggle,
}: {
  product: ProductCandidate;
  recommendation: ProductRecommendation | undefined;
  recommendationSource: RecommendationSource;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="product-card live-product-card">
      <div className="card-image-wrap">
        <div className="live-product-image">
          {product.imageUrl ? (
            // External product images are HTTPS-validated by the server; hosts are catalog-dependent.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.title} loading="lazy" />
          ) : (
            <div className="live-image-empty"><Sparkle /> Product image unavailable</div>
          )}
        </div>
        <span className="placeholder-label">CHANNEL3 SEARCH DATA</span>
        <button
          aria-label={`${selected ? "Remove" : "Add"} ${product.title} ${selected ? "from" : "to"} your edit`}
          aria-pressed={selected}
          className={`save-button${selected ? " is-saved" : ""}`}
          onClick={onToggle}
          type="button"
        >
          {selected ? "✓" : "+"}
        </button>
      </div>
      <div className="product-info">
        <div className="product-category">{product.offer.merchant}</div>
        <div className="product-title-row">
          <h3>{product.title}</h3>
          <span>{product.offer.price.display}</span>
        </div>
        <p className="live-description">{product.description || "No description provided."}</p>
        <p className="availability">
          {product.offer.availability === "InStock" ? "In stock" : "Out of stock"}
          {" · "}
          {product.offer.price.currency}
        </p>
        <div className="recommendation-reason">
          <span>{recommendationLabel(recommendationSource)}</span>
          <p>{recommendation?.reason ?? "No recommendation reason was provided."}</p>
        </div>
        {product.offer.availability === "InStock" ? (
          <a
            className="merchant-link"
            href={product.offer.affiliateUrl}
            rel="noopener noreferrer sponsored"
            target="_blank"
          >
            View at {product.offer.merchant}<span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="merchant-link merchant-link--disabled">Currently unavailable</span>
        )}
        <button
          className={`add-button${selected ? " added" : ""}`}
          onClick={onToggle}
          type="button"
        >
          {selected ? "Saved to your edit" : "Save to your edit"}
          <span>{selected ? "✓" : "+"}</span>
        </button>
      </div>
    </article>
  );
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

const clientSearchSchema = z
  .object({
    products: z.array(
      z.object({
        id: z.string().min(1),
        title: z.string(),
        description: z.string(),
        imageUrl: z.string().nullable(),
        offer: z.object({
          merchant: z.string(),
          merchantDomain: z.string(),
          price: z.object({
            amount: z.number().finite().nonnegative(),
            currency: z.string().regex(/^[A-Z]{3}$/),
            display: z.string(),
          }),
          availability: z.enum(["InStock", "OutOfStock"]),
          productUrl: z.string(),
          affiliateUrl: z.string(),
          maxCommissionRate: z.number().finite().min(0),
        }),
      }),
    ),
    recommendations: z.array(
      z.object({
        productId: z.string().min(1),
        reason: z.string().min(1).max(180),
      }),
    ),
    recommendationSource: z.enum(["deepseek", "fallback"]),
  })
  .strict();

function parseSearchData(input: unknown): {
  products: ProductCandidate[];
  recommendations: ProductRecommendation[];
  recommendationSource: RecommendationSource;
} | null {
  const parsed = clientSearchSchema.safeParse(input);
  if (!parsed.success) return null;
  if (
    parsed.data.products.some(
      (product) =>
        (product.imageUrl !== null && !isHttpsUrl(product.imageUrl)) ||
        !isHttpsUrl(product.offer.productUrl) ||
        !isHttpsUrl(product.offer.affiliateUrl),
    )
  ) {
    return null;
  }
  const candidateIds = new Set(parsed.data.products.map((product) => product.id));
  if (
    parsed.data.recommendations.some(
      (recommendation) => !candidateIds.has(recommendation.productId),
    )
  ) {
    return null;
  }

  return parsed.data;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<
    "idle" | "loading" | "success" | "empty" | "error"
  >("idle");
  const [searchError, setSearchError] = useState("");
  const [savedSearch, dispatchSavedSearch] = useReducer(savedSearchReducer, {
    results: [],
    selectedIds: [],
  });
  const [recommendations, setRecommendations] = useState<
    ProductRecommendation[]
  >([]);
  const [recommendationSource, setRecommendationSource] =
    useState<RecommendationSource>("fallback");

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) return;

    setSearchState("loading");
    setSearchError("");
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: cleanQuery }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Product search is temporarily unavailable.";
        throw new Error(errorMessage);
      }

      const data = parseSearchData(payload);
      if (!data) {
        throw new Error("Product search returned an invalid response.");
      }

      dispatchSavedSearch({ type: "results-replaced", results: data.products });
      setRecommendations(data.recommendations);
      setRecommendationSource(data.recommendationSource);
      setSearchState(data.products.length ? "success" : "empty");
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "Product search is temporarily unavailable.",
      );
      setSearchState("error");
    }
  }

  function toggleProduct(id: string) {
    dispatchSavedSearch({ type: "toggle", productId: id });
  }

  const selected = savedSearch.selectedIds;
  const visibleProducts =
    searchState === "success"
      ? savedSearch.results.map((product) => ({
          id: product.id,
          name: product.title,
          price: product.offer.price.display,
        }))
      : searchState === "error"
        ? fallbackProducts.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
          }))
        : [];
  const selectedProducts = visibleProducts.filter((product) =>
    selected.includes(product.id),
  );

  return (
    <main>
      <div className="announcement">
        <Sparkle />
        <span>A little more intention in every find.</span>
        <span className="announcement-tag">BUILT FOR THE PAYPAL AI HACKATHON</span>
      </div>

      <header className="site-header">
        <a aria-label="Shopilot home" className="wordmark" href="#">
          shopilot<span className="wordmark-dot">.</span>
        </a>
        <nav aria-label="Main navigation" className="main-nav">
          <a href="#discover">Discover</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <a className="cart-link" href="#your-edit">
          Your edit <span className="cart-count">{selectedProducts.length}</span>
        </a>
      </header>

      <section aria-labelledby="hero-title" className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> GOOD FINDS, LESS GUESSWORK</div>
          <h1 id="hero-title">
            Find your kind
            <br />
            of <span>thing.</span>
          </h1>
          <p className="hero-description">
            Tell us what you&apos;re looking for. We&apos;ll make the search feel
            a little more like you.
          </p>

          <form className="search-form" onSubmit={submitSearch}>
            <Sparkle className="search-sparkle" />
            <label className="visually-hidden" htmlFor="shopping-query">
              Describe what you are shopping for
            </label>
            <input
              autoComplete="off"
              id="shopping-query"
              maxLength={240}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="I’m looking for..."
              value={query}
            />
            <button
              aria-label="Search products"
              disabled={searchState === "loading" || query.trim().length < 2}
              type="submit"
            >
              <span>Find my edit</span>
              <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
                <path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            </button>
          </form>
          <div className="suggestions">
            <span>TRY</span>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="demo-notice">
            {searchState === "loading"
              ? "Searching Channel3 for a thoughtful edit…"
              : searchState === "success"
                ? `Live Channel3 results · ${recommendationSource === "deepseek" ? "DeepSeek-ranked" : "fallback-ranked"}`
                : searchState === "empty"
                  ? "No products found. Try a different description."
                  : searchState === "error"
                    ? `${searchError} Showing clearly labelled offline placeholders.`
                    : "Live search is available when the server-side Channel3 key is configured."}
          </p>
        </div>

        <div aria-label="Shopping, with a little more you in it" className="hero-art">
          <div className="hero-orbit hero-orbit--outer" />
          <div className="hero-orbit hero-orbit--inner" />
          <div className="hero-sun" />
          <div className="hero-sticker">
            <Sparkle />
            <span>good things<br />find their way</span>
          </div>
          <div className="hero-bag">
            <div className="bag-handle" />
            <div className="bag-face">
              <Sparkle className="bag-star" />
              <span className="bag-smile" />
            </div>
          </div>
          <div className="floating-note">
            <span className="note-icon"><Sparkle /></span>
            <span><strong>Picked for you</strong><small>not just popular</small></span>
            <span className="note-check">✓</span>
          </div>
          <span className="hero-art-label">A MORE PERSONAL WAY TO SHOP — 001</span>
        </div>
      </section>

      <section aria-labelledby="discover-title" className="discover section-wrap" id="discover">
        <div className="section-heading">
          <div>
            <div className="eyebrow"><span /> YOUR SHOPPING EDIT</div>
            <h2 id="discover-title">A little edit, <em>made for you.</em></h2>
          </div>
          <p>
            Channel3 provides product and offer details. Recommendation reasons
            are shown separately as AI opinion.
          </p>
        </div>

        <div className="discovery-layout">
          <div aria-live="polite" className="results-column">
            {searchState === "idle" && (
              <div className="results-message">
                <Sparkle />
                <strong>Start with a little about what you need.</strong>
                <span>Your live Channel3 results will appear here.</span>
              </div>
            )}
            {searchState === "loading" && (
              <div className="results-message results-message--loading" role="status">
                <span className="loading-spinner" />
                <strong>Finding a few good things…</strong>
                <span>Searching products and preparing recommendations.</span>
              </div>
            )}
            {searchState === "empty" && (
              <div className="results-message">
                <strong>No products found just yet.</strong>
                <span>Try a broader description or another search.</span>
              </div>
            )}
            {searchState === "error" && (
              <div className="offline-banner" role="status">
                <strong>OFFLINE SAMPLE PRODUCTS</strong>
                <span>{searchError} These sample cards are placeholders, not live listings.</span>
              </div>
            )}
            {searchState === "success" && (
              <div className="recommendation-source">
                <span>{recommendationSource === "deepseek" ? "DEEPSEEK RECOMMENDATIONS" : "DETERMINISTIC FALLBACK"}</span>
                <p>
                  Product facts and prices below come from Channel3. Reasons are
                  opinion only; {recommendationSource === "deepseek" ? "DeepSeek ranked these results." : "the list preserves Channel3 search order."}
                </p>
              </div>
            )}
            <div className="product-grid">
              {searchState === "success" &&
                savedSearch.results.map((product) => (
                  <Channel3ProductCard
                    key={product.id}
                    onToggle={() => toggleProduct(product.id)}
                    product={product}
                    recommendation={recommendations.find(
                      (item) => item.productId === product.id,
                    )}
                    recommendationSource={recommendationSource}
                    selected={selected.includes(product.id)}
                  />
                ))}
              {searchState === "error" &&
                fallbackProducts.map((product, index) => (
                  <OfflineProductCard
                    index={index}
                    key={product.id}
                    onToggle={() => toggleProduct(product.id)}
                    product={product}
                    selected={selected.includes(product.id)}
                  />
                ))}
            </div>
          </div>

          <aside aria-labelledby="edit-title" className="edit-card" id="your-edit">
            <div className="edit-topline">
              <span className="eyebrow"><span /> YOUR LITTLE LIST</span>
              <span className="edit-count">{selectedProducts.length.toString().padStart(2, "0")}</span>
            </div>
            <h3 id="edit-title">Your edit<span>.</span></h3>
            <p className="edit-intro">
              Save finds to revisit. Channel3 offers go to the merchant, not a Shopilot cart.
            </p>
            {selectedProducts.length ? (
              <ul className="selected-list">
                {selectedProducts.map((product) => (
                  <li key={product.id}>
                    <span>{product.name}</span>
                    <strong>{product.price}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-edit">
                <span className="empty-edit-icon"><Sparkle /></span>
                <span>Your picks will<br />show up here.</span>
              </div>
            )}
            <div className="edit-footer">
              <span>Merchant handoff</span>
              <strong>Shop at the retailer for Channel3 products.</strong>
            </div>
            <PayPalSandboxCheckout />
          </aside>
        </div>
        {searchState === "error" && (
          <p className="placeholder-disclaimer">
            Product names, artwork and prices in the offline cards are static
            placeholders — not live listings.
          </p>
        )}
      </section>

      <section aria-labelledby="steps-title" className="how-it-works" id="how-it-works">
        <div className="section-wrap how-inner">
          <div className="how-heading">
            <div className="eyebrow"><span /> THE IDEA IS SIMPLE</div>
            <h2 id="steps-title">Less scrolling.<br /><em>More “that’s the one.”</em></h2>
            <p>Shopping should start with what you need, not another hundred tabs.</p>
          </div>
          <div className="steps">
            <article className="step-card">
              <span className="step-number">01</span>
              <span className="step-icon step-icon--search">
                <svg aria-hidden="true" fill="none" viewBox="0 0 32 32"><circle cx="14" cy="14" r="8" stroke="currentColor" strokeWidth="1.7" /><path d="m20 20 6 6M10 14h8m-4-4v8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg>
              </span>
              <h3>Describe your need</h3>
              <p>A few words about what you want, who it&apos;s for, or how much you&apos;d like to spend.</p>
            </article>
            <span aria-hidden="true" className="step-connector">↗</span>
            <article className="step-card">
              <span className="step-number">02</span>
              <span className="step-icon step-icon--sparkle"><Sparkle /></span>
              <h3>Meet your recommendations</h3>
              <p>AI-powered ideas, thoughtfully matched to your request — not just the trending stuff.</p>
            </article>
            <span aria-hidden="true" className="step-connector">↗</span>
            <article className="step-card">
              <span className="step-number">03</span>
              <span className="step-icon step-icon--pay">P</span>
              <h3>Check out with PayPal</h3>
              <p>A simple, secure Sandbox checkout is part of the plan. No real payments in this demo.</p>
            </article>
          </div>
          <div className="sandbox-banner">
            <span className="sandbox-icon"><Sparkle /></span>
            <span><strong>Built for a better kind of shopping.</strong> Search, recommendations and checkout are demo placeholders for now.</span>
            <span className="sandbox-label">SANDBOX-FIRST</span>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <a aria-label="Shopilot home" className="wordmark" href="#">
          shopilot<span className="wordmark-dot">.</span>
        </a>
        <span>A little more you in every find.</span>
        <span>© 2026 SHOPILOT · DEMO EXPERIENCE</span>
      </footer>
    </main>
  );
}
