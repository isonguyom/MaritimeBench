import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import * as manifestStorage from "../../src/runner/run-manifest.storage";
import type { ModelAdapter } from "../../src/adapters/model.adapter";
import type { EvaluationRunResult } from "../../src/runner/evaluation.runner";
import { ModelRequestError } from "../../src/runner/trial-error.classifier";
import { runEvaluationSuite } from "../../src/runner/suite.runner";

const { runEvaluation } = vi.hoisted(() => ({
  runEvaluation: vi.fn(),
}));

vi.mock("../../src/runner/evaluation.runner", () => ({
  runEvaluation,
}));

const adapter = {
  provider: "mock",
  generate: vi.fn(),
} as unknown as ModelAdapter;

const originalDirectory = process.cwd();
let temporaryDirectory: string;

function createResult(
  taskId: string,
  runId: string,
  trialNumber: number,
): EvaluationRunResult {
  return {
    task_id: taskId,
    run_id: runId,
    trial_number: trialNumber,
    started_at: "2026-11-07T10:00:00.000Z",
    completed_at: "2026-11-07T10:01:00.000Z",
    provider: "mock",
    model: "mock-model",
    latency_ms: 100,
    system_prompt: "You are a maritime voyage planning assistant.",
    user_prompt: `Calculate the voyage ETA for ${taskId}.`,
    raw_response: "{}",
    parse_error: null,
    grading: {
      task_id: taskId,
      valid_response: true,
      score: 100,
      passed_checks: 5,
      total_checks: 5,
      task_passed: true,
      checks: [],
      errors: [],
    },
  };
}

function readManifest(runId: string) {
  const manifestPath = path.join(
    temporaryDirectory,
    "results",
    "manifests",
    `${runId}.json`,
  );

  expect(existsSync(manifestPath)).toBe(true);

  return JSON.parse(readFileSync(manifestPath, "utf-8"));
}

describe("runEvaluationSuite", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    temporaryDirectory = mkdtempSync(
      path.join(os.tmpdir(), "maritimebench-suite-"),
    );

    process.chdir(temporaryDirectory);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.chdir(originalDirectory);

    if (temporaryDirectory && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("runs all tasks and trials sequentially with one shared run ID", async () => {
    runEvaluation.mockImplementation(
      async (
        taskId: string,
        _adapter: ModelAdapter,
        options: { runId: string; trialNumber: number },
      ) => createResult(taskId, options.runId, options.trialNumber),
    );

    const taskIds = ["MB-01", "MB-02", "MB-03"];

    const result = await runEvaluationSuite(taskIds, adapter, {
      model: "mock-model",
      trials: 2,
      runId: "run-a1000001",
    });

    expect(runEvaluation).toHaveBeenCalledTimes(6);

    expect(
      runEvaluation.mock.calls.map(
        ([taskId, , options]) => `${taskId}-${options.trialNumber}`,
      ),
    ).toEqual([
      "MB-01-1",
      "MB-01-2",
      "MB-02-1",
      "MB-02-2",
      "MB-03-1",
      "MB-03-2",
    ]);

    for (const call of runEvaluation.mock.calls) {
      expect(call[2].runId).toBe("run-a1000001");
    }

    expect(result.run_id).toBe("run-a1000001");
    expect(result.total_tasks).toBe(3);
    expect(result.total_trials).toBe(6);
    expect(result.results).toHaveLength(6);
    expect(result.status).toBe("completed");

    const manifest = readManifest("run-a1000001");

    expect(manifest.status).toBe("completed");
    expect(manifest.totals).toEqual({
      planned_trials: 6,
      completed_trials: 6,
      failed_trials: 0,
      not_started_trials: 0,
      running_trials: 0,
      pending_trials: 0,
    });
  });

  it("generates a run ID when one is not supplied", async () => {
    runEvaluation.mockImplementation(
      async (
        taskId: string,
        _adapter: ModelAdapter,
        options: { runId: string; trialNumber: number },
      ) => createResult(taskId, options.runId, options.trialNumber),
    );

    const result = await runEvaluationSuite(["MB-01"], adapter, {
      model: "mock-model",
      trials: 1,
    });

    expect(result.run_id).toMatch(/^run-[a-f0-9]{8}$/);
    expect(readManifest(result.run_id).run_id).toBe(result.run_id);
  });

  it("continues after transient model request failures", async () => {
    runEvaluation
      .mockRejectedValueOnce(
        new ModelRequestError(
          Object.assign(new Error("Temporary API failure."), {
            status: 503,
          }),
        ),
      )
      .mockImplementation(
        async (
          taskId: string,
          _adapter: ModelAdapter,
          options: { runId: string; trialNumber: number },
        ) => createResult(taskId, options.runId, options.trialNumber),
      );

    const result = await runEvaluationSuite(["MB-01"], adapter, {
      model: "mock-model",
      trials: 3,
      runId: "run-a1000002",
    });

    expect(runEvaluation).toHaveBeenCalledTimes(3);
    expect(result.results).toHaveLength(2);
    expect(result.status).toBe("completed_with_failures");

    const manifest = readManifest("run-a1000002");

    expect(
      manifest.tasks[0].trials.map((trial: { status: string }) => trial.status),
    ).toEqual(["failed", "completed", "completed"]);

    expect(manifest.tasks[0].trials[0]).toMatchObject({
      error_category: "transient",
      error_message: "Temporary API failure.",
      error_status: 503,
    });

    expect(manifest.totals).toMatchObject({
      planned_trials: 3,
      completed_trials: 2,
      failed_trials: 1,
      not_started_trials: 0,
    });
  });

  it("stops after a permanent model request failure", async () => {
    runEvaluation
      .mockResolvedValueOnce(createResult("MB-01", "run-a1000003", 1))
      .mockRejectedValueOnce(
        new ModelRequestError(
          Object.assign(new Error("Invalid API key."), {
            status: 401,
          }),
        ),
      );

    const result = await runEvaluationSuite(["MB-01", "MB-02"], adapter, {
      model: "mock-model",
      trials: 2,
      runId: "run-a1000003",
    });

    expect(runEvaluation).toHaveBeenCalledTimes(2);
    expect(result.results).toHaveLength(1);
    expect(result.status).toBe("failed");
    expect(result.fatal_error).toBe("Invalid API key.");

    const manifest = readManifest("run-a1000003");

    expect(manifest.status).toBe("failed");
    expect(
      manifest.tasks[0].trials.map((trial: { status: string }) => trial.status),
    ).toEqual(["completed", "failed"]);

    expect(manifest.tasks[1].status).toBe("not_started");
    expect(
      manifest.tasks[1].trials.map((trial: { status: string }) => trial.status),
    ).toEqual(["not_started", "not_started"]);

    expect(manifest.totals).toMatchObject({
      planned_trials: 4,
      completed_trials: 1,
      failed_trials: 1,
      not_started_trials: 2,
    });
  });

  it("stops after an unknown model request failure", async () => {
    runEvaluation.mockRejectedValueOnce(
      new ModelRequestError(new Error("Unexpected provider failure.")),
    );

    const result = await runEvaluationSuite(["MB-01", "MB-02"], adapter, {
      model: "mock-model",
      trials: 1,
      runId: "run-a1000004",
    });

    expect(runEvaluation).toHaveBeenCalledOnce();
    expect(result.status).toBe("failed");
    expect(result.fatal_error).toBe("Unexpected provider failure.");

    const manifest = readManifest("run-a1000004");

    expect(manifest.tasks[0].trials[0].error_category).toBe("unknown");
    expect(manifest.tasks[1].trials[0].status).toBe("not_started");
  });

  it("does not recover from non-request errors", async () => {
    runEvaluation.mockRejectedValueOnce(new Error("Result storage failed."));

    const result = await runEvaluationSuite(["MB-01", "MB-02"], adapter, {
      model: "mock-model",
      trials: 1,
      runId: "run-a1000005",
    });

    expect(runEvaluation).toHaveBeenCalledOnce();
    expect(result.status).toBe("failed");
    expect(result.fatal_error).toBe("Result storage failed.");

    const manifest = readManifest("run-a1000005");

    expect(manifest.tasks[0].trials[0].error_category).toBeUndefined();
    expect(manifest.tasks[1].trials[0].status).toBe("not_started");
  });

  it("rejects an empty task list", async () => {
    await expect(
      runEvaluationSuite([], adapter, {
        model: "mock-model",
        trials: 1,
      }),
    ).rejects.toThrow("Cannot run an evaluation suite with no tasks.");

    expect(runEvaluation).not.toHaveBeenCalled();
  });

  it("rejects duplicate task IDs", async () => {
    await expect(
      runEvaluationSuite(["MB-01", "MB-01"], adapter, {
        model: "mock-model",
        trials: 1,
      }),
    ).rejects.toThrow("Evaluation suite contains duplicate task IDs.");

    expect(runEvaluation).not.toHaveBeenCalled();
  });

  it("rejects zero trials", async () => {
    await expect(
      runEvaluationSuite(["MB-01"], adapter, {
        model: "mock-model",
        trials: 0,
      }),
    ).rejects.toThrow("Number of trials must be a positive integer.");

    expect(runEvaluation).not.toHaveBeenCalled();
  });

  it("rejects non-integer trial counts", async () => {
    await expect(
      runEvaluationSuite(["MB-01"], adapter, {
        model: "mock-model",
        trials: 1.5,
      }),
    ).rejects.toThrow("Number of trials must be a positive integer.");

    expect(runEvaluation).not.toHaveBeenCalled();
  });

  it("persists the running trial before calling runEvaluation", async () => {
    runEvaluation.mockImplementation(
      async (
        taskId: string,
        _adapter: ModelAdapter,
        options: { runId: string; trialNumber: number },
      ) => {
        const manifest = readManifest(options.runId);

        expect(manifest.status).toBe("running");
        expect(manifest.tasks[0].status).toBe("running");
        expect(manifest.tasks[0].trials[0].status).toBe("running");
        expect(manifest.totals.running_trials).toBe(1);
        expect(manifest.totals.pending_trials).toBe(0);

        return createResult(taskId, options.runId, options.trialNumber);
      },
    );

    await runEvaluationSuite(["MB-01"], adapter, {
      model: "mock-model",
      trials: 1,
      runId: "run-a1000006",
    });

    expect(runEvaluation).toHaveBeenCalledOnce();
  });

  it("propagates manifest persistence failures before model execution", async () => {
    vi.spyOn(manifestStorage, "updateRunManifest").mockImplementation(() => {
      throw new Error("Manifest persistence failed.");
    });

    await expect(
      runEvaluationSuite(["MB-01"], adapter, {
        model: "mock-model",
        trials: 1,
        runId: "run-a1000007",
      }),
    ).rejects.toThrow("Manifest persistence failed.");

    expect(runEvaluation).not.toHaveBeenCalled();
  });
});
