import { readFileSync } from "node:fs";
import path from "node:path";

import { VoyageTaskSchema, type VoyageTask } from "../schemas/task.schema";

import {
  VoyageResponseSchema,
  type VoyageResponse,
} from "../schemas/response.schema";

export interface EvaluationData {
  task: VoyageTask;
  reference: VoyageResponse;
}

export function loadEvaluationData(taskId: string): EvaluationData {
  if (!/^MB-\d{2}$/.test(taskId)) {
    throw new Error(`Invalid task ID: ${taskId}`);
  }

  const taskPath = path.resolve(
    process.cwd(),
    "data",
    "tasks",
    `${taskId}.json`,
  );

  const referencePath = path.resolve(
    process.cwd(),
    "data",
    "references",
    `${taskId}.json`,
  );

  let rawTask: unknown;
  let rawReference: unknown;

  try {
    rawTask = JSON.parse(readFileSync(taskPath, "utf-8"));
  } catch (error) {
    throw new Error(
      `Failed to load task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    rawReference = JSON.parse(readFileSync(referencePath, "utf-8"));
  } catch (error) {
    throw new Error(
      `Failed to load reference ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const taskResult = VoyageTaskSchema.safeParse(rawTask);

  if (!taskResult.success) {
    throw new Error(
      `Invalid task data for ${taskId}: ${JSON.stringify(taskResult.error.issues)}`,
    );
  }

  const referenceResult = VoyageResponseSchema.safeParse(rawReference);

  if (!referenceResult.success) {
    throw new Error(
      `Invalid reference data for ${taskId}: ${JSON.stringify(referenceResult.error.issues)}`,
    );
  }

  const task = taskResult.data;
  const reference = referenceResult.data;

  if (task.task_id !== reference.task_id) {
    throw new Error(
      `Task/reference mismatch: task "${task.task_id}" does not match reference "${reference.task_id}".`,
    );
  }

  return {
    task,
    reference,
  };
}
