import { describe, expect, it } from "vitest";
import { savedSearchReducer } from "./search-state";
import type { ProductCandidate } from "@/server/integrations/contracts";

const product = (id: string): ProductCandidate => ({
  id,
  title: id,
  description: "",
  imageUrl: null,
  offer: {
    merchant: "shop.example",
    merchantDomain: "shop.example",
    price: { amount: 10, currency: "USD", display: "$10.00" },
    availability: "InStock",
    productUrl: "https://shop.example/item",
    affiliateUrl: "https://shop.example/item",
    maxCommissionRate: 0,
  },
});

describe("saved product state", () => {
  it("clears saved IDs when successful results replace the current list", () => {
    const state = {
      results: [product("old-product")],
      selectedIds: ["old-product"],
    };

    expect(
      savedSearchReducer(state, {
        type: "results-replaced",
        results: [product("new-product")],
      }),
    ).toEqual({
      results: [product("new-product")],
      selectedIds: [],
    });
  });

  it("toggles saved IDs without duplicates", () => {
    const withSaved = savedSearchReducer(
      { results: [product("one")], selectedIds: [] },
      { type: "toggle", productId: "one" },
    );
    expect(withSaved.selectedIds).toEqual(["one"]);
    expect(
      savedSearchReducer(withSaved, { type: "toggle", productId: "one" })
        .selectedIds,
    ).toEqual([]);
  });
});
