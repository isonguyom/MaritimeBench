import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import type { EvaluationRunResult } from "../../src/runner/evaluation.runner";
import type { VoyageTask } from "../../src/schemas/task.schema";

import {
  generateBenchmarkSummaryJson,
  generateTaskSummaryCsv,
  loadTrialRecords,
} from "../../src/runner/report.generator";

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), "maritimebench-report-"),
  );

  temporaryDirectories.push(directory);

  return directory;
}

function createTask(): VoyageTask {
  return {
    task_id: "MB-03",
    title: "Weather Speed Restriction",
    description: "Test voyage with a weather restriction.",
    departure_time: "2026-10-15T08:00:00Z",
    legs: [
      {
        leg_id: "LEG-01",
        distance_nm: 180,
        speed_kn: 12,
      },
    ],
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
    run_id: "run-001",
    trial_number: 1,
    started_at: "2026-10-15T08:00:00.000Z",
    completed_at: "2026-10-15T08:00:01.000Z",
    provider: "mock",
    model: "mock-model",
    temperature: 0,
    max_output_tokens: 1000,
    latency_ms: 1000,
    input_tokens: 100,
    output_tokens: 50,
    system_prompt: "You are a maritime voyage planning assistant.",
    user_prompt: "Calculate the voyage ETA for MB-03.",
    raw_response: "{}",
    parse_error: null,
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

afterEach(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }

  temporaryDirectories.length = 0;
});

describe("Report generator", () => {
  it("should generate a task summary CSV", () => {
    const outputDirectory = createTemporaryDirectory();

    const outputPath = generateTaskSummaryCsv(
      [createTrial()],
      [createTask()],
      outputDirectory,
    );

    const csv = readFileSync(outputPath, "utf-8");
    const lines = csv.split("\n");

    expect(path.basename(outputPath)).toBe("task-summary.csv");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("task_id");
    expect(lines[0]).toContain("task_pass_rate");
    expect(lines[0]).toContain("constraint_failure_rate");
    expect(lines[1]).toContain("MB-03");
    expect(lines[1]).toContain("mock-model");
  });

  it("should return an empty CSV when there are no trials", () => {
    const outputDirectory = createTemporaryDirectory();

    const outputPath = generateTaskSummaryCsv(
      [],
      [createTask()],
      outputDirectory,
    );

    expect(readFileSync(outputPath, "utf-8")).toBe("");
  });

  it("should load saved trial JSON records", () => {
    const resultsDirectory = createTemporaryDirectory();
    const trial = createTrial();

    writeFileSync(
      path.join(resultsDirectory, "trial-001.json"),
      JSON.stringify(trial),
      "utf-8",
    );

    const records = loadTrialRecords(resultsDirectory);

    expect(records).toHaveLength(1);
    expect(records[0].task_id).toBe("MB-03");
    expect(records[0].model).toBe("mock-model");
  });

  it.each([
    ["timestamp without timezone", "2026-10-15T08:00:00.000"],
    ["timestamp with a non-UTC offset", "2026-10-15T09:00:00.000+01:00"],
    ["timestamp without milliseconds", "2026-10-15T08:00:00Z"],
    ["invalid calendar date", "2026-02-30T08:00:00.000Z"],
    ["invalid timestamp", "not-a-timestamp"],
  ])("should reject records with %s", (_description, timestamp) => {
    const resultsDirectory = createTemporaryDirectory();

    const trial = {
      ...createTrial(),
      started_at: timestamp,
    };

    writeFileSync(
      path.join(resultsDirectory, "invalid-timestamp.json"),
      JSON.stringify(trial),
      "utf-8",
    );

    const warningSpy = vi.spyOn(console, "warn");

    try {
      const records = loadTrialRecords(resultsDirectory);

      expect(records).toEqual([]);
      expect(warningSpy).toHaveBeenCalledOnce();
    } finally {
      warningSpy.mockRestore();
    }
  });

  it("should reject records when completion timestamp precedes start timestamp", () => {
    const resultsDirectory = createTemporaryDirectory();

    const trial = {
      ...createTrial(),
      started_at: "2026-10-15T10:00:00.000Z",
      completed_at: "2026-10-15T09:00:00.000Z",
    };

    writeFileSync(
      path.join(resultsDirectory, "invalid-timestamp-order.json"),
      JSON.stringify(trial),
      "utf-8",
    );

    const warningSpy = vi.spyOn(console, "warn");

    try {
      const records = loadTrialRecords(resultsDirectory);

      expect(records).toEqual([]);
      expect(warningSpy).toHaveBeenCalledOnce();
    } finally {
      warningSpy.mockRestore();
    }
  });

  it("should load only trial records matching the requested run ID", () => {
    const resultsDirectory = createTemporaryDirectory();

    const firstTrial = createTrial();

    const secondTrial = createTrial();
    secondTrial.run_id = "run-002";

    writeFileSync(
      path.join(resultsDirectory, "trial-001.json"),
      JSON.stringify(firstTrial),
      "utf-8",
    );

    writeFileSync(
      path.join(resultsDirectory, "trial-002.json"),
      JSON.stringify(secondTrial),
      "utf-8",
    );

    const records = loadTrialRecords(resultsDirectory, "run-001");

    expect(records).toHaveLength(1);
    expect(records[0].run_id).toBe("run-001");
  });

  it("should ignore incompatible records belonging to other runs", () => {
    const resultsDirectory = createTemporaryDirectory();

    const trial = createTrial();

    writeFileSync(
      path.join(resultsDirectory, "matching-trial.json"),
      JSON.stringify(trial),
      "utf-8",
    );

    writeFileSync(
      path.join(resultsDirectory, "unrelated-trial.json"),
      JSON.stringify({
        task_id: "MB-01",
        run_id: "another-run",
      }),
      "utf-8",
    );

    const warningSpy = vi.spyOn(console, "warn");

    try {
      const records = loadTrialRecords(resultsDirectory, "run-001");

      expect(records).toHaveLength(1);
      expect(records[0].run_id).toBe("run-001");
      expect(warningSpy).not.toHaveBeenCalled();
    } finally {
      warningSpy.mockRestore();
    }
  });

  it("should return an empty array when no records match the requested run ID", () => {
    const resultsDirectory = createTemporaryDirectory();

    writeFileSync(
      path.join(resultsDirectory, "trial-001.json"),
      JSON.stringify(createTrial()),
      "utf-8",
    );

    const records = loadTrialRecords(resultsDirectory, "nonexistent-run");

    expect(records).toEqual([]);
  });

  it("should return an empty array when the results directory has no JSON records", () => {
    const resultsDirectory = createTemporaryDirectory();

    const records = loadTrialRecords(resultsDirectory);

    expect(records).toEqual([]);
  });

  it("should return an empty array when the results directory does not exist", () => {
    const parentDirectory = createTemporaryDirectory();
    const missingDirectory = path.join(parentDirectory, "missing-results");

    const records = loadTrialRecords(missingDirectory);

    expect(records).toEqual([]);
  });

  it.each([
    ["negative temperature", { temperature: -0.5 }],
    ["invalid temperature", { temperature: Number.NaN }],
    ["negative input tokens", { input_tokens: -10 }],
    ["fractional output tokens", { output_tokens: 10.5 }],
    ["negative maximum output tokens", { max_output_tokens: -100 }],
  ])("should reject records with %s", (_description, invalidFields) => {
    const resultsDirectory = createTemporaryDirectory();

    const trial = {
      ...createTrial(),
      ...invalidFields,
    };

    writeFileSync(
      path.join(resultsDirectory, "invalid-trial.json"),
      JSON.stringify(trial),
      "utf-8",
    );

    const warningSpy = vi.spyOn(console, "warn");

    try {
      const records = loadTrialRecords(resultsDirectory);

      expect(records).toEqual([]);
      expect(warningSpy).toHaveBeenCalledOnce();
    } finally {
      warningSpy.mockRestore();
    }
  });

  it.each([
    ["score below zero", { score: -1 }],
    ["score above 100", { score: 101 }],
    ["invalid score", { score: Number.NaN }],
    ["negative passed checks", { passed_checks: -1 }],
    ["more passed checks than total checks", { passed_checks: 3 }],
    ["negative total checks", { total_checks: -1 }],
    ["non-string grading errors", { errors: [123] }],
  ])("should reject records with %s", (_description, invalidFields) => {
    const resultsDirectory = createTemporaryDirectory();

    const trial = createTrial();

    const invalidTrial = {
      ...trial,
      grading: {
        ...trial.grading,
        ...invalidFields,
      },
    };

    writeFileSync(
      path.join(resultsDirectory, "invalid-trial.json"),
      JSON.stringify(invalidTrial),
      "utf-8",
    );

    const warningSpy = vi.spyOn(console, "warn");

    try {
      const records = loadTrialRecords(resultsDirectory);

      expect(records).toEqual([]);
      expect(warningSpy).toHaveBeenCalledOnce();
    } finally {
      warningSpy.mockRestore();
    }
  });

  it.each([
    [
      "unknown grading category",
      {
        name: "physical_eta",
        categories: ["unknown_category"],
        passed: true,
        expected: "2026-10-16T01:00:00.000Z",
        actual: "2026-10-16T01:00:00.000Z",
        critical: true,
      },
    ],
    [
      "empty check name",
      {
        name: " ",
        categories: ["calculation"],
        passed: true,
        expected: 17,
        actual: 17,
        critical: true,
      },
    ],
  ])("should reject records with %s", (_description, invalidCheck) => {
    const resultsDirectory = createTemporaryDirectory();

    const trial = createTrial();

    const invalidTrial = {
      ...trial,
      grading: {
        ...trial.grading,
        checks: [invalidCheck],
      },
    };

    writeFileSync(
      path.join(resultsDirectory, "invalid-trial.json"),
      JSON.stringify(invalidTrial),
      "utf-8",
    );

    const warningSpy = vi.spyOn(console, "warn");

    try {
      const records = loadTrialRecords(resultsDirectory);

      expect(records).toEqual([]);
      expect(warningSpy).toHaveBeenCalledOnce();
    } finally {
      warningSpy.mockRestore();
    }
  });

  it("should accept legacy grading checks without categories", () => {
    const resultsDirectory = createTemporaryDirectory();

    const trial = createTrial();

    const legacyTrial = {
      ...trial,
      grading: {
        ...trial.grading,
        checks: trial.grading.checks.map(
          ({ categories: _categories, ...check }) => check,
        ),
      },
    };

    writeFileSync(
      path.join(resultsDirectory, "legacy-trial.json"),
      JSON.stringify(legacyTrial),
      "utf-8",
    );

    const records = loadTrialRecords(resultsDirectory);

    expect(records).toHaveLength(1);
    expect(records[0].grading.checks[0].categories).toEqual([]);
    expect(records[0].grading.checks[1].categories).toEqual([]);
  });

  it.each([
    ["mismatched grading task ID", { task_id: "MB-01" }],
    ["incorrect total check count", { total_checks: 3 }],
    ["incorrect passed check count", { passed_checks: 1 }],
  ])("should reject records with %s", (_description, invalidFields) => {
    const resultsDirectory = createTemporaryDirectory();

    const trial = createTrial();

    const invalidTrial = {
      ...trial,
      grading: {
        ...trial.grading,
        ...invalidFields,
      },
    };

    writeFileSync(
      path.join(resultsDirectory, "invalid-trial.json"),
      JSON.stringify(invalidTrial),
      "utf-8",
    );

    const warningSpy = vi.spyOn(console, "warn");

    try {
      const records = loadTrialRecords(resultsDirectory);

      expect(records).toEqual([]);
      expect(warningSpy).toHaveBeenCalledOnce();
    } finally {
      warningSpy.mockRestore();
    }
  });

  it("should ignore non-JSON files when loading trial records", () => {
    const resultsDirectory = createTemporaryDirectory();

    writeFileSync(
      path.join(resultsDirectory, "notes.txt"),
      "Not a trial record",
      "utf-8",
    );

    const records = loadTrialRecords(resultsDirectory);

    expect(records).toEqual([]);
  });

  it("should throw when a saved JSON record is malformed", () => {
    const resultsDirectory = createTemporaryDirectory();

    writeFileSync(
      path.join(resultsDirectory, "invalid.json"),
      "{ invalid json",
      "utf-8",
    );

    expect(() => loadTrialRecords(resultsDirectory)).toThrow();
  });

  it("should create the output directory when it does not exist", () => {
    const parentDirectory = createTemporaryDirectory();
    const outputDirectory = path.join(parentDirectory, "reports");

    const outputPath = generateTaskSummaryCsv(
      [createTrial()],
      [createTask()],
      outputDirectory,
    );

    expect(readFileSync(outputPath, "utf-8")).toContain("MB-03");
  });

  it("should not overwrite an existing task summary CSV", () => {
    const outputDirectory = createTemporaryDirectory();
    const existingContent = "previous report";

    const existingPath = path.join(outputDirectory, "task-summary.csv");
    writeFileSync(existingPath, existingContent, "utf-8");

    expect(() =>
      generateTaskSummaryCsv([createTrial()], [createTask()], outputDirectory),
    ).toThrow();

    expect(readFileSync(existingPath, "utf-8")).toBe(existingContent);
  });

  it("should not overwrite an existing benchmark summary JSON", () => {
    const outputDirectory = createTemporaryDirectory();
    const existingContent = '{"previous":"report"}';

    const existingPath = path.join(outputDirectory, "benchmark-summary.json");
    writeFileSync(existingPath, existingContent, "utf-8");

    expect(() =>
      generateBenchmarkSummaryJson(
        [createTrial()],
        [createTask()],
        outputDirectory,
      ),
    ).toThrow();

    expect(readFileSync(existingPath, "utf-8")).toBe(existingContent);
  });

  it("should generate a benchmark summary JSON file", () => {
    const outputDirectory = createTemporaryDirectory();

    const outputPath = generateBenchmarkSummaryJson(
      [createTrial()],
      [createTask()],
      outputDirectory,
    );

    const content = JSON.parse(readFileSync(outputPath, "utf-8"));

    expect(path.basename(outputPath)).toBe("benchmark-summary.json");

    expect(content).toHaveLength(1);
    expect(content[0].total_tasks).toBe(1);
    expect(content[0].total_trials).toBe(1);
    expect(content[0].macro_average_task_pass_rate).toBe(100);
    expect(content[0].task_summaries).toHaveLength(1);
    expect(content[0].task_summaries[0].task_id).toBe("MB-03");
  });

  it("should generate an empty benchmark summary when there are no trials", () => {
    const outputDirectory = createTemporaryDirectory();

    const outputPath = generateBenchmarkSummaryJson(
      [],
      [createTask()],
      outputDirectory,
    );

    const content = JSON.parse(readFileSync(outputPath, "utf-8"));

    expect(content).toEqual([]);
  });

  it("should preserve separate benchmark configurations in the JSON report", () => {
    const outputDirectory = createTemporaryDirectory();

    const firstTrial = createTrial();

    const secondTrial = createTrial();
    secondTrial.temperature = 0.5;

    const outputPath = generateBenchmarkSummaryJson(
      [firstTrial, secondTrial],
      [createTask()],
      outputDirectory,
    );

    const content = JSON.parse(readFileSync(outputPath, "utf-8"));

    expect(content).toHaveLength(2);
    expect(content[0].temperature).toBe(0);
    expect(content[1].temperature).toBe(0.5);
  });

  it("should preserve separate providers and models in the JSON report", () => {
    const outputDirectory = createTemporaryDirectory();

    const firstTrial = createTrial();

    const secondTrial = createTrial();
    secondTrial.provider = "another-provider";
    secondTrial.model = "another-model";

    const outputPath = generateBenchmarkSummaryJson(
      [firstTrial, secondTrial],
      [createTask()],
      outputDirectory,
    );

    const content = JSON.parse(readFileSync(outputPath, "utf-8"));

    expect(content).toHaveLength(2);

    expect(
      content.map((summary: { provider: string }) => summary.provider),
    ).toEqual(["mock", "another-provider"]);

    expect(content.map((summary: { model: string }) => summary.model)).toEqual([
      "mock-model",
      "another-model",
    ]);
  });
});
