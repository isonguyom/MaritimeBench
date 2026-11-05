import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { EvaluationRunResult } from "./evaluation.runner";

export function saveEvaluationResult(result: EvaluationRunResult): string {
  const resultsDirectory = path.resolve(process.cwd(), "results");

  // Ensure the results directory exists.
  mkdirSync(resultsDirectory, { recursive: true });

  // Create a unique filename for this evaluation trial.
  const runId = result.run_id ?? "single-run";
  const trialNumber = result.trial_number ?? 1;
  const uniqueId = randomUUID();

  const filename = `${result.task_id}_${runId}_trial-${trialNumber}_${uniqueId}.json`;

  const filePath = path.join(resultsDirectory, filename);

  // Save the complete evaluation result.
  writeFileSync(filePath, JSON.stringify(result, null, 2), {
    encoding: "utf-8",
    flag: "wx",
  });

  return filePath;
}
