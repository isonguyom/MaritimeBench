import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { VoyageResponseSchema } from "../src/schemas/response.schema";

describe("Voyage reference schema", () => {
  it.each([
    "MB-01",
    "MB-02",
    "MB-03",
    "MB-04",
    "MB-05",
    "MB-06",
    "MB-07",
    "MB-08",
  ])("validates the %s reference answer", (taskId) => {
    const fileContent = readFileSync(`data/references/${taskId}.json`, "utf-8");

    const reference = JSON.parse(fileContent);

    const result = VoyageResponseSchema.safeParse(reference);

    expect(result.success).toBe(true);
  });
});
