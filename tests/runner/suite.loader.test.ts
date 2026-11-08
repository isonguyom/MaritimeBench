import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { discoverEvaluationTasks } from "../../src/runner/suite.loader";
import { loadEvaluationData } from "../../src/runner/data.loader";

vi.mock("../../src/runner/data.loader", () => ({
  loadEvaluationData: vi.fn(),
}));

describe("discoverEvaluationTasks", () => {
  const originalDirectory = process.cwd();
  let temporaryDirectory: string;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(
      path.join(os.tmpdir(), "maritimebench-loader-"),
    );

    mkdirSync(path.join(temporaryDirectory, "data", "tasks"), {
      recursive: true,
    });

    for (let index = 1; index <= 9; index++) {
      const taskId = `MB-${String(index).padStart(2, "0")}`;

      writeFileSync(
        path.join(temporaryDirectory, "data", "tasks", `${taskId}.json`),
        "{}",
      );
    }

    process.chdir(temporaryDirectory);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    process.chdir(originalDirectory);

    if (temporaryDirectory && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("discovers and sorts valid task IDs", () => {
    vi.mocked(loadEvaluationData).mockReturnValue(
      {} as ReturnType<typeof loadEvaluationData>,
    );

    const taskIds = discoverEvaluationTasks();

    expect(taskIds).toEqual([
      "MB-01",
      "MB-02",
      "MB-03",
      "MB-04",
      "MB-05",
      "MB-06",
      "MB-07",
      "MB-08",
      "MB-09",
    ]);

    expect(loadEvaluationData).toHaveBeenCalledTimes(9);

    for (const taskId of taskIds) {
      expect(loadEvaluationData).toHaveBeenCalledWith(taskId);
    }
  });

  it("validates every discovered task against its reference", () => {
    vi.mocked(loadEvaluationData).mockReturnValue(
      {} as ReturnType<typeof loadEvaluationData>,
    );

    const taskIds = discoverEvaluationTasks();

    expect(loadEvaluationData).toHaveBeenCalledTimes(taskIds.length);

    for (const taskId of taskIds) {
      expect(loadEvaluationData).toHaveBeenCalledWith(taskId);
    }
  });

  it("rejects a task whose reference validation fails", () => {
    vi.mocked(loadEvaluationData).mockImplementation((taskId) => {
      if (taskId === "MB-03") {
        throw new Error("Reference file is missing.");
      }

      return {} as ReturnType<typeof loadEvaluationData>;
    });

    expect(() => discoverEvaluationTasks()).toThrow(
      "Suite validation failed for MB-03: Reference file is missing.",
    );
  });

  it("rejects an empty task directory", () => {
    const tasksDirectory = path.join(temporaryDirectory, "data", "tasks");

    for (const file of readdirSync(tasksDirectory)) {
      rmSync(path.join(tasksDirectory, file));
    }

    expect(() => discoverEvaluationTasks()).toThrow(
      "No valid evaluation tasks found in data/tasks.",
    );

    expect(loadEvaluationData).not.toHaveBeenCalled();
  });

  it("ignores unrelated files and invalid task filenames", () => {
    const tasksDirectory = path.join(temporaryDirectory, "data", "tasks");

    for (const file of readdirSync(tasksDirectory)) {
      rmSync(path.join(tasksDirectory, file));
    }

    writeFileSync(path.join(tasksDirectory, "README.md"), "Documentation");
    writeFileSync(path.join(tasksDirectory, "notes.json"), "{}");
    writeFileSync(path.join(tasksDirectory, "MB-1.json"), "{}");
    writeFileSync(path.join(tasksDirectory, "MB-100.json"), "{}");
    mkdirSync(path.join(tasksDirectory, "MB-10.json"));

    vi.mocked(loadEvaluationData).mockReturnValue(
      {} as ReturnType<typeof loadEvaluationData>,
    );

    expect(() => discoverEvaluationTasks()).toThrow(
      "No valid evaluation tasks found in data/tasks.",
    );

    expect(loadEvaluationData).not.toHaveBeenCalled();
  });
});
