import {
  existsSync,
  linkSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { TrialErrorCategory } from "./trial-error.classifier";

const RUN_ID_PATTERN = /^run-[0-9a-f]{8}$/i;

function validateRunId(runId: string): void {
  if (!RUN_ID_PATTERN.test(runId)) {
    throw new Error(`Invalid run ID: ${runId}`);
  }
}

export type RunManifestStatus =
  "running" | "completed" | "completed_with_failures" | "failed";

export type TaskManifestStatus =
  | "pending"
  | "running"
  | "completed"
  | "completed_with_failures"
  | "failed"
  | "not_started";

export type TrialManifestStatus =
  "pending" | "running" | "completed" | "failed" | "not_started";

export interface TrialManifestRecord {
  trial_number: number;
  status: TrialManifestStatus;
  started_at?: string;
  completed_at?: string;
  error_category?: TrialErrorCategory;
  error_message?: string;
  error_status?: number;
}

export interface TaskManifestRecord {
  task_id: string;
  status: TaskManifestStatus;
  trials: TrialManifestRecord[];
}

export interface RunManifest {
  run_id: string;
  provider: string;
  model: string;
  temperature?: number;
  max_output_tokens?: number;
  started_at: string;
  completed_at?: string;
  status: RunManifestStatus;
  totals: {
    planned_trials: number;
    completed_trials: number;
    failed_trials: number;
    not_started_trials: number;
    running_trials: number;
    pending_trials: number;
  };
  tasks: TaskManifestRecord[];
}

function getManifestPath(runId: string): string {
  validateRunId(runId);
  return path.resolve(process.cwd(), "results", "manifests", `${runId}.json`);
}

function writeTemporaryManifest(
  filePath: string,
  manifest: RunManifest,
): string {
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;

  writeFileSync(temporaryPath, JSON.stringify(manifest, null, 2), {
    encoding: "utf-8",
    flag: "wx",
  });

  return temporaryPath;
}

export function createRunManifest(manifest: RunManifest): string {
  const directory = path.dirname(getManifestPath(manifest.run_id));
  const filePath = getManifestPath(manifest.run_id);

  mkdirSync(directory, { recursive: true });

  const temporaryPath = writeTemporaryManifest(filePath, manifest);

  try {
    // Hard-link creation is atomic and refuses to overwrite an existing run.
    linkSync(temporaryPath, filePath);
  } finally {
    if (existsSync(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
  }

  return filePath;
}

export function updateRunManifest(manifest: RunManifest): string {
  const filePath = getManifestPath(manifest.run_id);

  if (!existsSync(filePath)) {
    throw new Error(`Run manifest does not exist: ${manifest.run_id}`);
  }

  const temporaryPath = writeTemporaryManifest(filePath, manifest);

  try {
    // Replace the previous manifest only after the new file is complete.
    renameSync(temporaryPath, filePath);
  } finally {
    if (existsSync(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
  }

  return filePath;
}
