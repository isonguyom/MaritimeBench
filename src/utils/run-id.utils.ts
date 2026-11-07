import { randomUUID } from "node:crypto";

export function generateRunId(): string {
  return `run-${randomUUID().slice(0, 8)}`;
}