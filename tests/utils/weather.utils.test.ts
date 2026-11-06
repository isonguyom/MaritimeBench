import { describe, expect, it } from "vitest";
import { calculateWeatherRestrictedVoyage } from "../../src/utils/weather.utils";

describe("Weather Restricted Voyage", () => {
  const restriction = {
    start_time: "2026-10-15T12:00:00Z",
    end_time: "2026-10-15T16:00:00Z",
    restricted_speed_kn: 6,
  };

  it("should calculate MB-03 correctly", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T08:00:00Z",
      180,
      12,
      restriction,
    );

    expect(result.total_travel_hours).toBe(17);
    expect(result.arrival_time).toBe("2026-10-16T01:00:00.000Z");
    expect(result.normal_distance_nm).toBe(156);
    expect(result.restricted_distance_nm).toBe(24);
  });

  it("should apply restricted speed when departure equals restriction start", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T12:00:00Z",
      60,
      12,
      restriction,
    );

    expect(result.restricted_distance_nm).toBe(24);
    expect(result.normal_distance_nm).toBe(36);
    expect(result.total_travel_hours).toBe(7);
  });

  it("should not apply restriction if vessel arrives exactly when it starts", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T08:00:00Z",
      48,
      12,
      restriction,
    );

    expect(result.arrival_time).toBe("2026-10-15T12:00:00.000Z");
    expect(result.restricted_distance_nm).toBe(0);
    expect(result.total_travel_hours).toBe(4);
  });

  it("should resume normal speed when restriction ends", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T12:00:00Z",
      48,
      12,
      restriction,
    );

    expect(result.restricted_distance_nm).toBe(24);
    expect(result.normal_distance_nm).toBe(24);
    expect(result.total_travel_hours).toBe(6);
  });

  it("should reject an invalid restriction period", () => {
    expect(() =>
      calculateWeatherRestrictedVoyage("2026-10-15T08:00:00Z", 180, 12, {
        start_time: "2026-10-15T16:00:00Z",
        end_time: "2026-10-15T12:00:00Z",
        restricted_speed_kn: 6,
      }),
    ).toThrow();
  });
});
