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

    expect(result.systemPrompt).toContain(
      "Do not invent missing information",
    );
    expect(result.systemPrompt).toContain("insufficient_information");
  });

  it("should not include reference answers in the prompt", () => {
    const result = buildEvaluationPrompt(task);

    expect(result.userPrompt).not.toContain("reference");
    expect(result.userPrompt).not.toContain("expected outcome");
  });
});