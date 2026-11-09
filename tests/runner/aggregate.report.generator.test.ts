import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { EvaluationRunResult } from "../../src/runner/evaluation.runner";
import type { VoyageTask } from "../../src/schemas/task.schema";
import {
  generateAggregateReports,
  type AggregateProvenance,
} from "../../src/runner/aggregate.report.generator";

const temporaryDirectories: string[] = [];

function createDirectory(): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), "maritimebench-"));
  temporaryDirectories.push(directory);
  return directory;
}

function createTask(): VoyageTask {
  return {
    task_id: "MB-03",
    title: "Weather Speed Restriction",
    description: "Test voyage with a weather restriction.",
    departure_time: "2026-10-15T08:00:00Z",
    legs: [{ leg_id: "LEG-01", distance_nm: 180, speed_kn: 12 }],
    weather_restrictions: [
      {
        start_time: "2026-10-15T12:00:00Z",
        end_time: "2026-10-15T16:00:00Z",
        restricted_speed_kn: 6,
      },
    ],
  };
}

function createTrial(): EvaluationRunResult {
  return {
    task_id: "MB-03",
    run_id: "run-test",
    trial_number: 1,
    started_at: "2026-10-15T08:00:00.000Z",
    completed_at: "2026-10-15T08:00:01.000Z",
    provider: "mock",
    model: "mock-model",
    latency_ms: 1000,
    input_tokens: 100,
    output_tokens: 50,
    raw_response: "{}",
    parse_error: null,
    system_prompt: "Test system prompt",
    user_prompt: "Test user prompt",
    grading: {
      task_id: "MB-03",
      valid_response: true,
      score: 100,
      passed_checks: 2,
      total_checks: 2,
      task_passed: true,
      checks: [
        {
          name: "physical_eta",
          categories: ["calculation", "weather_constraint"],
          passed: true,
          expected: "2026-10-16T01:00:00.000Z",
          actual: "2026-10-16T01:00:00.000Z",
          critical: true,
        },
        {
          name: "total_travel_hours",
          categories: ["calculation", "weather_constraint"],
          passed: true,
          expected: 17,
          actual: 17,
          critical: true,
        },
      ],
      errors: [],
    },
  };
}

function createProvenance(): AggregateProvenance {
  return {
    report_type: "combined_clarified_prompt_aggregate",
    aggregate_id: "test-aggregate",
    provider: "mock",
    model: "mock-model",
    source_runs: [{ run_id: "run-test", trials: 1 }],
    source_run_ids: ["run-test"],
    total_trials: 1,
    total_tasks: 1,
    trials_per_task: 1,
    task_trial_counts: { "MB-03": 1 },
    configuration_consistency: {
      provider: true,
      model: true,
      system_prompt: true,
      temperature_and_max_output_tokens: "not_recorded",
      task_user_prompts_across_runs: true,
    },
    original_trial_records_modified: false,
    generated_files: [
      "task-summary.csv",
      "benchmark-summary.json",
      "source-runs.json",
    ],
    generated_at: "2026-11-09T00:00:00.000Z",
  };
}

describe("Aggregate report generator", () => {
  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("generates all three aggregate reports with the expected counts", () => {
    const directory = createDirectory();

    const outputs = generateAggregateReports(
      [createTrial()],
      [createTask()],
      createProvenance(),
      directory,
    );

    expect(outputs).toHaveLength(3);
    expect(outputs.map((output) => path.basename(output))).toEqual([
      "benchmark-summary.json",
      "task-summary.csv",
      "source-runs.json",
    ]);

    const summary = JSON.parse(
      readFileSync(path.join(directory, "benchmark-summary.json"), "utf-8"),
    );

    expect(summary[0].total_trials).toBe(1);
    expect(summary[0].total_tasks).toBe(1);
    expect(summary[0].task_summaries[0].run_id).toBe("test-aggregate");

    const provenance = JSON.parse(
      readFileSync(path.join(directory, "source-runs.json"), "utf-8"),
    );

    expect(provenance.aggregate_id).toBe("test-aggregate");
    expect(provenance.original_trial_records_modified).toBe(false);
    expect(
      provenance.configuration_consistency.temperature_and_max_output_tokens,
    ).toBe("not_recorded");
  });

  it("overwrites existing aggregate reports after successful generation", () => {
    const directory = createDirectory();

    for (const filename of [
      "benchmark-summary.json",
      "task-summary.csv",
      "source-runs.json",
    ]) {
      writeFileSync(path.join(directory, filename), "old-content", "utf-8");
    }

    generateAggregateReports(
      [createTrial()],
      [createTask()],
      createProvenance(),
      directory,
    );

    for (const filename of [
      "benchmark-summary.json",
      "task-summary.csv",
      "source-runs.json",
    ]) {
      expect(readFileSync(path.join(directory, filename), "utf-8")).not.toBe(
        "old-content",
      );
    }
  });

  it("preserves existing reports when aggregation fails", () => {
    const directory = createDirectory();
    const filenames = [
      "benchmark-summary.json",
      "task-summary.csv",
      "source-runs.json",
    ];

    for (const filename of filenames) {
      writeFileSync(
        path.join(directory, filename),
        `original-${filename}`,
        "utf-8",
      );
    }

    expect(() =>
      generateAggregateReports(
        [createTrial()],
        [],
        createProvenance(),
        directory,
      ),
    ).toThrow("Task definition not found for MB-03.");

    for (const filename of filenames) {
      expect(readFileSync(path.join(directory, filename), "utf-8")).toBe(
        `original-${filename}`,
      );
    }
  });
});
