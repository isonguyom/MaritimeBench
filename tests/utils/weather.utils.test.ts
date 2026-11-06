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
      [{ distance_nm: 180, speed_kn: 12 }],
      [restriction],
    );

    expect(result.total_travel_hours).toBe(17);
    expect(result.arrival_time).toBe("2026-10-16T01:00:00.000Z");
    expect(result.normal_distance_nm).toBe(156);
    expect(result.restricted_distance_nm).toBe(24);
  });

  it("should apply restricted speed when departure equals restriction start", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T12:00:00Z",
      [{ distance_nm: 60, speed_kn: 12 }],
      [restriction],
    );

    expect(result.restricted_distance_nm).toBe(24);
    expect(result.normal_distance_nm).toBe(36);
    expect(result.total_travel_hours).toBe(7);
  });

  it("should not apply restriction if vessel arrives exactly when it starts", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T08:00:00Z",
      [{ distance_nm: 48, speed_kn: 12 }],
      [restriction],
    );

    expect(result.arrival_time).toBe("2026-10-15T12:00:00.000Z");
    expect(result.restricted_distance_nm).toBe(0);
    expect(result.total_travel_hours).toBe(4);
  });

  it("should resume normal speed when restriction ends", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T12:00:00Z",
      [{ distance_nm: 48, speed_kn: 12 }],
      [restriction],
    );

    expect(result.restricted_distance_nm).toBe(24);
    expect(result.normal_distance_nm).toBe(24);
    expect(result.total_travel_hours).toBe(6);
  });

  it("should apply multiple sequential weather restrictions", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T08:00:00Z",
      [{ distance_nm: 180, speed_kn: 12 }],
      [
        {
          start_time: "2026-10-15T12:00:00Z",
          end_time: "2026-10-15T14:00:00Z",
          restricted_speed_kn: 6,
        },
        {
          start_time: "2026-10-15T14:00:00Z",
          end_time: "2026-10-15T16:00:00Z",
          restricted_speed_kn: 4,
        },
      ],
    );

    expect(result.normal_distance_nm).toBe(160);
    expect(result.restricted_distance_nm).toBe(20);
    expect(result.total_travel_hours).toBeCloseTo(17.3333333333);
    expect(result.arrival_time).toBe("2026-10-16T01:20:00.000Z");
  });

  it("should use the lowest speed when weather restrictions overlap", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T08:00:00Z",
      [{ distance_nm: 180, speed_kn: 12 }],
      [
        {
          start_time: "2026-10-15T12:00:00Z",
          end_time: "2026-10-15T16:00:00Z",
          restricted_speed_kn: 8,
        },
        {
          start_time: "2026-10-15T14:00:00Z",
          end_time: "2026-10-15T18:00:00Z",
          restricted_speed_kn: 4,
        },
      ],
    );

    expect(result.normal_distance_nm).toBe(148);
    expect(result.restricted_distance_nm).toBe(32);
    expect(result.total_travel_hours).toBeCloseTo(18.3333333333);
    expect(result.arrival_time).toBe("2026-10-16T02:20:00.000Z");
  });

  it("should continue an active restriction across a voyage leg boundary", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T08:00:00Z",
      [
        { distance_nm: 120, speed_kn: 12 },
        { distance_nm: 120, speed_kn: 10 },
      ],
      [
        {
          start_time: "2026-10-15T16:00:00Z",
          end_time: "2026-10-15T22:00:00Z",
          restricted_speed_kn: 6,
        },
      ],
    );

    expect(result.normal_distance_nm).toBe(204);
    expect(result.restricted_distance_nm).toBe(36);
    expect(result.total_travel_hours).toBe(24.8);
    expect(result.arrival_time).toBe("2026-10-16T08:48:00.000Z");
  });

  it("should not allow a restriction to increase the normal leg speed", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T08:00:00Z",
      [{ distance_nm: 120, speed_kn: 10 }],
      [
        {
          start_time: "2026-10-15T08:00:00Z",
          end_time: "2026-10-15T12:00:00Z",
          restricted_speed_kn: 15,
        },
      ],
    );

    expect(result.normal_distance_nm).toBe(120);
    expect(result.restricted_distance_nm).toBe(0);
    expect(result.total_travel_hours).toBe(12);
    expect(result.arrival_time).toBe("2026-10-15T20:00:00.000Z");
  });

  it("should apply a restriction when it starts exactly at a leg boundary", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T08:00:00Z",
      [
        { distance_nm: 96, speed_kn: 12 },
        { distance_nm: 60, speed_kn: 10 },
      ],
      [
        {
          start_time: "2026-10-15T16:00:00Z",
          end_time: "2026-10-15T20:00:00Z",
          restricted_speed_kn: 5,
        },
      ],
    );

    expect(result.normal_distance_nm).toBe(136);
    expect(result.restricted_distance_nm).toBe(20);
    expect(result.total_travel_hours).toBe(16);
    expect(result.arrival_time).toBe("2026-10-16T00:00:00.000Z");
  });

  it("should resume normal speed when a restriction ends exactly at a leg boundary", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T08:00:00Z",
      [
        { distance_nm: 68, speed_kn: 12 },
        { distance_nm: 60, speed_kn: 10 },
      ],
      [
        {
          start_time: "2026-10-15T12:00:00Z",
          end_time: "2026-10-15T16:00:00Z",
          restricted_speed_kn: 5,
        },
      ],
    );

    expect(result.normal_distance_nm).toBe(108);
    expect(result.restricted_distance_nm).toBe(20);
    expect(result.total_travel_hours).toBe(14);
    expect(result.arrival_time).toBe("2026-10-15T22:00:00.000Z");
  });

  it("should ignore weather restrictions outside the voyage period", () => {
    const result = calculateWeatherRestrictedVoyage(
      "2026-10-15T08:00:00Z",
      [{ distance_nm: 120, speed_kn: 12 }],
      [
        {
          start_time: "2026-10-15T01:00:00Z",
          end_time: "2026-10-15T07:00:00Z",
          restricted_speed_kn: 5,
        },
        {
          start_time: "2026-10-15T20:00:00Z",
          end_time: "2026-10-15T22:00:00Z",
          restricted_speed_kn: 4,
        },
      ],
    );

    expect(result.normal_distance_nm).toBe(120);
    expect(result.restricted_distance_nm).toBe(0);
    expect(result.total_travel_hours).toBe(10);
    expect(result.arrival_time).toBe("2026-10-15T18:00:00.000Z");
  });

  it("should reject a non-array weather restrictions argument", () => {
    expect(() =>
      calculateWeatherRestrictedVoyage(
        "2026-10-15T08:00:00Z",
        [{ distance_nm: 120, speed_kn: 12 }],
        null as never,
      ),
    ).toThrow("Weather restrictions must be an array.");
  });

  it("should reject an invalid restriction period", () => {
    expect(() =>
      calculateWeatherRestrictedVoyage(
        "2026-10-15T08:00:00Z",
        [{ distance_nm: 180, speed_kn: 12 }],
        [
          {
            start_time: "2026-10-15T16:00:00Z",
            end_time: "2026-10-15T12:00:00Z",
            restricted_speed_kn: 6,
          },
        ],
      ),
    ).toThrow();
  });

  it("should reject invalid leg distance and speed", () => {
    expect(() =>
      calculateWeatherRestrictedVoyage(
        "2026-10-15T08:00:00Z",
        [{ distance_nm: 0, speed_kn: 12 }],
        [],
      ),
    ).toThrow();

    expect(() =>
      calculateWeatherRestrictedVoyage(
        "2026-10-15T08:00:00Z",
        [{ distance_nm: 100, speed_kn: Number.POSITIVE_INFINITY }],
        [],
      ),
    ).toThrow();
  });
});
