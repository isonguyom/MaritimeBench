import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  InvalidVoyageTaskSchema,
  VoyageTaskSchema,
} from "../src/schemas/task.schema";

describe("VoyageTaskSchema", () => {
  const validTask = JSON.parse(readFileSync("data/tasks/MB-03.json", "utf-8"));

  function createValidTask() {
    return structuredClone(validTask);
  }

  function createValidPortTask() {
    return JSON.parse(readFileSync("data/tasks/MB-04.json", "utf-8"));
  }

  it.each([
    "MB-01",
    "MB-02",
    "MB-03",
    "MB-04",
    "MB-05",
    "MB-06",
    "MB-07",
    "MB-08",
  ])("validates the %s benchmark task", (taskId) => {
    const fileContent = readFileSync(`data/tasks/${taskId}.json`, "utf-8");
    const task = JSON.parse(fileContent);

    expect(VoyageTaskSchema.safeParse(task).success).toBe(true);
  });

  describe("title and description", () => {
    it.each(["", " ", "   ", "\t", "\n"])(
      "should reject an empty or whitespace-only title: %j",
      (title) => {
        const task = createValidTask();
        task.title = title;

        expect(VoyageTaskSchema.safeParse(task).success).toBe(false);
      },
    );

    it("should accept an empty description", () => {
      const task = createValidTask();
      task.description = "";

      expect(VoyageTaskSchema.safeParse(task).success).toBe(true);
    });

    it.each([" ", "   ", "\t", "\n"])(
      "should reject a whitespace-only description: %j",
      (description) => {
        const task = createValidTask();
        task.description = description;

        expect(VoyageTaskSchema.safeParse(task).success).toBe(false);
      },
    );
  });

  describe("voyage legs", () => {
    it.each([0, -1, -10])(
      "should reject a non-positive distance: %s",
      (distance) => {
        const task = createValidTask();
        task.legs[0].distance_nm = distance;

        expect(VoyageTaskSchema.safeParse(task).success).toBe(false);
      },
    );

    it.each([0, -1, -10])(
      "should reject a non-positive vessel speed: %s",
      (speed) => {
        const task = createValidTask();
        task.legs[0].speed_kn = speed;

        expect(VoyageTaskSchema.safeParse(task).success).toBe(false);
      },
    );

    it("should accept a leg without an optional vessel speed", () => {
      const task = createValidTask();
      delete task.legs[0].speed_kn;

      expect(VoyageTaskSchema.safeParse(task).success).toBe(true);
    });

    it("should reject an empty legs array", () => {
      const task = createValidTask();
      task.legs = [];

      expect(VoyageTaskSchema.safeParse(task).success).toBe(false);
    });
  });

  describe("weather restrictions", () => {
    it("should accept an empty weather restrictions array", () => {
      const task = createValidTask();
      task.weather_restrictions = [];

      expect(VoyageTaskSchema.safeParse(task).success).toBe(true);
    });

    it.each(["2026-10-16T10:00:00Z", "2026-10-16T09:00:00Z"])(
      "should reject a weather restriction ending at or before its start: %s",
      (endTime) => {
        const task = createValidTask();

        task.weather_restrictions[0].start_time = "2026-10-16T10:00:00Z";
        task.weather_restrictions[0].end_time = endTime;

        expect(VoyageTaskSchema.safeParse(task).success).toBe(false);
      },
    );

    it("should reject a non-positive restricted speed", () => {
      const task = createValidTask();
      task.weather_restrictions[0].restricted_speed_kn = 0;

      expect(VoyageTaskSchema.safeParse(task).success).toBe(false);
    });
  });

  describe("port window", () => {
    it.each(["24:00", "25:90", "12:60", "8:30"])(
      "should reject an invalid opening time: %s",
      (opensAt) => {
        const task = createValidPortTask();
        task.port_window.opens_at = opensAt;

        expect(VoyageTaskSchema.safeParse(task).success).toBe(false);
      },
    );

    it.each(["24:00", "25:90", "12:60", "8:30"])(
      "should reject an invalid closing time: %s",
      (closesAt) => {
        const task = createValidPortTask();
        task.port_window.closes_at = closesAt;

        expect(VoyageTaskSchema.safeParse(task).success).toBe(false);
      },
    );

    it("should accept a task without an optional port window", () => {
      const task = createValidTask();
      delete task.port_window;

      expect(VoyageTaskSchema.safeParse(task).success).toBe(true);
    });
  });

  describe("optional deadline", () => {
    it("should accept a task without an optional deadline", () => {
      const task = createValidTask();
      delete task.deadline;

      expect(VoyageTaskSchema.safeParse(task).success).toBe(true);
    });
  });

  describe("timestamps", () => {
    const timestampFields = [
      "departure_time",
      "deadline",
      "weather_start",
      "weather_end",
    ] as const;

    type TimestampField = (typeof timestampFields)[number];

    function createTaskWithTimestamp(field: TimestampField, value: string) {
      const task = createValidTask();

      switch (field) {
        case "departure_time":
        case "deadline":
          task[field] = value;
          break;
        case "weather_start":
          task.weather_restrictions[0].start_time = value;
          break;
        case "weather_end":
          task.weather_restrictions[0].end_time = value;
          break;
      }

      return task;
    }

    it.each([
      ["departure_time", "2026-10-16T02:00:00Z"],
      ["deadline", "2026-10-16T02:00:00Z"],
      ["weather_start", "2026-10-15T13:00:00Z"],
      ["weather_end", "2026-10-15T17:00:00Z"],
    ] as const)(
      "should accept a valid UTC timestamp for %s",
      (field, value) => {
        const task = createTaskWithTimestamp(field, value);

        expect(VoyageTaskSchema.safeParse(task).success).toBe(true);
      },
    );

    it.each(timestampFields)(
      "should reject a non-UTC offset for %s",
      (field) => {
        const task = createTaskWithTimestamp(
          field,
          "2026-10-16T02:00:00+01:00",
        );

        expect(VoyageTaskSchema.safeParse(task).success).toBe(false);
      },
    );

    it.each(timestampFields)(
      "should reject an invalid calendar date for %s",
      (field) => {
        const task = createTaskWithTimestamp(field, "2026-02-30T02:00:00Z");

        expect(VoyageTaskSchema.safeParse(task).success).toBe(false);
      },
    );

    it.each(timestampFields)(
      "should reject a malformed timestamp for %s",
      (field) => {
        const task = createTaskWithTimestamp(field, "not-a-date");

        expect(VoyageTaskSchema.safeParse(task).success).toBe(false);
      },
    );
  });
});

describe("InvalidVoyageTaskSchema", () => {
  const invalidTask = JSON.parse(
    readFileSync("data/tasks/MB-09.json", "utf-8"),
  );

  it("should accept the MB-09 task containing multiple invalid inputs", () => {
    expect(InvalidVoyageTaskSchema.safeParse(invalidTask).success).toBe(true);
  });

  it("should accept a zero vessel speed for invalid-input evaluation", () => {
    const task = structuredClone(invalidTask);
    task.legs[0].speed_kn = 0;

    expect(InvalidVoyageTaskSchema.safeParse(task).success).toBe(true);
  });

  it("should accept a weather restriction ending before it starts", () => {
    const task = structuredClone(invalidTask);
    task.weather_restrictions[0].end_time = "2026-10-15T18:00:00Z";

    expect(InvalidVoyageTaskSchema.safeParse(task).success).toBe(true);
  });

  it("should still reject a non-positive distance", () => {
    const task = structuredClone(invalidTask);
    task.legs[0].distance_nm = 0;

    expect(InvalidVoyageTaskSchema.safeParse(task).success).toBe(false);
  });

  it("should still reject a non-positive restricted speed", () => {
    const task = structuredClone(invalidTask);
    task.weather_restrictions[0].restricted_speed_kn = 0;

    expect(InvalidVoyageTaskSchema.safeParse(task).success).toBe(false);
  });
});
