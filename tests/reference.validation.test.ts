import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { VoyageTaskSchema } from "../src/schemas/task.schema";
import { VoyageResponseSchema } from "../src/schemas/response.schema";
import { calculateVoyage } from "../src/tasks/voyage.engine";

const taskIds = [
  "MB-01",
  "MB-02",
  "MB-03",
  "MB-04",
  "MB-05",
  "MB-06",
  "MB-07",
  "MB-08",
];

const taskDirectory = path.resolve("data/tasks");
const referenceDirectory = path.resolve("data/references");

describe("Reference calculation validation", () => {
  it.each(taskIds)("should match the reference answer for %s", (taskId) => {
    const taskFile = path.join(taskDirectory, `${taskId}.json`);
    const referenceFile = path.join(referenceDirectory, `${taskId}.json`);

    const taskData = JSON.parse(readFileSync(taskFile, "utf-8"));

    const referenceData = JSON.parse(readFileSync(referenceFile, "utf-8"));

    const task = VoyageTaskSchema.parse(taskData);
    const reference = VoyageResponseSchema.parse(referenceData);

    const result = calculateVoyage(task);

    expect(result.task_id).toBe(reference.task_id);
    expect(result.status).toBe(reference.status);

    if (reference.waiting_hours === null) {
      expect(result.waiting_hours).toBeNull();
    } else {
      expect(result.waiting_hours).toBeCloseTo(reference.waiting_hours, 2);
    }

    if (result.status === "insufficient_information") {
      expect(result.missing_inputs).toEqual(reference.missing_inputs);
      expect(result.physical_eta).toBeNull();
      return;
    }

    expect(result.total_travel_hours).toBeCloseTo(
      reference.total_travel_hours!,
      2,
    );

    expect(new Date(result.physical_eta!).getTime()).toBe(
      new Date(reference.physical_eta!).getTime(),
    );

    if (reference.permitted_arrival !== null) {
      expect(new Date(result.permitted_arrival!).getTime()).toBe(
        new Date(reference.permitted_arrival).getTime(),
      );
    } else {
      expect(result.permitted_arrival).toBeNull();
    }

    expect(result.deadline_feasible).toBe(reference.deadline_feasible);
  });
});
