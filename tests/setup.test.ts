import { describe, expect, it } from "vitest";
import { VoyageResponseSchema } from "../src/schemas/response.schema";

describe("VoyageResponseSchema", () => {
  const validResponse = {
    task_id: "MB-01",
    status: "completed",
    total_travel_hours: 20,
    physical_eta: "2026-10-16T02:00:00Z",
    permitted_arrival: null,
    waiting_hours: null,
    deadline_feasible: null,
    missing_inputs: [],
    assumptions: [],
    explanation: "Distance divided by speed: 240 / 12 = 20 hours.",
  };

  it("should accept a valid completed response", () => {
    const result = VoyageResponseSchema.safeParse(validResponse);

    expect(result.success).toBe(true);
  });

  it("should accept a response with missing information", () => {
    const incompleteResponse = {
      ...validResponse,
      status: "insufficient_information",
      total_travel_hours: null,
      physical_eta: null,
      missing_inputs: ["vessel_speed"],
    };

    const result = VoyageResponseSchema.safeParse(incompleteResponse);

    expect(result.success).toBe(true);
  });

  it("should reject a negative waiting time", () => {
    const invalidResponse = {
      ...validResponse,
      waiting_hours: -2,
    };

    const result = VoyageResponseSchema.safeParse(invalidResponse);

    expect(result.success).toBe(false);
  });
});