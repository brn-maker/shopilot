import { describe, expect, it } from "vitest";
import { recommendationLabel } from "./recommendation-label";

describe("recommendation source label", () => {
  it("labels provider-ranked results as DeepSeek recommendations", () => {
    expect(recommendationLabel("deepseek")).toBe("DeepSeek recommendation");
  });

  it("labels deterministic results as fallback rather than AI-ranked", () => {
    expect(recommendationLabel("fallback")).toBe("Fallback ranking");
  });
});
