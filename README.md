# Shopilot

Shopilot is an early demo for the PayPal AI Hackathon. It explores a more
personal shopping experience: describe what you need, review recommendations,
and eventually check out using PayPal Sandbox.

## Requirements

- Node.js 22 (see `.nvmrc`; Next.js 16 requires Node.js 20.9 or newer)
- npm 10 or newer

## Local setup

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No credentials or
environment file are needed for the current demo.

## Demo scope

The landing page and product cards are static UI placeholders. Search,
recommendations, merchant links, and checkout are not connected, and the demo
does not make purchases or fulfill orders. The health endpoint is available at
`GET /api/health`.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

Keep local environment files, private keys, and credentials out of Git. The
repository ignores `.env*`, `*.key`, and `node_modules`.
