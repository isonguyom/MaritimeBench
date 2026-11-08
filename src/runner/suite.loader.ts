import { readdirSync } from "node:fs";
import path from "node:path";

import { loadEvaluationData } from "./data.loader";

const TASK_ID_PATTERN = /^MB-\d{2}$/;

export function discoverEvaluationTasks(): string[] {
  const tasksDirectory = path.resolve(process.cwd(), "data", "tasks");

  const taskIds = readdirSync(tasksDirectory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".json") &&
        TASK_ID_PATTERN.test(entry.name.slice(0, -5)),
    )
    .map((entry) => entry.name.slice(0, -5))
    .sort();

  if (taskIds.length === 0) {
    throw new Error("No valid evaluation tasks found in data/tasks.");
  }

  for (const taskId of taskIds) {
    try {
      loadEvaluationData(taskId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Suite validation failed for ${taskId}: ${message}`);
    }
  }

  return taskIds;
}
