import type { RecommendationSource } from "@/server/integrations/contracts";

export function recommendationLabel(source: RecommendationSource): string {
  return source === "deepseek"
    ? "DeepSeek recommendation"
    : "Fallback ranking";
}
