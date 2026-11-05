import type { VoyageResponse } from "../schemas/response.schema";

const mockResponses: Record<string, VoyageResponse> = {
  "MB-01": {
    task_id: "MB-01",
    status: "completed",
    total_travel_hours: 20,
    physical_eta: "2026-10-16T02:00:00Z",
    permitted_arrival: null,
    waiting_hours: null,
    deadline_feasible: null,
    missing_inputs: [],
    assumptions: [],
    explanation:
      "The vessel travels 240 nautical miles at 12 knots. Travel time is 240 / 12 = 20 hours.",
  },

  "MB-02": {
    task_id: "MB-02",
    status: "completed",
    total_travel_hours: 30,
    physical_eta: "2026-10-16T12:00:00Z",
    permitted_arrival: null,
    waiting_hours: null,
    deadline_feasible: null,
    missing_inputs: [],
    assumptions: [],
    explanation:
      "LEG-01 takes 120 / 12 = 10 hours. LEG-02 takes 240 / 12 = 20 hours. Total travel time is 30 hours.",
  },

  "MB-03": {
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
      "The vessel travels 48 nautical miles at 12 knots before the restriction, 24 nautical miles at 6 knots during the restriction, and the remaining 108 nautical miles at 12 knots. Total travel time is 17 hours.",
  },

  "MB-04": {
    task_id: "MB-04",
    status: "completed",
    total_travel_hours: 12,
    physical_eta: "2026-10-15T20:00:00Z",
    permitted_arrival: "2026-10-15T20:00:00Z",
    waiting_hours: 0,
    deadline_feasible: null,
    missing_inputs: [],
    assumptions: [],
    explanation:
      "The vessel travels 120 nautical miles at 10 knots, taking 12 hours. Arrival at 20:00 UTC falls within the inclusive port window of 18:00 to 22:00 UTC.",
  },

  "MB-05": {
    task_id: "MB-05",
    status: "completed",
    total_travel_hours: 15,
    physical_eta: "2026-10-15T23:00:00Z",
    permitted_arrival: "2026-10-16T18:00:00Z",
    waiting_hours: 19,
    deadline_feasible: null,
    missing_inputs: [],
    assumptions: [],
    explanation:
      "The vessel travels 180 nautical miles at 12 knots, taking 15 hours. It misses the port window closing at 22:00 UTC and must wait until the next opening at 18:00 UTC. Waiting time is 19 hours.",
  },

  "MB-06": {
    task_id: "MB-06",
    status: "completed",
    total_travel_hours: 20,
    physical_eta: "2026-10-16T02:00:00Z",
    permitted_arrival: null,
    waiting_hours: null,
    deadline_feasible: false,
    missing_inputs: [],
    assumptions: [],
    explanation:
      "The vessel travels 240 nautical miles at 12 knots, taking 20 hours. Its physical ETA is 02:00 UTC, one hour after the 01:00 UTC hard deadline. The deadline is infeasible.",
  },

  "MB-07": {
    task_id: "MB-07",
    status: "insufficient_information",
    total_travel_hours: null,
    physical_eta: null,
    permitted_arrival: null,
    waiting_hours: null,
    deadline_feasible: null,
    missing_inputs: ["vessel_speed"],
    assumptions: [],
    explanation:
      "The vessel speed is missing. Travel duration and physical ETA cannot be calculated without it. Clarification is required.",
  },

  "MB-08": {
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
      "The vessel travels 48 nautical miles at 12 knots before the restriction, 24 nautical miles at 6 knots during the restriction, and the remaining 108 nautical miles at 12 knots. Physical ETA is 01:00 UTC. Since this falls outside the port's receiving window, the vessel waits until 18:00 UTC, resulting in 17 hours of waiting.",
  },
};

export function getMockResponse(taskId: string): string {
  const response = mockResponses[taskId];

  if (!response) {
    throw new Error(`No mock response configured for task ${taskId}.`);
  }

  return JSON.stringify(response);
}
