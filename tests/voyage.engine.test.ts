import { describe, expect, it } from "vitest";
import { calculateVoyage } from "../src/tasks/voyage.engine";
import type { VoyageTask } from "../src/schemas/task.schema";

describe("calculateVoyage", () => {
  const baselineTask: VoyageTask = {
    task_id: "MB-01",
    title: "Baseline ETA",
    description: "Calculate the physical ETA for a single voyage leg.",
    departure_time: "2026-10-15T06:00:00Z",
    legs: [
      {
        leg_id: "LEG-01",
        distance_nm: 240,
        speed_kn: 12,
      },
    ],
    weather_restrictions: [],
  };

  it("should calculate the correct ETA for MB-01", () => {
    const result = calculateVoyage(baselineTask);

    expect(result.task_id).toBe("MB-01");
    expect(result.total_travel_hours).toBe(20);
    expect(result.physical_eta).toBe("2026-10-16T02:00:00.000Z");
  });

  it("should calculate the total duration of a multi-leg voyage", () => {
    const multiLegTask: VoyageTask = {
      ...baselineTask,
      task_id: "MB-02",
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
    };

    const result = calculateVoyage(multiLegTask);

    expect(result.total_travel_hours).toBe(30);
    expect(result.physical_eta).toBe("2026-10-16T12:00:00.000Z");
  });

  it("should return insufficient information when a voyage leg has missing speed", () => {
    const incompleteTask: VoyageTask = {
      ...baselineTask,
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 240,
        },
      ],
    };

    const result = calculateVoyage(incompleteTask);

    expect(result.status).toBe("insufficient_information");
    expect(result.total_travel_hours).toBeNull();
    expect(result.physical_eta).toBeNull();
    expect(result.missing_inputs).toContain("vessel_speed");
  });

  it("should calculate MB-03 with a weather speed restriction", () => {
    const weatherTask: VoyageTask = {
      task_id: "MB-03",
      title: "Weather Speed Restriction",
      description: "Calculate ETA with a temporary weather speed restriction.",
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
    };

    const result = calculateVoyage(weatherTask);

    expect(result.task_id).toBe("MB-03");
    expect(result.total_travel_hours).toBe(17);
    expect(result.physical_eta).toBe("2026-10-16T01:00:00.000Z");
  });

  it("should calculate MB-04 with an arrival inside the port window", () => {
    const portTask: VoyageTask = {
      task_id: "MB-04",
      title: "Port Arrival Window",
      description: "Calculate arrival within the port receiving window.",
      departure_time: "2026-10-15T08:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 120,
          speed_kn: 10,
        },
      ],
      weather_restrictions: [],
      port_window: {
        opens_at: "18:00",
        closes_at: "22:00",
      },
    };

    const result = calculateVoyage(portTask);

    expect(result.total_travel_hours).toBe(12);
    expect(result.physical_eta).toBe("2026-10-15T20:00:00.000Z");
    expect(result.permitted_arrival).toBe("2026-10-15T20:00:00.000Z");
    expect(result.waiting_hours).toBe(0);
  });

  it("should calculate MB-05 with waiting until the next port window", () => {
    const portTask: VoyageTask = {
      task_id: "MB-05",
      title: "Port Waiting Time",
      description: "Calculate waiting time after missing the port window.",
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
    };

    const result = calculateVoyage(portTask);

    expect(result.total_travel_hours).toBe(15);
    expect(result.physical_eta).toBe("2026-10-15T23:00:00.000Z");
    expect(result.permitted_arrival).toBe("2026-10-16T18:00:00.000Z");
    expect(result.waiting_hours).toBe(19);
  });

  it("should calculate MB-08 with combined weather and port constraints", () => {
    const combinedTask: VoyageTask = {
      task_id: "MB-08",
      title: "Combined Weather and Port Constraints",
      description:
        "Calculate a voyage with weather restrictions and a port receiving window.",
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
    };

    const result = calculateVoyage(combinedTask);

    expect(result.task_id).toBe("MB-08");
    expect(result.total_travel_hours).toBe(17);
    expect(result.physical_eta).toBe("2026-10-16T01:00:00.000Z");
    expect(result.permitted_arrival).toBe("2026-10-16T18:00:00.000Z");
    expect(result.waiting_hours).toBe(17);
  });

  it("should calculate MB-06 and identify an infeasible deadline", () => {
    const deadlineTask: VoyageTask = {
      task_id: "MB-06",
      title: "Hard Deadline Feasibility",
      description:
        "Determine whether the vessel can meet its arrival deadline.",
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
    };

    const result = calculateVoyage(deadlineTask);

    expect(result.task_id).toBe("MB-06");
    expect(result.total_travel_hours).toBe(20);
    expect(result.physical_eta).toBe("2026-10-16T02:00:00.000Z");
    expect(result.deadline_feasible).toBe(false);
    expect(result.deadline_delay_hours).toBe(1);
  });

  it("should return insufficient information for MB-07", () => {
    const incompleteTask: VoyageTask = {
      task_id: "MB-07",
      title: "Missing Required Information",
      description: "Calculate a voyage with missing vessel speed.",
      departure_time: "2026-10-15T06:00:00Z",
      legs: [
        {
          leg_id: "LEG-01",
          distance_nm: 240,
        },
      ],
      weather_restrictions: [],
    };

    const result = calculateVoyage(incompleteTask);

    expect(result.task_id).toBe("MB-07");
    expect(result.status).toBe("insufficient_information");
    expect(result.total_travel_hours).toBeNull();
    expect(result.physical_eta).toBeNull();
    expect(result.permitted_arrival).toBeNull();
    expect(result.waiting_hours).toBeNull();
    expect(result.deadline_feasible).toBeNull();
    expect(result.missing_inputs).toContain("vessel_speed");
  });
});
