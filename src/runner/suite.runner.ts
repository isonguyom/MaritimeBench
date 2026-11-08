import { generateRunId } from "../utils/run-id.utils";

import type { ModelAdapter } from "../adapters/model.adapter";
import {
  runEvaluation,
  type EvaluationRunOptions,
  type EvaluationRunResult,
} from "./evaluation.runner";
import type { MultiTrialResult } from "./multi-trial.runner";
import {
  createRunManifest,
  updateRunManifest,
  type RunManifest,
  type TaskManifestRecord,
  type TrialManifestRecord,
} from "./run-manifest.storage";
import {
  classifyTrialError,
  ModelRequestError,
} from "./trial-error.classifier";

export interface SuiteRunOptions extends EvaluationRunOptions {
  trials: number;
}

export interface SuiteRunResult {
  run_id: string;
  total_tasks: number;
  total_trials: number;
  task_results: MultiTrialResult[];
  results: EvaluationRunResult[];
  status: RunManifest["status"];
  manifest_path: string;
  fatal_error?: string;
}

function updateTotals(manifest: RunManifest): void {
  const trials = manifest.tasks.flatMap((task) => task.trials);

  manifest.totals = {
    planned_trials: trials.length,
    completed_trials: trials.filter((trial) => trial.status === "completed")
      .length,
    failed_trials: trials.filter((trial) => trial.status === "failed").length,
    not_started_trials: trials.filter((trial) => trial.status === "not_started")
      .length,
    running_trials: trials.filter((trial) => trial.status === "running").length,
    pending_trials: trials.filter((trial) => trial.status === "pending").length,
  };
}

function updateTaskStatuses(manifest: RunManifest): void {
  for (const task of manifest.tasks) {
    const statuses = task.trials.map((trial) => trial.status);

    if (statuses.every((status) => status === "not_started")) {
      task.status = "not_started";
    } else if (statuses.some((status) => status === "running")) {
      task.status = "running";
    } else if (statuses.every((status) => status === "completed")) {
      task.status = "completed";
    } else if (statuses.some((status) => status === "failed")) {
      task.status =
        statuses.some((status) => status === "not_started") ||
        statuses.some((status) => status === "pending")
          ? "failed"
          : "completed_with_failures";
    } else {
      task.status = "pending";
    }
  }
}

function persistManifest(manifest: RunManifest): void {
  updateTotals(manifest);
  updateTaskStatuses(manifest);
  updateRunManifest(manifest);
}

function markRemainingTrialsNotStarted(
  manifest: RunManifest,
  currentTaskIndex: number,
  currentTrialNumber: number,
): void {
  manifest.tasks.forEach((task, taskIndex) => {
    task.trials.forEach((trial) => {
      const isCurrentOrFuture =
        taskIndex > currentTaskIndex ||
        (taskIndex === currentTaskIndex &&
          trial.trial_number > currentTrialNumber);

      if (isCurrentOrFuture && trial.status === "pending") {
        trial.status = "not_started";
      }
    });
  });
}

function buildTaskResults(
  taskIds: string[],
  runId: string,
  results: EvaluationRunResult[],
): MultiTrialResult[] {
  return taskIds.map((taskId) => {
    const taskResults = results.filter((result) => result.task_id === taskId);

    return {
      run_id: runId,
      task_id: taskId,
      total_trials: taskResults.length,
      results: taskResults,
    };
  });
}

export async function runEvaluationSuite(
  taskIds: string[],
  adapter: ModelAdapter,
  options: SuiteRunOptions,
): Promise<SuiteRunResult> {
  if (taskIds.length === 0) {
    throw new Error("Cannot run an evaluation suite with no tasks.");
  }

  if (new Set(taskIds).size !== taskIds.length) {
    throw new Error("Evaluation suite contains duplicate task IDs.");
  }

  if (!Number.isInteger(options.trials) || options.trials < 1) {
    throw new Error("Number of trials must be a positive integer.");
  }

  const runId = options.runId ?? generateRunId();
  const startedAt = new Date().toISOString();

  const tasks: TaskManifestRecord[] = taskIds.map((taskId) => ({
    task_id: taskId,
    status: "pending",
    trials: Array.from(
      { length: options.trials },
      (_, index): TrialManifestRecord => ({
        trial_number: index + 1,
        status: "pending",
      }),
    ),
  }));

  const manifest: RunManifest = {
    run_id: runId,
    provider: adapter.provider,
    model: options.model,
    ...(options.temperature !== undefined
      ? { temperature: options.temperature }
      : {}),
    ...(options.maxOutputTokens !== undefined
      ? { max_output_tokens: options.maxOutputTokens }
      : {}),
    started_at: startedAt,
    status: "running",
    totals: {
      planned_trials: taskIds.length * options.trials,
      completed_trials: 0,
      failed_trials: 0,
      not_started_trials: 0,
      running_trials: 0,
      pending_trials: taskIds.length * options.trials,
    },
    tasks,
  };

  const manifestPath = createRunManifest(manifest);
  const results: EvaluationRunResult[] = [];

  let fatalError: string | undefined;
  let fatalFailure = false;

  for (let taskIndex = 0; taskIndex < taskIds.length; taskIndex++) {
    const taskId = taskIds[taskIndex];
    const task = manifest.tasks[taskIndex];

    for (let trialIndex = 0; trialIndex < options.trials; trialIndex++) {
      const trial = task.trials[trialIndex];

      trial.status = "running";
      trial.started_at = new Date().toISOString();
      task.status = "running";

      persistManifest(manifest);

      let result: EvaluationRunResult;

      try {
        result = await runEvaluation(taskId, adapter, {
          ...options,
          runId,
          trialNumber: trial.trial_number,
        });
      } catch (error) {
        trial.status = "failed";
        trial.completed_at = new Date().toISOString();

        if (error instanceof ModelRequestError) {
          const classification = classifyTrialError(error);

          trial.error_category = classification.category;
          trial.error_message = classification.message;

          if (classification.status !== undefined) {
            trial.error_status = classification.status;
          }

          if (!classification.continuable) {
            fatalFailure = true;
            fatalError = classification.message;
          }
        } else {
          fatalFailure = true;
          fatalError = error instanceof Error ? error.message : String(error);
          trial.error_message = fatalError;
        }

        persistManifest(manifest);

        if (fatalFailure) {
          markRemainingTrialsNotStarted(
            manifest,
            taskIndex,
            trial.trial_number,
          );

          manifest.status = "failed";
          manifest.completed_at = new Date().toISOString();
          persistManifest(manifest);
          break;
        }

        continue;
      }

      results.push(result);
      trial.status = "completed";
      trial.completed_at = result.completed_at ?? new Date().toISOString();
      persistManifest(manifest);
    }

    if (fatalFailure) {
      break;
    }
  }

  if (!fatalFailure) {
    manifest.completed_at = new Date().toISOString();

    manifest.status =
      manifest.totals.failed_trials > 0
        ? "completed_with_failures"
        : "completed";

    persistManifest(manifest);
  }

  return {
    run_id: runId,
    total_tasks: taskIds.length,
    total_trials: results.length,
    task_results: buildTaskResults(taskIds, runId, results),
    results,
    status: manifest.status,
    manifest_path: manifestPath,
    ...(fatalError ? { fatal_error: fatalError } : {}),
  };
}
