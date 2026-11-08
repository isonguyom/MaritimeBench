import { describe, expect, it, vi } from "vitest";

import type {
  ModelAdapter,
  ModelRequest,
  ModelResponse,
} from "../../src/adapters/model.adapter";

import { runMultipleTrials } from "../../src/runner/multi-trial.runner";

function createMockAdapter(): ModelAdapter & {
  generate: ReturnType<typeof vi.fn>;
} {
  const response = {
    task_id: "MB-01",
    status: "completed",
    total_travel_hours: 20,
    physical_eta: "2026-10-16T02:00:00Z",
    permitted_arrival: null,
    waiting_hours: null,
    deadline_feasible: null,
    missing_inputs: [],
    invalid_inputs: [],
    assumptions: [],
    explanation: "Travel time is 240 / 12 = 20 hours.",
  };

  return {
    provider: "mock",

    generate: vi.fn(async (_request: ModelRequest): Promise<ModelResponse> => ({
      provider: "mock",
      model: "mock-model",
      content: JSON.stringify(response),
      latencyMs: 100,
      inputTokens: 100,
      outputTokens: 50,
    })),
  };
}

describe("runMultipleTrials", () => {
  it("should run the requested number of trials with sequential numbering", async () => {
    const adapter = createMockAdapter();

    const result = await runMultipleTrials("MB-01", adapter, {
      model: "mock-model",
      trials: 3,
      runId: "run-001",
    });

    expect(result.run_id).toBe("run-001");
    expect(result.task_id).toBe("MB-01");
    expect(result.total_trials).toBe(3);
    expect(result.results).toHaveLength(3);

    expect(result.results.map((trial) => trial.trial_number)).toEqual([
      1, 2, 3,
    ]);

    expect(result.results.every((trial) => trial.run_id === "run-001")).toBe(
      true,
    );

    expect(result.results.every((trial) => trial.grading.score === 100)).toBe(
      true,
    );

    expect(adapter.generate).toHaveBeenCalledTimes(3);
  });

  it("should generate a shared run ID when none is supplied", async () => {
    const adapter = createMockAdapter();

    const result = await runMultipleTrials("MB-01", adapter, {
      model: "mock-model",
      trials: 2,
    });

    expect(result.run_id).toBeTruthy();

    expect(
      result.results.every((trial) => trial.run_id === result.run_id),
    ).toBe(true);

    expect(result.results.map((trial) => trial.trial_number)).toEqual([1, 2]);
  });

  it("should reject zero or invalid trial counts", async () => {
    const adapter = createMockAdapter();

    await expect(
      runMultipleTrials("MB-01", adapter, {
        model: "mock-model",
        trials: 0,
      }),
    ).rejects.toThrow("Number of trials must be a positive integer.");

    await expect(
      runMultipleTrials("MB-01", adapter, {
        model: "mock-model",
        trials: 1.5,
      }),
    ).rejects.toThrow("Number of trials must be a positive integer.");

    expect(adapter.generate).not.toHaveBeenCalled();
  });
});
