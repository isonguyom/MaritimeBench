import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { EvaluationRunResult } from "./evaluation.runner";

export function saveEvaluationResult(
  result: EvaluationRunResult,
): string {
  const resultsDirectory = path.resolve(process.cwd(), "results");

  // Ensure the results directory exists.
  mkdirSync(resultsDirectory, { recursive: true });

  // Create a timestamped filename for this evaluation run.
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const filename = `${result.task_id}_${timestamp}.json`;
  const filePath = path.join(resultsDirectory, filename);

  // Save the complete evaluation result.
  writeFileSync(
    filePath,
    JSON.stringify(result, null, 2),
    {
      encoding: "utf-8",
      flag: "wx",
    },
  );

  return filePath;
}