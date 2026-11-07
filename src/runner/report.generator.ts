import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import type { EvaluationRunResult } from "./evaluation.runner";
import type { VoyageTask } from "../schemas/task.schema";

import { aggregateResults, type TaskSummary } from "./result.aggregator";

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function convertToCsv(summaries: TaskSummary[]): string {
  if (summaries.length === 0) {
    return "";
  }

  const headers: (keyof TaskSummary)[] = [
    "task_id",
    "provider",
    "model",
    "run_id",
    "temperature",
    "max_output_tokens",
    "total_trials",
    "valid_trials",
    "passed_trials",
    "task_pass_rate",
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

  const rows = summaries.map((summary) =>
    headers.map((header) => escapeCsvValue(summary[header])),
  );

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function generateTaskSummaryCsv(
  trials: EvaluationRunResult[],
  tasks: VoyageTask[],
  outputDirectory = path.resolve(process.cwd(), "results"),
): string {
  const aggregation = aggregateResults(trials, tasks);

  mkdirSync(outputDirectory, { recursive: true });

  const csv = convertToCsv(aggregation.task_summaries);
  const outputPath = path.join(outputDirectory, "task-summary.csv");

  writeFileSync(outputPath, csv, {
    encoding: "utf-8",
    flag: "wx",
  });

  return outputPath;
}

export function generateBenchmarkSummaryJson(
  trials: EvaluationRunResult[],
  tasks: VoyageTask[],
  outputDirectory = path.resolve(process.cwd(), "results"),
): string {
  const aggregation = aggregateResults(trials, tasks);

  mkdirSync(outputDirectory, { recursive: true });

  const outputPath = path.join(outputDirectory, "benchmark-summary.json");

  writeFileSync(
    outputPath,
    JSON.stringify(aggregation.benchmark_summaries, null, 2),
    {
      encoding: "utf-8",
      flag: "wx",
    },
  );

  return outputPath;
}

function isValidUtcTimestamp(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function normalizeCurrentTrialRecord(
  value: unknown,
): EvaluationRunResult | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.task_id !== "string" ||
    typeof record.run_id !== "string" ||
    !Number.isInteger(record.trial_number) ||
    (record.trial_number as number) <= 0 ||
    typeof record.started_at !== "string" ||
    !isValidUtcTimestamp(record.started_at) ||
    typeof record.completed_at !== "string" ||
    !isValidUtcTimestamp(record.completed_at) ||
    typeof record.provider !== "string" ||
    typeof record.model !== "string" ||
    typeof record.latency_ms !== "number" ||
    !Number.isFinite(record.latency_ms) ||
    record.latency_ms < 0 ||
    typeof record.raw_response !== "string" ||
    !(record.parse_error === null || typeof record.parse_error === "string") ||
    typeof record.grading !== "object" ||
    record.grading === null
  ) {
    return null;
  }

  if (Date.parse(record.completed_at) < Date.parse(record.started_at)) {
    return null;
  }

  const optionalNumericFields = [
    "temperature",
    "max_output_tokens",
    "input_tokens",
    "output_tokens",
  ] as const;

  for (const field of optionalNumericFields) {
    const fieldValue = record[field];

    if (fieldValue === undefined) {
      continue;
    }

    if (
      typeof fieldValue !== "number" ||
      !Number.isFinite(fieldValue) ||
      fieldValue < 0 ||
      (field !== "temperature" && !Number.isInteger(fieldValue))
    ) {
      return null;
    }
  }

  const grading = record.grading as Record<string, unknown>;

  if (
    typeof grading.task_id !== "string" ||
    typeof grading.valid_response !== "boolean" ||
    typeof grading.score !== "number" ||
    !Number.isFinite(grading.score) ||
    grading.score < 0 ||
    grading.score > 100 ||
    !Number.isInteger(grading.passed_checks) ||
    (grading.passed_checks as number) < 0 ||
    !Number.isInteger(grading.total_checks) ||
    (grading.total_checks as number) < 0 ||
    (grading.passed_checks as number) > (grading.total_checks as number) ||
    typeof grading.task_passed !== "boolean" ||
    !Array.isArray(grading.checks) ||
    !Array.isArray(grading.errors) ||
    !grading.errors.every((error) => typeof error === "string")
  ) {
    return null;
  }

  const allowedCategories = new Set([
    "response_integrity",
    "information_handling",
    "calculation",
    "weather_constraint",
    "port_constraint",
    "deadline_constraint",
  ]);

  type ValidatedGradingCheck = {
    name: string;
    passed: boolean;
    critical: boolean;
    categories: string[];
  };

  const checks: (ValidatedGradingCheck | null)[] = grading.checks.map(
    (check): ValidatedGradingCheck | null => {
      if (typeof check !== "object" || check === null) {
        return null;
      }

      const gradingCheck = check as Record<string, unknown>;

      if (
        typeof gradingCheck.name !== "string" ||
        gradingCheck.name.trim().length === 0 ||
        typeof gradingCheck.passed !== "boolean" ||
        typeof gradingCheck.critical !== "boolean" ||
        (gradingCheck.categories !== undefined &&
          (!Array.isArray(gradingCheck.categories) ||
            !gradingCheck.categories.every(
              (category) =>
                typeof category === "string" && allowedCategories.has(category),
            )))
      ) {
        return null;
      }

      return {
        name: gradingCheck.name,
        passed: gradingCheck.passed,
        critical: gradingCheck.critical,
        categories: (gradingCheck.categories ?? []) as string[],
      };
    },
  );

  if (
    grading.task_id !== record.task_id ||
    checks.length !== grading.total_checks ||
    checks.some((check) => check === null) ||
    checks.filter((check) => check?.passed === true).length !==
      grading.passed_checks
  ) {
    return null;
  }

  return {
    ...record,
    grading: {
      ...grading,
      checks,
    },
  } as EvaluationRunResult;
}

export function loadTrialRecords(
  resultsDirectory = path.resolve(process.cwd(), "results"),
  runId?: string,
): EvaluationRunResult[] {
  if (!existsSync(resultsDirectory)) {
    return [];
  }

  if (
    !readdirSync(resultsDirectory, { withFileTypes: true }).some(
      (entry) => entry.isFile() && entry.name.endsWith(".json"),
    )
  ) {
    return [];
  }

  const filenames = readdirSync(resultsDirectory).filter(
    (filename) =>
      filename.endsWith(".json") && filename !== "benchmark-summary.json",
  );

  const trials: EvaluationRunResult[] = [];

  for (const filename of filenames) {
    const filePath = path.join(resultsDirectory, filename);
    const content = readFileSync(filePath, "utf-8");
    const parsed: unknown = JSON.parse(content);

    // Ignore records belonging to other runs before normalization.
    if (
      runId &&
      (typeof parsed !== "object" ||
        parsed === null ||
        (parsed as Record<string, unknown>).run_id !== runId)
    ) {
      continue;
    }

    const normalizedRecord = normalizeCurrentTrialRecord(parsed);

    if (!normalizedRecord) {
      console.warn(`Skipping incompatible trial record: ${filename}`);
      continue;
    }

    trials.push(normalizedRecord);
  }

  return trials;
}
