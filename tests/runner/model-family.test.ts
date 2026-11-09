import { describe, expect, it } from "vitest";
import { inferModelFamily } from "../../src/runner/model-family";

describe("inferModelFamily", () => {
  it.each([
    ["gpt-6.1-sol", "gpt-6.1"],
    ["gpt-4o", "gpt-4o"],
    ["o3-mini", "o3"],
    ["claude-4-5-sonnet", "claude-4-5-sonnet"],
    ["gemini-2.5-pro", "gemini-2.5-pro"],
  ])("infers %s as %s", (model, expectedFamily) => {
    expect(inferModelFamily(model)).toEqual({
      name: expectedFamily,
      source: "inferred_from_model_id",
    });
  });

  it("returns unknown for unrecognized model identifiers", () => {
    expect(inferModelFamily("custom-provider-model")).toEqual({
      name: "unknown",
      source: "unknown",
    });
  });

  it("normalizes whitespace and letter casing", () => {
    expect(inferModelFamily(" GPT-6.1-SOL ")).toEqual({
      name: "gpt-6.1",
      source: "inferred_from_model_id",
    });
  });
});
