import { describe, expect, it } from "vitest";
import { addHoursToDate, calculateTravelHours } from "../src/utils/time.utils";

describe("Time Utilities", () => {
  describe("calculateTravelHours", () => {
    it("should calculate travel time correctly", () => {
      expect(calculateTravelHours(240, 12)).toBe(20);
    });

    it("should calculate fractional travel hours", () => {
      expect(calculateTravelHours(100, 12)).toBeCloseTo(8.3333, 4);
    });

    it("should reject zero distance", () => {
      expect(() => calculateTravelHours(0, 12)).toThrow();
    });

    it("should reject zero speed", () => {
      expect(() => calculateTravelHours(240, 0)).toThrow();
    });
  });

  describe("addHoursToDate", () => {
    it("should calculate the correct arrival time", () => {
      expect(addHoursToDate("2026-10-15T06:00:00Z", 20)).toBe(
        "2026-10-16T02:00:00.000Z",
      );
    });

    it("should handle fractional hours", () => {
      expect(addHoursToDate("2026-10-15T06:00:00Z", 1.5)).toBe(
        "2026-10-15T07:30:00.000Z",
      );
    });
  });
});
