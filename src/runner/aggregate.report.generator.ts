import {
  existsSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import type { EvaluationRunResult } from "./evaluation.runner";
import type { VoyageTask } from "../schemas/task.schema";
import { aggregateResults } from "./result.aggregator";

export interface AggregateSourceRun {
  run_id: string;
  trials: number;
}

export interface AggregateProvenance {
  report_type: string;
  aggregate_id: string;
  provider: string;
  model: string;
  source_runs: AggregateSourceRun[];
  source_run_ids: string[];
  total_trials: number;
  total_tasks: number;
  trials_per_task: number;
  task_trial_counts: Record<string, number>;
  configuration_consistency: Record<string, boolean | "not_recorded">;
  original_trial_records_modified: false;
  generated_files: string[];
  generated_at: string;
}

export function generateAggregateReports(
  sourceTrials: EvaluationRunResult[],
  tasks: VoyageTask[],
  provenance: AggregateProvenance,
  outputDirectory = path.resolve(process.cwd(), "transcripts"),
): string[] {
  const trials = sourceTrials.map((trial) => ({
    ...trial,
    run_id: provenance.aggregate_id,
  }));

  if (trials.length !== provenance.total_trials) {
    throw new Error("Aggregate trial count does not match provenance.");
  }

  const aggregation = aggregateResults(trials, tasks);
  const taskSummaries = aggregation.task_summaries;

  if (taskSummaries.length !== provenance.total_tasks) {
    throw new Error("Aggregate task count does not match provenance.");
  }

  const headers = [
    "task_id",
    "provider",
    "model",
    "model_family",
    "model_family_source",
    "run_id",
    "temperature",
    "max_output_tokens",
    "total_trials",
    "valid_trials",
    "passed_trials",
    "task_pass_rate",
    "pass_at_1",
    "pass_at_2",
    "pass_at_3",
    "pass_at_5",
    "pass_all_1",
    "pass_all_2",
    "pass_all_3",
    "pass_all_5",
    "average_score",
    "response_validity_rate",
    "average_latency_ms",
    "median_latency_ms",
    "min_latency_ms",
    "max_latency_ms",
    "average_input_tokens",
    "average_output_tokens",
    "score_standard_deviation",
    "minimum_score",
    "maximum_score",
    "constraint_applicable_trials",
    "constraint_assessable_trials",
    "constraint_failure_trials",
    "constraint_failure_rate",
  ];

  const csvValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    return /[",\n\r]/.test(stringValue)
      ? `"${stringValue.replace(/"/g, '""')}"`
      : stringValue;
  };

  const csvRows = taskSummaries.map((summary) =>
    [
      summary.task_id,
      summary.provider,
      summary.model,
      summary.model_family,
      summary.model_family_source,
      summary.run_id,
      summary.temperature,
      summary.max_output_tokens,
      summary.total_trials,
      summary.valid_trials,
      summary.passed_trials,
      summary.task_pass_rate,
      summary.pass_at_k[1],
      summary.pass_at_k[2],
      summary.pass_at_k[3],
      summary.pass_at_k[5],
      summary.pass_all_k[1],
      summary.pass_all_k[2],
      summary.pass_all_k[3],
      summary.pass_all_k[5],
      summary.average_score,
      summary.response_validity_rate,
      summary.average_latency_ms,
      summary.median_latency_ms,
      summary.min_latency_ms,
      summary.max_latency_ms,
      summary.average_input_tokens,
      summary.average_output_tokens,
      summary.score_standard_deviation,
      summary.minimum_score,
      summary.maximum_score,
      summary.constraint_applicable_trials,
      summary.constraint_assessable_trials,
      summary.constraint_failure_trials,
      summary.constraint_failure_rate,
    ]
      .map(csvValue)
      .join(","),
  );

  const outputs = new Map<string, string>([
    [
      "benchmark-summary.json",
      JSON.stringify(aggregation.benchmark_summaries, null, 2),
    ],
    ["task-summary.csv", [headers.join(","), ...csvRows].join("\n")],
    [
      "source-runs.json",
      JSON.stringify(
        {
          ...provenance,
          generated_at: new Date().toISOString(),
        },
        null,
        2,
      ),
    ],
  ]);

  mkdirSync(outputDirectory, { recursive: true });
  const temporaryDirectory = path.join(
    outputDirectory,
    `.aggregate-tmp-${process.pid}`,
  );
  const backupDirectory = path.join(temporaryDirectory, "backup");

  if (temporaryDirectory.includes("..")) {
    throw new Error("Invalid aggregate temporary directory.");
  }

  rmSync(temporaryDirectory, { recursive: true, force: true });
  mkdirSync(backupDirectory, { recursive: true });

  try {
    for (const [filename, content] of outputs) {
      writeFileSync(path.join(temporaryDirectory, filename), content, "utf-8");
    }

    const backedUp: string[] = [];
    const installed: string[] = [];

    try {
      for (const filename of outputs.keys()) {
        const target = path.join(outputDirectory, filename);
        if (existsSync(target)) {
          renameSync(target, path.join(backupDirectory, filename));
          backedUp.push(filename);
        }
      }

      for (const filename of outputs.keys()) {
        renameSync(
          path.join(temporaryDirectory, filename),
          path.join(outputDirectory, filename),
        );
        installed.push(filename);
      }
    } catch (error) {
      for (const filename of installed) {
        rmSync(path.join(outputDirectory, filename), { force: true });
      }
      for (const filename of backedUp) {
        renameSync(
          path.join(backupDirectory, filename),
          path.join(outputDirectory, filename),
        );
      }
      throw error;
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }

  return [...outputs.keys()].map((filename) =>
    path.join(outputDirectory, filename),
  );
}
