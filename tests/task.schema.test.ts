import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { VoyageTaskSchema } from "../src/schemas/task.schema";

describe("VoyageTaskSchema", () => {
  it.each(["MB-01", "MB-02", "MB-03", "MB-04", "MB-05", "MB-06", "MB-07", "MB-08"])(
    "validates the %s benchmark task",
    (taskId) => {
      const filePath = `data/tasks/${taskId}.json`;
      const fileContent = readFileSync(filePath, "utf-8");
      const task = JSON.parse(fileContent);

      const result = VoyageTaskSchema.safeParse(task);

      expect(result.success).toBe(true);
    },
  );
});