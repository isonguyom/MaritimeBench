import { describe, expect, it } from "vitest";
import { calculateDeadlineFeasibility } from "../src/utils/deadline.utils";

describe("calculateDeadlineFeasibility", () => {
  it("should mark an early arrival as feasible", () => {
    const result = calculateDeadlineFeasibility(
      "2026-10-16T00:00:00Z",
      "2026-10-16T01:00:00Z",
    );

    expect(result.deadline_feasible).toBe(true);
    expect(result.delay_hours).toBe(0);
  });

  it("should mark arrival exactly at the deadline as feasible", () => {
    const result = calculateDeadlineFeasibility(
      "2026-10-16T01:00:00Z",
      "2026-10-16T01:00:00Z",
    );

    expect(result.deadline_feasible).toBe(true);
    expect(result.delay_hours).toBe(0);
  });

  it("should mark late arrival as infeasible", () => {
    const result = calculateDeadlineFeasibility(
      "2026-10-16T02:00:00Z",
      "2026-10-16T01:00:00Z",
    );

    expect(result.deadline_feasible).toBe(false);
    expect(result.delay_hours).toBe(1);
  });

  it("should calculate fractional hours of delay", () => {
    const result = calculateDeadlineFeasibility(
      "2026-10-16T01:30:00Z",
      "2026-10-16T01:00:00Z",
    );

    expect(result.deadline_feasible).toBe(false);
    expect(result.delay_hours).toBe(0.5);
  });

  it("should reject invalid timestamps", () => {
    expect(() =>
      calculateDeadlineFeasibility("invalid-date", "2026-10-16T01:00:00Z"),
    ).toThrow("Invalid physical ETA or deadline.");
  });
});
