"use client";

import { useState } from "react";
import type { FormEvent } from "react";

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

const products: Product[] = [
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
      <span className="art-caption">SHOPILOT / OBJECT STUDY 0{products.indexOf(product) + 1}</span>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery) setSubmittedQuery(cleanQuery);
  }

  function toggleProduct(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((productId) => productId !== id)
        : [...current, id],
    );
  }

  const selectedProducts = products.filter((product) =>
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
          Your edit <span className="cart-count">{selected.length}</span>
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="I’m looking for..."
              value={query}
            />
            <button aria-label="Search products" type="submit">
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
            {submittedQuery
              ? `Demo mode: “${submittedQuery}” is ready for a future AI search.`
              : "Demo mode · Search is a UI preview; no products are queried yet."}
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
            <div className="eyebrow"><span /> A FEW GOOD STARTING POINTS</div>
            <h2 id="discover-title">A little edit, <em>just because.</em></h2>
          </div>
          <p>These are placeholders for the finds Shopilot will bring your way.</p>
        </div>

        <div className="discovery-layout">
          <div className="product-grid">
            {products.map((product, index) => {
              const isSelected = selected.includes(product.id);
              return (
                <article className="product-card" key={product.id}>
                  <div className="card-image-wrap">
                    <ProductArtwork product={product} />
                    <span className="placeholder-label">UI PLACEHOLDER</span>
                    <button
                      aria-label={`${isSelected ? "Remove" : "Add"} ${product.name} ${isSelected ? "from" : "to"} your edit`}
                      aria-pressed={isSelected}
                      className={`save-button${isSelected ? " is-saved" : ""}`}
                      onClick={() => toggleProduct(product.id)}
                      type="button"
                    >
                      {isSelected ? "✓" : "+"}
                    </button>
                    {index === 0 && <span className="pick-label">A GOOD GIFT</span>}
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
                      className={`add-button${isSelected ? " added" : ""}`}
                      onClick={() => toggleProduct(product.id)}
                      type="button"
                    >
                      {isSelected ? "Added to your edit" : "Add to your edit"}
                      <span>{isSelected ? "✓" : "+"}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <aside aria-labelledby="edit-title" className="edit-card" id="your-edit">
            <div className="edit-topline">
              <span className="eyebrow"><span /> YOUR LITTLE LIST</span>
              <span className="edit-count">{selected.length.toString().padStart(2, "0")}</span>
            </div>
            <h3 id="edit-title">Your edit<span>.</span></h3>
            <p className="edit-intro">Keep the things that feel right. Leave the rest.</p>
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
              <span>Checkout experience</span>
              <strong>Coming later with PayPal Sandbox</strong>
            </div>
            <div className="demo-pill"><span /> Demo only · no purchases</div>
          </aside>
        </div>
        <p className="placeholder-disclaimer">
          Product names, artwork and prices shown here are static UI placeholders — not live listings.
        </p>
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
