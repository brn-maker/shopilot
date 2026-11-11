import type { ProductCandidate } from "@/server/integrations/contracts";

export type SavedSearchState = {
  results: ProductCandidate[];
  selectedIds: string[];
};

export type SavedSearchAction =
  | { type: "results-replaced"; results: ProductCandidate[] }
  | { type: "toggle"; productId: string };

export function savedSearchReducer(
  state: SavedSearchState,
  action: SavedSearchAction,
): SavedSearchState {
  if (action.type === "results-replaced") {
    return { results: action.results, selectedIds: [] };
  }

  return {
    ...state,
    selectedIds: state.selectedIds.includes(action.productId)
      ? state.selectedIds.filter((id) => id !== action.productId)
      : [...state.selectedIds, action.productId],
  };
}
