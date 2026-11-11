# Shopilot

Shopilot is a PayPal AI Hackathon demo for conversational product discovery.
Describe what you need, review Channel3 search results and grounded AI
recommendations, then try a separately labelled PayPal Sandbox demo checkout.

## Requirements and local setup

- Node.js 22 (see `.nvmrc`; Next.js 16 requires Node.js 20.9 or newer)
- npm 10 or newer

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Add provider credentials
to `.env.local` only when testing that integration. The file is ignored by Git.

## Current scope and safety

- Product discovery is a server-side call to Channel3. Product facts, offers,
  merchant names, availability and prices come from Channel3. Channel3's search
  response has no separate canonical product-page URL; Shopilot uses the
  selected `offers[].url` as the merchant handoff and affiliate/attribution URL.
- DeepSeek can only rank IDs in the current Channel3 result set. If its key or
  model is missing, or the request fails, Shopilot preserves Channel3's order
  and labels the deterministic fallback.
- Channel3 items are recommendations with outbound retailer links. They are
  **not** purchasable through Shopilot. The PayPal flow is a separate,
  server-priced `$1.00 USD` Sandbox sample item. It has no fulfillment and
  makes no real merchant purchase.
- Static product cards appear only when live search is unavailable and are
  explicitly labelled offline placeholders.
- Provider keys and PayPal's client secret remain server-side. The PayPal
  client ID is public by design and is returned only to load the Sandbox JS
  SDK when both PayPal credentials are configured. Never use `NEXT_PUBLIC_*`
  for secrets.

## Environment variables

Copy `.env.example` to `.env.local`; the checked-in template contains no real
credentials.

| Variable | Purpose |
| --- | --- |
| `CHANNEL3_API_KEY` | Server-side Channel3 product search |
| `DEEPSEEK_API_KEY` | Optional server-side DeepSeek recommendation key |
| `DEEPSEEK_MODEL` | DeepSeek API model ID; `deepseek-flash` is the recommended fast demo default |
| `DEEPSEEK_BASE_URL` | Optional DeepSeek API root; defaults to `https://api.deepseek.com` |
| `AI_API_KEY` | Legacy alias used if `DEEPSEEK_API_KEY` is unset |
| `AI_MODEL` | Legacy model alias used if `DEEPSEEK_MODEL` is unset |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox app client ID; public to the SDK only |
| `PAYPAL_CLIENT_SECRET` | Private PayPal Sandbox REST API credential |
| `PAYPAL_BASE_URL` | Sandbox API origin; defaults to `https://api-m.sandbox.paypal.com` |

`GET /api/health` is a fast, side-effect-free health check. `POST /api/search`
returns normalized Channel3 products plus AI or fallback recommendation
reasons. The recommendation provider uses the compatible SDK client with
DeepSeek's Responses API and candidate-specific JSON Schema output. Use the API
model IDs `deepseek-flash` or `deepseek-v4-pro`, not display names; `deepseek-flash`
serves the current V4.1 Flash model and is the recommended fast demo default.
It requests `reasoning.effort: none` and returns only parsed, validated
recommendation reasons. `POST /api/checkout/orders` creates orders only from
the server-owned demo catalog; `POST /api/checkout/capture` verifies the PayPal
order and completed capture.

The search route allows 12 requests per client IP per minute; each checkout
route allows 6 per client IP per minute. These fixed-window limits are an
in-memory, single-instance hackathon safeguard keyed from the reverse-proxy
client-IP headers. They return `429` with `Retry-After`, but are not shared
across instances and are not a substitute for a distributed abuse-prevention
service.

## Tests and validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All automated tests mock external APIs; these commands need no provider
credentials. `npm run test:sandbox` is a separate optional OAuth connectivity
smoke test and requires `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. It only
checks Sandbox credentials; approving a sample order still requires a Sandbox
buyer account in the browser.

GitHub Actions runs `npm ci`, lint, typecheck, tests and a production build on
pull requests and pushes to `main`. The optional Sandbox credential check is
skipped unless both PayPal secrets are configured in the repository.

## PayPal Sandbox setup

Create a PayPal Developer Sandbox REST app, then set its client ID and secret
as private environment variables. For a browser test, use a Sandbox personal
buyer account to approve the sample order. The server verifies the order
against its own catalog and captures it through the Sandbox Orders v2 API.
No Channel3 retailer link enters PayPal checkout, and no goods are fulfilled.

## Render Node Web Service

`render.yaml` describes a Node service on `main` with `npm ci && npm run build`,
`npm start`, and `/api/health`. Next's normal start command consumes Render's
`PORT`; do not hardcode a port. Set the private environment variables above in
Render's Dashboard (leave provider keys unset if that provider is not being
used). No secrets belong in `render.yaml`.

Validate locally with the commands above. Keep automatic deployment disabled
and deploy only after the `main` CI quality job passes. No Render service is
created or deployed by this repository setup.
