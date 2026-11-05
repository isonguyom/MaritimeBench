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

  it.each(["physical_eta", "permitted_arrival"] as const)(
    "should accept a valid UTC timestamp for %s",
    (field) => {
      const response = {
        ...validResponse,
        [field]: "2026-10-16T02:00:00Z",
      };

      expect(VoyageResponseSchema.safeParse(response).success).toBe(true);
    },
  );

  it.each(["physical_eta", "permitted_arrival"] as const)(
    "should reject a non-UTC offset for %s",
    (field) => {
      const response = {
        ...validResponse,
        [field]: "2026-10-16T02:00:00+01:00",
      };

      expect(VoyageResponseSchema.safeParse(response).success).toBe(false);
    },
  );

  it.each(["physical_eta", "permitted_arrival"] as const)(
    "should reject an invalid calendar date for %s",
    (field) => {
      const response = {
        ...validResponse,
        [field]: "2026-02-30T02:00:00Z",
      };

      expect(VoyageResponseSchema.safeParse(response).success).toBe(false);
    },
  );

  it.each(["physical_eta", "permitted_arrival"] as const)(
    "should reject a malformed timestamp for %s",
    (field) => {
      const response = {
        ...validResponse,
        [field]: "not-a-date",
      };

      expect(VoyageResponseSchema.safeParse(response).success).toBe(false);
    },
  );

  it("should continue accepting null arrival timestamps", () => {
    const response = {
      ...validResponse,
      physical_eta: null,
      permitted_arrival: null,
    };

    expect(VoyageResponseSchema.safeParse(response).success).toBe(true);
  });

  it.each(["MB-1", "MB-ABC", "MB-01-extra", ""])(
    "should reject an invalid task ID: %s",
    (taskId) => {
      const response = {
        ...validResponse,
        task_id: taskId,
      };

      expect(VoyageResponseSchema.safeParse(response).success).toBe(false);
    },
  );

  it.each(["MB-01", "MB-08", "MB-100"])(
    "should accept a valid task ID: %s",
    (taskId) => {
      const response = {
        ...validResponse,
        task_id: taskId,
      };

      expect(VoyageResponseSchema.safeParse(response).success).toBe(true);
    },
  );

  it.each(["", " ", "   ", "\t", "\n"])(
    "should reject an empty or whitespace-only explanation: %s",
    (explanation) => {
      const response = {
        ...validResponse,
        explanation,
      };

      expect(VoyageResponseSchema.safeParse(response).success).toBe(false);
    },
  );

  it.each(["", " ", "   ", "\t", "\n"])(
    "should reject an empty missing_inputs entry: %s",
    (value) => {
      const response = {
        ...validResponse,
        missing_inputs: [value],
      };

      expect(VoyageResponseSchema.safeParse(response).success).toBe(false);
    },
  );

  it.each(["", " ", "   ", "\t", "\n"])(
    "should reject an empty assumptions entry: %s",
    (value) => {
      const response = {
        ...validResponse,
        assumptions: [value],
      };

      expect(VoyageResponseSchema.safeParse(response).success).toBe(false);
    },
  );

  it("should accept zero travel and waiting hours", () => {
    const response = {
      ...validResponse,
      total_travel_hours: 0,
      waiting_hours: 0,
    };

    expect(VoyageResponseSchema.safeParse(response).success).toBe(true);
  });

  it("should reject negative travel hours", () => {
    const response = {
      ...validResponse,
      total_travel_hours: -1,
    };

    expect(VoyageResponseSchema.safeParse(response).success).toBe(false);
  });

  it("should accept null travel and waiting hours", () => {
    const response = {
      ...validResponse,
      total_travel_hours: null,
      waiting_hours: null,
    };

    expect(VoyageResponseSchema.safeParse(response).success).toBe(true);
  });
});
