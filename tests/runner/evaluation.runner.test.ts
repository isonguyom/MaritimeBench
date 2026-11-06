import { describe, expect, it, vi } from "vitest";
import type {
  ModelAdapter,
  ModelRequest,
  ModelResponse,
} from "../../src/adapters/model.adapter";
import { runEvaluation } from "../../src/runner/evaluation.runner";

import { MockAdapter } from "../../src/adapters/mock.adapter";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

function createMockAdapter(
  content: string,
): ModelAdapter & { generate: ReturnType<typeof vi.fn> } {
  return {
    provider: "mock-provider",

    generate: vi.fn(async (_request: ModelRequest): Promise<ModelResponse> => ({
      provider: "mock-provider",
      model: "mock-model",
      content,
      latencyMs: 120,
      inputTokens: 100,
      outputTokens: 50,
    })),
  };
}

describe("runEvaluation", () => {
  it("should run and grade a correct MB-01 response", async () => {
    const mockResponse = {
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
      explanation:
        "The vessel travels 240 nautical miles at 12 knots. Travel time is 20 hours.",
    };

    const adapter = createMockAdapter(JSON.stringify(mockResponse));

    const result = await runEvaluation("MB-01", adapter, {
      model: "mock-model",
    });

    expect(result.task_id).toBe("MB-01");
    expect(result.provider).toBe("mock-provider");
    expect(result.model).toBe("mock-model");
    expect(result.latency_ms).toBe(120);

    expect(result.grading.valid_response).toBe(true);
    expect(result.grading.score).toBe(100);
    expect(result.grading.task_passed).toBe(true);

    expect(result.parse_error).toBeNull();
    expect(adapter.generate).toHaveBeenCalledOnce();
  });

  it("should generate run metadata when none is supplied", async () => {
    const adapter = createMockAdapter("{}");

    const result = await runEvaluation("MB-01", adapter, {
      model: "mock-model",
    });

    expect(result.run_id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.trial_number).toBe(1);

    expect(result.started_at).toBeDefined();
    expect(result.completed_at).toBeDefined();

    expect(new Date(result.started_at!).toISOString()).toBe(result.started_at);

    expect(new Date(result.completed_at!).toISOString()).toBe(
      result.completed_at,
    );

    expect(new Date(result.completed_at!).getTime()).toBeGreaterThanOrEqual(
      new Date(result.started_at!).getTime(),
    );
  });

  it("should preserve a supplied run ID and trial number", async () => {
    const adapter = createMockAdapter("{}");

    const result = await runEvaluation("MB-01", adapter, {
      model: "mock-model",
      runId: "experiment-001",
      trialNumber: 3,
    });

    expect(result.run_id).toBe("experiment-001");
    expect(result.trial_number).toBe(3);
  });

  it("should pass generation settings to the model adapter", async () => {
    const adapter = createMockAdapter("{}");

    await runEvaluation("MB-01", adapter, {
      model: "mock-model",
      temperature: 0,
      maxOutputTokens: 500,
    });

    expect(adapter.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-model",
        temperature: 0,
        maxOutputTokens: 500,
      }),
    );
  });

  it("should record invalid JSON and return an unsuccessful grade", async () => {
    const adapter = createMockAdapter("This is not valid JSON.");

    const result = await runEvaluation("MB-01", adapter, {
      model: "mock-model",
    });

    expect(result.parse_error).not.toBeNull();
    expect(result.raw_response).toBe("This is not valid JSON.");
    expect(result.grading.valid_response).toBe(false);
    expect(result.grading.score).toBe(0);
    expect(result.grading.task_passed).toBe(false);
  });

  it("should not send reference answers to the model", async () => {
    const adapter = createMockAdapter("{}");

    await runEvaluation("MB-01", adapter, {
      model: "mock-model",
    });

    const request = adapter.generate.mock.calls[0][0];

    expect(request.userPrompt).toContain("MB-01");
    expect(request.userPrompt).not.toContain("2026-10-16T02:00:00Z");
    expect(request.userPrompt).not.toContain("total_travel_hours");
  });

  it("should run a complete evaluation using MockAdapter and save the result", async () => {
    const mockResponse = {
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

    const adapter = new MockAdapter(JSON.stringify(mockResponse));

    const result = await runEvaluation("MB-01", adapter, {
      model: "mock-model",
    });

    const resultsDirectory = path.resolve(process.cwd(), "results");

    const savedFiles = readdirSync(resultsDirectory).filter(
      (filename) =>
        filename.startsWith(`MB-01_${result.run_id}_trial-1_`) &&
        filename.endsWith(".json"),
    );

    expect(result.grading.score).toBe(100);
    expect(result.grading.task_passed).toBe(true);
    expect(savedFiles.length).toBeGreaterThan(0);

    const savedFile = path.join(
      resultsDirectory,
      savedFiles[savedFiles.length - 1],
    );

    expect(existsSync(savedFile)).toBe(true);

    const savedResult = JSON.parse(readFileSync(savedFile, "utf-8"));

    expect(savedResult.task_id).toBe("MB-01");
    expect(savedResult.provider).toBe("mock");
    expect(savedResult.grading.score).toBe(100);
    expect(savedResult.run_id).toBe(result.run_id);
    expect(savedResult.trial_number).toBe(1);
    expect(savedResult.started_at).toBe(result.started_at);
    expect(savedResult.completed_at).toBe(result.completed_at);
  });
});
