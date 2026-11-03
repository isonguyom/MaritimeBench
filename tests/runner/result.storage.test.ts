import { afterEach, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { saveEvaluationResult } from "../../src/runner/result.storage";
import type { EvaluationRunResult } from "../../src/runner/evaluation.runner";

describe("saveEvaluationResult", () => {
  const originalDirectory = process.cwd();
  let temporaryDirectory: string;

  afterEach(() => {
    process.chdir(originalDirectory);

    if (temporaryDirectory && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("saves an evaluation result as formatted JSON", () => {
    temporaryDirectory = mkdtempSync(
      path.join(os.tmpdir(), "maritimebench-"),
    );

    process.chdir(temporaryDirectory);

    const result: EvaluationRunResult = {
      task_id: "MB-01",
      provider: "mock",
      model: "test-model",
      latency_ms: 120,
      raw_response: '{"task_id":"MB-01"}',
      parse_error: null,
      grading: {
        task_id: "MB-01",
        valid_response: true,
        score: 100,
        passed_checks: 5,
        total_checks: 5,
        task_passed: true,
        checks: [],
        errors: [],
      },
    };

    const savedPath = saveEvaluationResult(result);
    const savedContent = JSON.parse(
      readFileSync(savedPath, "utf-8"),
    );

    expect(existsSync(savedPath)).toBe(true);
    expect(savedContent).toEqual(result);
    expect(savedPath).toContain("MB-01_");
  });

  it("creates the results directory when it does not exist", () => {
    temporaryDirectory = mkdtempSync(
      path.join(os.tmpdir(), "maritimebench-"),
    );

    process.chdir(temporaryDirectory);

    const result: EvaluationRunResult = {
      task_id: "MB-01",
      provider: "mock",
      model: "test-model",
      latency_ms: 120,
      raw_response: "{}",
      parse_error: null,
      grading: {
        task_id: "MB-01",
        valid_response: true,
        score: 100,
        passed_checks: 5,
        total_checks: 5,
        task_passed: true,
        checks: [],
        errors: [],
      },
    };

    saveEvaluationResult(result);

    expect(existsSync(path.join(temporaryDirectory, "results"))).toBe(true);
  });
});