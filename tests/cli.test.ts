import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveAdapter: vi.fn(),
  discoverEvaluationTasks: vi.fn(),
  runEvaluationSuite: vi.fn(),
  loadEvaluationData: vi.fn(),
  loadTrialRecords: vi.fn(),
  generateTaskSummaryCsv: vi.fn(),
  generateBenchmarkSummaryJson: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  generateAggregateReports: vi.fn(),
}));

vi.mock("./../src/adapters/adapter.registry", () => ({
  resolveAdapter: mocks.resolveAdapter,
}));

vi.mock("./../src/runner/suite.loader", () => ({
  discoverEvaluationTasks: mocks.discoverEvaluationTasks,
}));

vi.mock("./../src/runner/suite.runner", () => ({
  runEvaluationSuite: mocks.runEvaluationSuite,
}));

vi.mock("./../src/runner/data.loader", () => ({
  loadEvaluationData: mocks.loadEvaluationData,
}));

vi.mock("./../src/runner/report.generator", () => ({
  loadTrialRecords: mocks.loadTrialRecords,
  generateTaskSummaryCsv: mocks.generateTaskSummaryCsv,
  generateBenchmarkSummaryJson: mocks.generateBenchmarkSummaryJson,
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: mocks.existsSync,
    readFileSync: mocks.readFileSync,
    readdirSync: mocks.readdirSync,
  };
});

vi.mock("./../src/runner/aggregate.report.generator", () => ({
  generateAggregateReports: mocks.generateAggregateReports,
}));

import { main } from "../src/cli";

function createManifest(runId: string, provider = "openai") {
  return {
    run_id: runId,
    provider,
    model: "gpt-test-model",
    temperature: 0,
    max_output_tokens: 1000,
    started_at: "2026-11-09T00:00:00.000Z",
    completed_at: "2026-11-09T00:01:00.000Z",
    status: "completed" as const,
    totals: {
      planned_trials: 1,
      completed_trials: 1,
      failed_trials: 0,
      not_started_trials: 0,
      running_trials: 0,
      pending_trials: 0,
    },
    tasks: [],
  };
}

function createTrial(runId: string, taskId = "MB-01") {
  return {
    run_id: runId,
    task_id: taskId,
    provider: "openai",
    model: "gpt-test-model",
    system_prompt: "Test system prompt",
    user_prompt: `Test prompt for ${taskId}`,
  };
}

describe("CLI main", () => {
  const originalArgv = process.argv;
  const originalExitCode = process.exitCode;
  const originalOpenAIModel = process.env.OPENAI_MODEL;

  beforeEach(() => {
    vi.clearAllMocks();

    process.exitCode = undefined;
    delete process.env.OPENAI_MODEL;

    process.argv = ["node", "cli"];

    mocks.resolveAdapter.mockImplementation((provider, model) => ({
      adapter: { provider },
      model:
        model ??
        (provider === "mock" ? "mock-model" : `${provider}-test-model`),
    }));

    mocks.discoverEvaluationTasks.mockReturnValue(["MB-01", "MB-02"]);
    mocks.loadTrialRecords.mockReturnValue([]);
    mocks.loadEvaluationData.mockImplementation((taskId) => ({
      task: { task_id: taskId },
    }));

    mocks.runEvaluationSuite.mockResolvedValue({
      run_id: "run-001",
      total_tasks: 2,
      total_trials: 2,
      task_results: [
        {
          task_id: "MB-01",
          total_trials: 1,
          results: [{ grading: { task_passed: true } }],
        },
        {
          task_id: "MB-02",
          total_trials: 1,
          results: [{ grading: { task_passed: true } }],
        },
      ],
      results: [],
      status: "completed",
      manifest_path: "results/manifests/run-001.json",
    });

    mocks.existsSync.mockReturnValue(true);
    mocks.readdirSync.mockReturnValue([]);
    mocks.readFileSync.mockImplementation((filePath) => {
      const runId = String(filePath).split(/[\\/]/).pop()?.replace(".json", "");
      return JSON.stringify(createManifest(runId ?? "run-001"));
    });
    mocks.generateAggregateReports.mockReturnValue([
      "transcripts/task-summary.csv",
      "transcripts/benchmark-summary.json",
      "transcripts/source-runs.json",
    ]);
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;

    if (originalOpenAIModel === undefined) {
      delete process.env.OPENAI_MODEL;
    } else {
      process.env.OPENAI_MODEL = originalOpenAIModel;
    }
  });

  it("runs the full suite using the default mock provider", async () => {
    await main("mock");

    expect(mocks.discoverEvaluationTasks).toHaveBeenCalledOnce();
    expect(mocks.resolveAdapter).toHaveBeenCalledWith("mock", undefined);

    expect(mocks.runEvaluationSuite).toHaveBeenCalledWith(
      ["MB-01", "MB-02"],
      { provider: "mock" },
      { model: "mock-model", trials: 1 },
    );

    expect(process.exitCode).toBeUndefined();
  });

  it("runs only the explicitly selected task", async () => {
    process.argv = ["node", "cli", "--task", "MB-01"];

    await main("mock");

    expect(mocks.discoverEvaluationTasks).not.toHaveBeenCalled();

    expect(mocks.runEvaluationSuite).toHaveBeenCalledWith(
      ["MB-01"],
      { provider: "mock" },
      { model: "mock-model", trials: 1 },
    );
  });

  it("forwards the requested trial count", async () => {
    process.argv = ["node", "cli", "--suite", "all", "--trials", "3"];

    await main("mock");

    expect(mocks.runEvaluationSuite).toHaveBeenCalledWith(
      ["MB-01", "MB-02"],
      { provider: "mock" },
      { model: "mock-model", trials: 3 },
    );
  });

  it("generates reports without running an evaluation", async () => {
    process.argv = ["node", "cli", "--report", "--run-id", "run-001"];

    mocks.loadTrialRecords.mockReturnValue([{ task_id: "MB-01" }]);

    mocks.loadEvaluationData.mockReturnValue({
      task: { task_id: "MB-01" },
    });

    mocks.generateTaskSummaryCsv.mockReturnValue("summary.csv");
    mocks.generateBenchmarkSummaryJson.mockReturnValue("summary.json");

    await main("mock");

    expect(mocks.loadTrialRecords).toHaveBeenCalledWith(undefined, "run-001");

    expect(mocks.generateTaskSummaryCsv).toHaveBeenCalledOnce();
    expect(mocks.generateBenchmarkSummaryJson).toHaveBeenCalledOnce();
    expect(mocks.runEvaluationSuite).not.toHaveBeenCalled();
  });

  it("resolves an explicitly selected provider and model", async () => {
    process.argv = [
      "node",
      "cli",
      "--provider",
      "anthropic",
      "--model",
      "claude-test-model",
    ];

    await main("mock");

    expect(mocks.resolveAdapter).toHaveBeenCalledWith(
      "anthropic",
      "claude-test-model",
    );

    expect(mocks.runEvaluationSuite).toHaveBeenCalledWith(
      ["MB-01", "MB-02"],
      { provider: "anthropic" },
      { model: "claude-test-model", trials: 1 },
    );
  });

  it("sets a nonzero exit code when provider resolution fails", async () => {
    mocks.resolveAdapter.mockImplementation(() => {
      throw new Error("Anthropic API key is missing.");
    });

    process.argv = ["node", "cli", "--provider", "anthropic"];

    await main("mock");

    expect(mocks.runEvaluationSuite).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("sets a nonzero exit code for fatal suite failures", async () => {
    mocks.runEvaluationSuite.mockResolvedValue({
      run_id: "run-002",
      total_tasks: 2,
      total_trials: 0,
      task_results: [],
      results: [],
      status: "failed",
      manifest_path: "results/manifests/run-002.json",
      fatal_error: "Model request failed.",
    });

    await main("mock");

    expect(process.exitCode).toBe(1);
  });

  it("automatically aggregates completed real-AI runs and excludes mock runs", async () => {
    process.argv = ["node", "cli", "--aggregate"];

    mocks.readdirSync.mockReturnValue([
      "run-001.json",
      "run-002.json",
      "mock-run.json",
    ]);

    mocks.readFileSync.mockImplementation((filePath) => {
      const file = String(filePath).split(/[\\/]/).pop();

      return JSON.stringify(
        file === "mock-run.json"
          ? createManifest("mock-run", "mock")
          : createManifest(file?.replace(".json", "") ?? "run-001"),
      );
    });

    mocks.loadTrialRecords.mockImplementation((_directory, runId) => [
      createTrial(runId),
    ]);

    await main("mock");

    expect(mocks.loadTrialRecords).toHaveBeenCalledTimes(2);
    expect(mocks.generateAggregateReports).toHaveBeenCalledOnce();
    expect(
      mocks.generateAggregateReports.mock.calls[0][2].source_run_ids,
    ).toEqual(["run-001", "run-002"]);
    expect(process.exitCode).toBeUndefined();
  });

  it("aggregates only explicitly selected runs", async () => {
    process.argv = ["node", "cli", "--aggregate", "--runs", "run-002"];

    mocks.readdirSync.mockReturnValue(["run-001.json", "run-002.json"]);
    mocks.loadTrialRecords.mockReturnValue([createTrial("run-002")]);

    await main("mock");

    expect(mocks.loadTrialRecords).toHaveBeenCalledOnce();
    expect(mocks.loadTrialRecords).toHaveBeenCalledWith(undefined, "run-002");
    expect(
      mocks.generateAggregateReports.mock.calls[0][2].source_run_ids,
    ).toEqual(["run-002"]);
    expect(process.exitCode).toBeUndefined();
  });

  it("rejects explicitly selected incomplete runs", async () => {
    process.argv = ["node", "cli", "--aggregate", "--runs", "run-001"];

    mocks.readFileSync.mockReturnValue(
      JSON.stringify({
        ...createManifest("run-001"),
        status: "completed_with_failures",
      }),
    );

    mocks.readdirSync.mockReturnValue(["run-001.json"]);

    await main("mock");

    expect(mocks.loadTrialRecords).not.toHaveBeenCalled();
    expect(mocks.generateAggregateReports).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
