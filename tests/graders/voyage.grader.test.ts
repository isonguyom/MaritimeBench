import { describe, expect, it } from "vitest";

import { gradeVoyageResponse } from "../../src/graders/voyage.grader";
import type { VoyageResponse } from "../../src/schemas/response.schema";
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

const reference: VoyageResponse = {
  task_id: "MB-01",
  status: "completed",
  total_travel_hours: 20,
  physical_eta: "2026-10-16T02:00:00Z",
  permitted_arrival: null,
  waiting_hours: null,
  deadline_feasible: null,
  missing_inputs: [],
  assumptions: [],
  explanation: "The vessel travels 240 nautical miles at 12 knots.",
};

describe("Voyage response grader", () => {
  it("should award 100% for a correct response", () => {
    const response = { ...reference };

    const result = gradeVoyageResponse(response, task, reference);

    expect(result.score).toBe(100);
    expect(result.task_passed).toBe(true);
    expect(result.valid_response).toBe(true);
  });

  it("should accept timestamp differences within one minute", () => {
    const response = {
      ...reference,
      physical_eta: "2026-10-16T02:00:30Z",
    };

    const result = gradeVoyageResponse(response, task, reference);

    expect(result.task_passed).toBe(true);
  });

  it("should reject timestamp differences greater than one minute", () => {
    const response = {
      ...reference,
      physical_eta: "2026-10-16T02:02:00Z",
    };

    const result = gradeVoyageResponse(response, task, reference);

    expect(result.task_passed).toBe(false);
    expect(result.score).toBeLessThan(100);
  });

  it("should reject an incorrect travel duration", () => {
    const response = {
      ...reference,
      total_travel_hours: 21,
    };

    const result = gradeVoyageResponse(response, task, reference);

    expect(result.task_passed).toBe(false);
  });

  it("should reject an incorrect status", () => {
    const response = {
      ...reference,
      status: "insufficient_information",
    };

    const result = gradeVoyageResponse(response, task, reference);

    expect(result.task_passed).toBe(false);
  });

  it("should reject an invalid response structure", () => {
    const response = {
      task_id: "MB-01",
      status: "unknown",
    };

    const result = gradeVoyageResponse(response, task, reference);

    expect(result.valid_response).toBe(false);
    expect(result.score).toBe(0);
    expect(result.task_passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should not grade deadline feasibility when no deadline exists", () => {
    const response = {
      ...reference,
      deadline_feasible: true,
    };

    const result = gradeVoyageResponse(response, task, reference);

    expect(result.task_passed).toBe(true);
    expect(
      result.checks.some((check) => check.name === "deadline_feasible"),
    ).toBe(false);
  });

  it("should not grade port arrival when no port window exists", () => {
    const response = {
      ...reference,
      permitted_arrival: "2026-10-16T18:00:00Z",
      waiting_hours: 16,
    };

    const result = gradeVoyageResponse(response, task, reference);

    expect(result.task_passed).toBe(true);
    expect(
      result.checks.some((check) => check.name === "permitted_arrival"),
    ).toBe(false);
    expect(result.checks.some((check) => check.name === "waiting_hours")).toBe(
      false,
    );
  });

  it("should reject invented calculations when required information is missing", () => {
    const missingSpeedTask = VoyageTaskSchema.parse({
      task_id: "MB-07",
      title: "Missing vessel speed",
      description: "Calculate a voyage with missing vessel speed.",
      departure_time: "2026-10-15T06:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 240,
        },
      ],
      weather_restrictions: [],
    });

    const missingSpeedReference: VoyageResponse = {
      task_id: "MB-07",
      status: "insufficient_information",
      total_travel_hours: null,
      physical_eta: null,
      permitted_arrival: null,
      waiting_hours: null,
      deadline_feasible: null,
      missing_inputs: ["vessel_speed"],
      assumptions: [],
      explanation: "Vessel speed is required to calculate the ETA.",
    };

    const inventedResponses = [
      { total_travel_hours: 20 },
      { physical_eta: "2026-10-16T02:00:00Z" },
      { permitted_arrival: "2026-10-16T02:00:00Z" },
      { waiting_hours: 0 },
      { deadline_feasible: true },
    ];

    for (const inventedValue of inventedResponses) {
      const response = {
        ...missingSpeedReference,
        ...inventedValue,
      };

      const result = gradeVoyageResponse(
        response,
        missingSpeedTask,
        missingSpeedReference,
      );

      expect(result.task_passed).toBe(false);
      expect(result.score).toBeLessThan(100);
    }
  });

  it("should reject an incorrect waiting time when a port window exists", () => {
    const portTask = VoyageTaskSchema.parse({
      task_id: "MB-05",
      title: "Port waiting time",
      description: "Calculate arrival outside a port receiving window.",
      departure_time: "2026-10-15T08:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 180,
          speed_kn: 12,
        },
      ],
      weather_restrictions: [],
      port_window: {
        opens_at: "18:00",
        closes_at: "22:00",
      },
    });

    const portReference: VoyageResponse = {
      task_id: "MB-05",
      status: "completed",
      total_travel_hours: 15,
      physical_eta: "2026-10-15T23:00:00Z",
      permitted_arrival: "2026-10-16T18:00:00Z",
      waiting_hours: 19,
      deadline_feasible: null,
      missing_inputs: [],
      assumptions: [],
      explanation: "The vessel waits for the next receiving window.",
    };

    const response = {
      ...portReference,
      waiting_hours: 18,
    };

    const result = gradeVoyageResponse(response, portTask, portReference);

    expect(result.task_passed).toBe(false);
    expect(
      result.checks.find((check) => check.name === "waiting_hours")?.passed,
    ).toBe(false);
  });

  it("should reject incorrect deadline feasibility when a deadline exists", () => {
    const deadlineTask = VoyageTaskSchema.parse({
      task_id: "MB-06",
      title: "Hard deadline feasibility",
      description: "Determine whether the vessel can meet the deadline.",
      departure_time: "2026-10-15T06:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 240,
          speed_kn: 12,
        },
      ],
      weather_restrictions: [],
      deadline: "2026-10-16T01:00:00Z",
    });

    const deadlineReference: VoyageResponse = {
      task_id: "MB-06",
      status: "completed",
      total_travel_hours: 20,
      physical_eta: "2026-10-16T02:00:00Z",
      permitted_arrival: null,
      waiting_hours: null,
      deadline_feasible: false,
      missing_inputs: [],
      assumptions: [],
      explanation: "The vessel arrives one hour after the deadline.",
    };

    const response = {
      ...deadlineReference,
      deadline_feasible: true,
    };

    const result = gradeVoyageResponse(
      response,
      deadlineTask,
      deadlineReference,
    );

    expect(result.task_passed).toBe(false);
    expect(
      result.checks.find((check) => check.name === "deadline_feasible")?.passed,
    ).toBe(false);
  });

  it("should reject an incorrect ETA for a weather-restricted voyage", () => {
    const weatherTask = VoyageTaskSchema.parse({
      task_id: "MB-03",
      title: "Weather speed restriction",
      description: "Calculate voyage time with a temporary speed restriction.",
      departure_time: "2026-10-15T08:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 180,
          speed_kn: 12,
        },
      ],
      weather_restrictions: [
        {
          start_time: "2026-10-15T12:00:00Z",
          end_time: "2026-10-15T16:00:00Z",
          restricted_speed_kn: 6,
        },
      ],
    });

    const weatherReference: VoyageResponse = {
      task_id: "MB-03",
      status: "completed",
      total_travel_hours: 17,
      physical_eta: "2026-10-16T01:00:00Z",
      permitted_arrival: null,
      waiting_hours: null,
      deadline_feasible: null,
      missing_inputs: [],
      assumptions: [],
      explanation:
        "The vessel travels at reduced speed during the restriction.",
    };

    const response = {
      ...weatherReference,
      physical_eta: "2026-10-16T00:00:00Z",
    };

    const result = gradeVoyageResponse(response, weatherTask, weatherReference);

    expect(result.task_passed).toBe(false);
    expect(
      result.checks.find((check) => check.name === "physical_eta")?.passed,
    ).toBe(false);
  });

  it("should reject a task and reference with different task IDs", () => {
    const mismatchedTask = VoyageTaskSchema.parse({
      task_id: "MB-02",
      title: "Multi-leg voyage",
      description: "Calculate a multi-leg voyage.",
      departure_time: "2026-10-15T06:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 120,
          speed_kn: 12,
        },
      ],
      weather_restrictions: [],
    });

    expect(() =>
      gradeVoyageResponse(reference, mismatchedTask, reference),
    ).toThrow(/Task\/reference mismatch/);
  });

  it("should reject an incorrect missing_inputs list", () => {
    const missingSpeedTask = VoyageTaskSchema.parse({
      task_id: "MB-07",
      title: "Missing vessel speed",
      description: "Calculate a voyage with missing vessel speed.",
      departure_time: "2026-10-15T06:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 240,
        },
      ],
      weather_restrictions: [],
    });

    const missingSpeedReference: VoyageResponse = {
      task_id: "MB-07",
      status: "insufficient_information",
      total_travel_hours: null,
      physical_eta: null,
      permitted_arrival: null,
      waiting_hours: null,
      deadline_feasible: null,
      missing_inputs: ["vessel_speed"],
      assumptions: [],
      explanation: "Vessel speed is required to calculate the ETA.",
    };

    const response = {
      ...missingSpeedReference,
      missing_inputs: [],
    };

    const result = gradeVoyageResponse(
      response,
      missingSpeedTask,
      missingSpeedReference,
    );

    expect(result.task_passed).toBe(false);
    expect(
      result.checks.find((check) => check.name === "missing_inputs")?.passed,
    ).toBe(false);
  });

  it("should correctly grade combined weather and port constraints (MB-08)", () => {
    const combinedTask = VoyageTaskSchema.parse({
      task_id: "MB-08",
      title: "Combined weather and port constraints",
      description:
        "Calculate physical and permitted arrival under combined constraints.",
      departure_time: "2026-10-15T08:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 180,
          speed_kn: 12,
        },
      ],
      weather_restrictions: [
        {
          start_time: "2026-10-15T12:00:00Z",
          end_time: "2026-10-15T16:00:00Z",
          restricted_speed_kn: 6,
        },
      ],
      port_window: {
        opens_at: "18:00",
        closes_at: "22:00",
      },
    });

    const combinedReference: VoyageResponse = {
      task_id: "MB-08",
      status: "completed",
      total_travel_hours: 17,
      physical_eta: "2026-10-16T01:00:00Z",
      permitted_arrival: "2026-10-16T18:00:00Z",
      waiting_hours: 17,
      deadline_feasible: null,
      missing_inputs: [],
      assumptions: [],
      explanation:
        "The vessel travels at reduced speed during the weather restriction and waits for the next port receiving window.",
    };

    const result = gradeVoyageResponse(
      { ...combinedReference },
      combinedTask,
      combinedReference,
    );

    expect(result.score).toBe(100);
    expect(result.task_passed).toBe(true);
    expect(result.valid_response).toBe(true);
  });

  it("should reject an incorrect permitted arrival for MB-08", () => {
    const combinedTask = VoyageTaskSchema.parse({
      task_id: "MB-08",
      title: "Combined weather and port constraints",
      description:
        "Calculate physical and permitted arrival under combined constraints.",
      departure_time: "2026-10-15T08:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 180,
          speed_kn: 12,
        },
      ],
      weather_restrictions: [
        {
          start_time: "2026-10-15T12:00:00Z",
          end_time: "2026-10-15T16:00:00Z",
          restricted_speed_kn: 6,
        },
      ],
      port_window: {
        opens_at: "18:00",
        closes_at: "22:00",
      },
    });

    const combinedReference: VoyageResponse = {
      task_id: "MB-08",
      status: "completed",
      total_travel_hours: 17,
      physical_eta: "2026-10-16T01:00:00Z",
      permitted_arrival: "2026-10-16T18:00:00Z",
      waiting_hours: 17,
      deadline_feasible: null,
      missing_inputs: [],
      assumptions: [],
      explanation: "The vessel waits for the next port receiving window.",
    };

    const response = {
      ...combinedReference,
      permitted_arrival: "2026-10-16T17:00:00Z",
    };

    const result = gradeVoyageResponse(
      response,
      combinedTask,
      combinedReference,
    );

    expect(result.task_passed).toBe(false);
    expect(
      result.checks.find((check) => check.name === "permitted_arrival")?.passed,
    ).toBe(false);
  });

  it("should reject an incorrect duration for a multi-leg voyage (MB-02)", () => {
    const multiLegTask = VoyageTaskSchema.parse({
      task_id: "MB-02",
      title: "Multi-leg voyage",
      description: "Calculate a voyage with two legs.",
      departure_time: "2026-10-15T06:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 120,
          speed_kn: 12,
        },
        {
          leg_id: "LEG-02",
          distance_nm: 240,
          speed_kn: 12,
        },
      ],
      weather_restrictions: [],
    });

    const multiLegReference: VoyageResponse = {
      task_id: "MB-02",
      status: "completed",
      total_travel_hours: 30,
      physical_eta: "2026-10-16T12:00:00Z",
      permitted_arrival: null,
      waiting_hours: null,
      deadline_feasible: null,
      missing_inputs: [],
      assumptions: [],
      explanation: "The two legs take 10 and 20 hours respectively.",
    };

    const response = {
      ...multiLegReference,
      total_travel_hours: 20,
    };

    const result = gradeVoyageResponse(
      response,
      multiLegTask,
      multiLegReference,
    );

    expect(result.task_passed).toBe(false);
    expect(
      result.checks.find((check) => check.name === "total_travel_hours")
        ?.passed,
    ).toBe(false);
  });

  it("should accept arrival exactly at the hard deadline", () => {
    const deadlineTask = VoyageTaskSchema.parse({
      task_id: "MB-06",
      title: "Hard deadline feasibility",
      description: "Determine whether the vessel can meet the deadline.",
      departure_time: "2026-10-15T06:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 240,
          speed_kn: 12,
        },
      ],
      weather_restrictions: [],
      deadline: "2026-10-16T02:00:00Z",
    });

    const deadlineReference: VoyageResponse = {
      task_id: "MB-06",
      status: "completed",
      total_travel_hours: 20,
      physical_eta: "2026-10-16T02:00:00Z",
      permitted_arrival: null,
      waiting_hours: null,
      deadline_feasible: true,
      missing_inputs: [],
      assumptions: [],
      explanation: "The vessel arrives exactly at the deadline.",
    };

    const result = gradeVoyageResponse(
      { ...deadlineReference },
      deadlineTask,
      deadlineReference,
    );

    expect(result.task_passed).toBe(true);
    expect(
      result.checks.find((check) => check.name === "deadline_feasible")?.passed,
    ).toBe(true);
  });

  it("should accept an infeasible result when arrival is after the hard deadline", () => {
    const deadlineTask = VoyageTaskSchema.parse({
      task_id: "MB-06",
      title: "Hard deadline feasibility",
      description: "Determine whether the vessel can meet the deadline.",
      departure_time: "2026-10-15T06:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 240,
          speed_kn: 12,
        },
      ],
      weather_restrictions: [],
      deadline: "2026-10-16T01:59:00Z",
    });

    const deadlineReference: VoyageResponse = {
      task_id: "MB-06",
      status: "completed",
      total_travel_hours: 20,
      physical_eta: "2026-10-16T02:00:00Z",
      permitted_arrival: null,
      waiting_hours: null,
      deadline_feasible: false,
      missing_inputs: [],
      assumptions: [],
      explanation: "The vessel arrives one minute after the deadline.",
    };

    const result = gradeVoyageResponse(
      { ...deadlineReference },
      deadlineTask,
      deadlineReference,
    );

    expect(result.task_passed).toBe(true);
    expect(
      result.checks.find((check) => check.name === "deadline_feasible")?.passed,
    ).toBe(true);
  });

  it("should accept a timestamp difference of exactly one minute", () => {
    const response = {
      ...reference,
      physical_eta: "2026-10-16T02:01:00Z",
    };

    const result = gradeVoyageResponse(response, task, reference);

    expect(result.task_passed).toBe(true);
  });

  it("should reject a timestamp difference of 61 seconds", () => {
    const response = {
      ...reference,
      physical_eta: "2026-10-16T02:01:01Z",
    };

    const result = gradeVoyageResponse(response, task, reference);

    expect(result.task_passed).toBe(false);
    expect(result.score).toBeLessThan(100);
  });

  it("should accept a waiting-time difference of exactly one minute", () => {
    const portTask = VoyageTaskSchema.parse({
      task_id: "MB-05",
      title: "Port waiting time",
      description: "Calculate port waiting time.",
      departure_time: "2026-10-15T08:00:00Z",
      legs: [{ leg_id: "LEG-01", distance_nm: 180, speed_kn: 12 }],
      weather_restrictions: [],
      port_window: {
        opens_at: "18:00",
        closes_at: "22:00",
      },
    });

    const portReference: VoyageResponse = {
      task_id: "MB-05",
      status: "completed",
      total_travel_hours: 15,
      physical_eta: "2026-10-15T23:00:00Z",
      permitted_arrival: "2026-10-16T18:00:00Z",
      waiting_hours: 19,
      deadline_feasible: null,
      missing_inputs: [],
      assumptions: [],
      explanation: "The vessel waits for the next receiving window.",
    };

    const response = {
      ...portReference,
      waiting_hours: 19 + 1 / 60,
    };

    const result = gradeVoyageResponse(response, portTask, portReference);

    expect(result.task_passed).toBe(true);
  });

  it("should reject a waiting-time difference greater than one minute", () => {
    const portTask = VoyageTaskSchema.parse({
      task_id: "MB-05",
      title: "Port waiting time",
      description: "Calculate port waiting time.",
      departure_time: "2026-10-15T08:00:00Z",
      legs: [{ leg_id: "LEG-01", distance_nm: 180, speed_kn: 12 }],
      weather_restrictions: [],
      port_window: {
        opens_at: "18:00",
        closes_at: "22:00",
      },
    });

    const portReference: VoyageResponse = {
      task_id: "MB-05",
      status: "completed",
      total_travel_hours: 15,
      physical_eta: "2026-10-15T23:00:00Z",
      permitted_arrival: "2026-10-16T18:00:00Z",
      waiting_hours: 19,
      deadline_feasible: null,
      missing_inputs: [],
      assumptions: [],
      explanation: "The vessel waits for the next receiving window.",
    };

    const response = {
      ...portReference,
      waiting_hours: 19 + 61 / 3600,
    };

    const result = gradeVoyageResponse(response, portTask, portReference);

    expect(result.task_passed).toBe(false);
  });
});
