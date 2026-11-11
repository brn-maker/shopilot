import "server-only";

export const demoCatalog = {
  "sandbox-demo-item": {
    name: "Shopilot Sandbox demo item",
    description: "A non-fulfillment checkout sample",
    amountCents: 100,
    currency: "USD",
  },
} as const;

export type DemoCatalogId = keyof typeof demoCatalog;
