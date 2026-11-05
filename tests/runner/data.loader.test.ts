import { describe, expect, it } from "vitest";
import { loadEvaluationData } from "../../src/runner/data.loader";

describe("loadEvaluationData", () => {
  it("should load and validate MB-01 task and reference", () => {
    const result = loadEvaluationData("MB-01");

    expect(result.task.task_id).toBe("MB-01");
    expect(result.reference.task_id).toBe("MB-01");

    expect(result.task.legs[0].distance_nm).toBe(240);
    expect(result.reference.total_travel_hours).toBe(20);
  });

  it("should reject an invalid task ID format", () => {
    expect(() => loadEvaluationData("INVALID")).toThrow(
      "Invalid task ID: INVALID",
    );
  });

  it("should reject a task ID whose files do not exist", () => {
    expect(() => loadEvaluationData("MB-99")).toThrow(
      "Failed to load task MB-99",
    );
  });

  it("should load all eight benchmark tasks and matching references", () => {
    for (let number = 1; number <= 8; number++) {
      const taskId = `MB-${String(number).padStart(2, "0")}`;
      const result = loadEvaluationData(taskId);

      expect(result.task.task_id).toBe(taskId);
      expect(result.reference.task_id).toBe(taskId);
    }
  });
});
