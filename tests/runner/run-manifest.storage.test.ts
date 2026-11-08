import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createRunManifest,
  updateRunManifest,
  type RunManifest,
} from "../../src/runner/run-manifest.storage";

describe("run manifest storage", () => {
  const originalDirectory = process.cwd();
  let temporaryDirectory: string;

  function createManifest(): RunManifest {
    return {
      run_id: "run-a1b2c3d4",
      provider: "mock",
      model: "test-model",
      started_at: "2026-11-07T10:00:00.000Z",
      status: "running",
      totals: {
        planned_trials: 2,
        completed_trials: 0,
        failed_trials: 0,
        not_started_trials: 0,
        running_trials: 0,
        pending_trials: 2,
      },
      tasks: [
        {
          task_id: "MB-01",
          status: "pending",
          trials: [
            { trial_number: 1, status: "pending" },
            { trial_number: 2, status: "pending" },
          ],
        },
      ],
    };
  }

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(
      path.join(os.tmpdir(), "maritimebench-manifest-"),
    );

    process.chdir(temporaryDirectory);
  });

  afterEach(() => {
    process.chdir(originalDirectory);

    if (temporaryDirectory && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("creates a formatted manifest in results/manifests", () => {
    const manifest = createManifest();
    const savedPath = createRunManifest(manifest);

    expect(existsSync(savedPath)).toBe(true);
    expect(savedPath).toContain(
      path.join("results", "manifests", "run-a1b2c3d4.json"),
    );
    expect(JSON.parse(readFileSync(savedPath, "utf-8"))).toEqual(manifest);
    expect(readdirSync(path.dirname(savedPath))).toEqual(["run-a1b2c3d4.json"]);
  });

  it("creates the manifest directory when it does not exist", () => {
    createRunManifest(createManifest());

    expect(
      existsSync(path.join(temporaryDirectory, "results", "manifests")),
    ).toBe(true);
  });

  it("refuses to overwrite an existing manifest", () => {
    const manifest = createManifest();

    createRunManifest(manifest);

    expect(() => createRunManifest(manifest)).toThrow();
  });

  it("updates an existing manifest", () => {
    const manifest = createManifest();
    const savedPath = createRunManifest(manifest);

    manifest.status = "completed";
    manifest.completed_at = "2026-11-07T10:05:00.000Z";
    manifest.totals.completed_trials = 2;
    manifest.totals.pending_trials = 0;

    updateRunManifest(manifest);

    expect(JSON.parse(readFileSync(savedPath, "utf-8"))).toEqual(manifest);
    expect(readdirSync(path.dirname(savedPath))).toEqual(["run-a1b2c3d4.json"]);
  });

  it("refuses to update a manifest that does not exist", () => {
    expect(() => updateRunManifest(createManifest())).toThrow(
      "Run manifest does not exist: run-a1b2c3d4",
    );
  });

  it("rejects an invalid run ID when creating a manifest", () => {
    const manifest = createManifest();
    manifest.run_id = "../outside";

    expect(() => createRunManifest(manifest)).toThrow(
      "Invalid run ID: ../outside",
    );

    expect(existsSync(path.join(temporaryDirectory, "outside.json"))).toBe(
      false,
    );
  });

  it("rejects an invalid run ID when updating a manifest", () => {
    const manifest = createManifest();
    manifest.run_id = "../outside";

    expect(() => updateRunManifest(manifest)).toThrow(
      "Invalid run ID: ../outside",
    );
  });
});
