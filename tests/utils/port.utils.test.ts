import { describe, expect, it } from "vitest";
import { calculatePortArrival } from "../../src/utils/port.utils";

describe("calculatePortArrival", () => {
  const window = {
    opens_at: "18:00",
    closes_at: "22:00",
  };

  it("should allow arrival within the receiving window", () => {
    const result = calculatePortArrival("2026-10-15T20:00:00Z", window);

    expect(result.permitted_arrival).toBe("2026-10-15T20:00:00.000Z");
    expect(result.waiting_hours).toBe(0);
  });

  it("should wait until the next opening when arrival is after closing", () => {
    const result = calculatePortArrival("2026-10-15T23:00:00Z", window);

    expect(result.permitted_arrival).toBe("2026-10-16T18:00:00.000Z");
    expect(result.waiting_hours).toBe(19);
  });

  it("should wait until opening when arrival is before the window", () => {
    const result = calculatePortArrival("2026-10-15T16:00:00Z", window);

    expect(result.permitted_arrival).toBe("2026-10-15T18:00:00.000Z");
    expect(result.waiting_hours).toBe(2);
  });

  it("should accept arrival exactly at opening", () => {
    const result = calculatePortArrival("2026-10-15T18:00:00Z", window);

    expect(result.waiting_hours).toBe(0);
  });

  it("should accept arrival exactly at closing", () => {
    const result = calculatePortArrival("2026-10-15T22:00:00Z", window);

    expect(result.waiting_hours).toBe(0);
  });

  it("should wait until the next opening one minute after closing", () => {
    const result = calculatePortArrival("2026-10-15T22:01:00Z", window);

    expect(result.permitted_arrival).toBe("2026-10-16T18:00:00.000Z");
    expect(result.waiting_hours).toBe(19 + 59 / 60);
  });

  it("should reject an invalid receiving-window time", () => {
    expect(() =>
      calculatePortArrival("2026-10-15T20:00:00Z", {
        opens_at: "25:00",
        closes_at: "22:00",
      }),
    ).toThrow("Invalid port receiving window.");
  });

  it("should reject overnight receiving windows", () => {
    expect(() =>
      calculatePortArrival("2026-10-15T20:00:00Z", {
        opens_at: "22:00",
        closes_at: "06:00",
      }),
    ).toThrow("Overnight port windows are not supported.");
  });
});

describe("calculatePortArrival - closing-time precision", () => {
  const window = {
    opens_at: "18:00",
    closes_at: "22:00",
  };

  it.each(["2026-10-15T22:00:00.001Z", "2026-10-15T22:00:30Z"])(
    "should wait until the next opening when arrival is after closing: %s",
    (eta) => {
      const result = calculatePortArrival(eta, window);

      expect(result.permitted_arrival).toBe("2026-10-16T18:00:00.000Z");
      expect(result.waiting_hours).toBeGreaterThan(0);
    },
  );
});
