# Shopilot — submission package

> Submission portal entry is not yet ready. Replace the URL placeholders only
> after the live deployment and video are verified. No submission has been sent.

## Project title

Shopilot

## One-line pitch

Turn a natural-language shopping request into a focused, AI-ranked set of real
Channel3 product matches—with transparent merchant handoff and a separate,
clearly labeled PayPal Sandbox demo.

## Description

### Problem

Online shopping discovery can bury a shopper in broad results and unclear
recommendations. Product facts, prices, and merchant choices should be easy to
inspect rather than hidden behind an opaque AI answer.

### Solution

Shopilot accepts a natural-language shopping request, searches Channel3’s
product catalog on the server, and asks DeepSeek to rank only those returned
product IDs. Search-sourced product and offer facts are shown separately from
DeepSeek recommendation reasons. If DeepSeek ranking is unavailable, the
interface labels its deterministic Channel3-order fallback.

### Key user flow

1. Describe a product need in the search box.
2. Review live Channel3 products, selected merchant offer, price, availability,
   and recommendation reasons.
3. Follow an optional, clearly marked outbound link to the retailer.
4. Separately try a server-priced `$1.00 USD` PayPal Sandbox demo item. It is
   not a Channel3 item and has no fulfillment.

### Implementation

- **Channel3:** Server-side `POST https://api.trychannel3.com/v1/search` with
  `x-api-key`. Shopilot normalizes product IDs, titles, descriptions, images,
  offers, merchant domains, prices/currencies, availability, and Channel3 buy
  links. The current provider adapter accepts both the documented
  `price.amount` field and the observed live `price.price` field.
- **DeepSeek:** Server-side Responses API with schema-constrained structured
  output. Returned IDs are checked against the active Channel3 result set;
  invalid, duplicate, or malformed entries are discarded. The API root defaults
  to `https://api.deepseek.com`; `deepseek-flash` is the recommended fast demo
  model. Thinking is disabled for this ranking task.
- **PayPal Sandbox:** Server-created Orders v2 checkout for one server-owned
  sample item only. The server verifies the order’s item, amount, status, and
  completed capture. It is not a retailer purchase.
- **Next.js:** Next.js 16 App Router, React, TypeScript, server-only integration
  modules, runtime validation, and automated tests.
- **Render:** Prepared as a Node Web Service using `npm ci && npm run build`,
  `npm start`, and `/api/health`. Render deployment has not yet been verified.

### Security and responsible-commerce scope

Provider credentials stay on the server. PayPal’s client ID is exposed only
for loading the SDK when the server has the private credentials; the secret is
never returned. Search and checkout routes have bounded request validation and
in-memory per-client rate limits (12 searches/minute; 6 requests/minute per
checkout route), intended only as a single-instance hackathon safeguard.

Channel3 items are recommendations with merchant handoff, not Shopilot
inventory. PayPal is a separate Sandbox-only `$1.00` demo with no real
fulfillment or merchant purchase.

## Links

- **GitHub repository:** https://github.com/brn-maker/shopilot
- **Live app:** `[REPLACE WITH VERIFIED RENDER URL]`
- **Demo video:** `[REPLACE WITH VERIFIED VIDEO URL]`
- **Deployed commit:** `[REPLACE WITH VERIFIED MAIN COMMIT SHA]`

## Testing and verification

Verified locally with Node.js 22.22.0: lint, TypeScript typecheck, production
build, and 31 automated tests across 10 files passed. Tests mock external
providers.

The real Channel3 API returned eight products for a live query. The current
`price.price` live response field is accepted as well as the documented
`price.amount` field. A credential-backed search returned eight Channel3
products and six DeepSeek recommendations with source `deepseek` using the
documented API model ID `deepseek-flash` (current model: DeepSeek V4.1 Flash).
The configured legacy `AI_MODEL` display name is not an API model ID; set
`DEEPSEEK_MODEL=deepseek-flash` or use a supported API ID. The recommendation
label is covered by a browser-label unit test; full browser rehearsal, PayPal
approval-and-capture, and Render deployment verification remain pending.

## Judge walkthrough

Enter a short natural-language shopping request. Inspect a returned product’s
Channel3 merchant, offer price, currency, and availability; then compare those
facts with its clearly separated recommendation reason. Follow an optional
retailer handoff only if desired. Finally, inspect the separate `$1.00 USD`
PayPal Sandbox demo notice and, when Sandbox credentials and a buyer account
are ready, complete its non-fulfillment test flow.

## What makes this different

Shopilot treats AI as a constrained ranking layer over real search results,
not as a source of invented products or prices. It also distinguishes a
retailer handoff from a Shopilot purchase and keeps its PayPal Sandbox sample
separate from Channel3 discovery.

## Submission checklist

- [ ] Confirm the current official hackathon portal, required fields, and
  submission deadline from the organizer’s rules page.
- [ ] Replace the live URL placeholder after Render is publicly verified.
- [ ] Replace the video URL placeholder after reviewing the final 60–90 second
  recording.
- [ ] Confirm the repository URL and deployed commit SHA.
- [ ] Capture and select clean screenshots: landing page, live results, AI
  source/reason, retailer handoff disclosure, Sandbox notice, and capture
  success. Exclude secrets, dashboards, account details, and personal data.
- [ ] Confirm CI is green for the deployed `main` commit.
- [ ] Verify the entry’s title, description, repository, live URL, video URL,
  screenshots, and all required portal fields before submission.
- [ ] Obtain explicit user confirmation (“submit now”) before the portal’s
  final submit action.

**Status:** Not deployed, not video-recorded, and not submitted. The official
hackathon rules page could not be identified from the project details; verify
the portal and its required fields before using this package.
