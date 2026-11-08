import { describe, expect, it } from "vitest";

import { buildEvaluationPrompt } from "../../src/runner/prompt.builder";
import { VoyageTaskSchema } from "../../src/schemas/task.schema";

const task = VoyageTaskSchema.parse({
  task_id: "MB-01",
  title: "Baseline ETA",
  description: "Calculate a baseline voyage ETA.",
  departure_time: "2026-10-15T06:00:00Z",
  legs: [
    {
      leg_id: "LEG-01",
      distance_nm: 240,
      speed_kn: 12,
    },
  ],
  weather_restrictions: [],
});

describe("Evaluation prompt builder", () => {
  it("should return a system prompt and user prompt", () => {
    const result = buildEvaluationPrompt(task);

    expect(result.systemPrompt).toBeTruthy();
    expect(result.userPrompt).toBeTruthy();
  });

  it("should include the task ID and voyage data", () => {
    const result = buildEvaluationPrompt(task);

    expect(result.userPrompt).toContain("MB-01");
    expect(result.userPrompt).toContain("240");
    expect(result.userPrompt).toContain("12");
    expect(result.userPrompt).toContain("2026-10-15T06:00:00Z");
  });

  it("should include the required JSON response fields", () => {
    const result = buildEvaluationPrompt(task);

    expect(result.systemPrompt).toContain("total_travel_hours");
    expect(result.systemPrompt).toContain("physical_eta");
    expect(result.systemPrompt).toContain("permitted_arrival");
    expect(result.systemPrompt).toContain("waiting_hours");
    expect(result.systemPrompt).toContain("deadline_feasible");
    expect(result.systemPrompt).toContain("missing_inputs");
  });

  it("should instruct the model not to invent missing information", () => {
    const result = buildEvaluationPrompt(task);

    expect(result.systemPrompt).toContain("Do not invent missing information");
    expect(result.systemPrompt).toContain("insufficient_information");
  });

  it("should not include reference answers in the prompt", () => {
    const result = buildEvaluationPrompt(task);

    expect(result.userPrompt).not.toContain("reference");
    expect(result.userPrompt).not.toContain("expected outcome");
  });

  it("should include invalid-input handling instructions", () => {
    const result = buildEvaluationPrompt(task);

    expect(result.systemPrompt).toContain(
      "If an input is invalid, return invalid_input",
    );
    expect(result.systemPrompt).toContain("invalid_inputs");
    expect(result.systemPrompt).toContain("exact field path");
    expect(result.systemPrompt).toContain("greater than zero");
    expect(result.systemPrompt).toContain(
      "Restriction end time must be later than restriction start time",
    );
  });

  it("should include invalid_inputs in the required JSON response fields", () => {
    const result = buildEvaluationPrompt(task);

    expect(result.systemPrompt).toContain('"invalid_inputs"');
  });

  it("should explain multiple and overlapping weather restrictions", () => {
    const result = buildEvaluationPrompt(task);

    expect(result.systemPrompt).toContain(
      "Multiple weather restrictions may apply during the same voyage.",
    );
    expect(result.systemPrompt).toContain(
      "use the lowest speed among the current leg's normal speed and all active restrictions' restricted speeds.",
    );
    expect(result.systemPrompt).toContain(
      "A restricted speed is a maximum-speed constraint.",
    );
    expect(result.systemPrompt).toContain("Adjacent restrictions are valid.");
    expect(result.systemPrompt).toContain(
      "Restrictions must continue to apply across leg boundaries",
    );
    expect(result.systemPrompt).toContain(
      "Treat all supplied weather restrictions as voyage-wide time-based restrictions.",
    );
  });

  it("should enforce the complete response output rules", () => {
    const result = buildEvaluationPrompt(task);

    expect(result.systemPrompt).toContain("Include every field");
    expect(result.systemPrompt).toContain(
      "Use null when a field is not applicable or cannot be determined.",
    );
    expect(result.systemPrompt).toContain(
      "Do not add fields outside the specified JSON structure.",
    );
    expect(result.systemPrompt).toContain("Explain the calculations clearly");
  });
});
