import { randomUUID } from "node:crypto";

import type { ModelAdapter } from "../adapters/model.adapter";
import {
  runEvaluation,
  type EvaluationRunOptions,
  type EvaluationRunResult,
} from "./evaluation.runner";

export interface MultiTrialOptions extends EvaluationRunOptions {
  trials: number;
}

export interface MultiTrialResult {
  run_id: string;
  task_id: string;
  total_trials: number;
  results: EvaluationRunResult[];
}

export async function runMultipleTrials(
  taskId: string,
  adapter: ModelAdapter,
  options: MultiTrialOptions,
): Promise<MultiTrialResult> {
  if (!Number.isInteger(options.trials) || options.trials < 1) {
    throw new Error("Number of trials must be a positive integer.");
  }

  const runId = options.runId ?? randomUUID();
  const results: EvaluationRunResult[] = [];

  for (let trialNumber = 1; trialNumber <= options.trials; trialNumber++) {
    const result = await runEvaluation(taskId, adapter, {
      ...options,
      runId,
      trialNumber,
    });

    results.push(result);
  }

  return {
    run_id: runId,
    task_id: taskId,
    total_trials: results.length,
    results,
  };
}
