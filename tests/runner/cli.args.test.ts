import { describe, expect, it } from "vitest";
import {
  parseCliArguments,
  parseReportCliArguments,
} from "../../src/runner/cli.args";

describe("parseCliArguments", () => {
  it("parses valid task and mock provider arguments", () => {
    expect(
      parseCliArguments(["--task", "MB-01", "--provider", "mock"]),
    ).toEqual({
      taskId: "MB-01",
      provider: "mock",
    });
  });

  it("parses valid task and OpenAI provider arguments", () => {
    expect(
      parseCliArguments(["--task", "MB-08", "--provider", "openai"]),
    ).toEqual({
      taskId: "MB-08",
      provider: "openai",
    });
  });

  it("rejects a missing task argument", () => {
    expect(() =>
      parseCliArguments(["--provider", "mock"]),
    ).toThrow("Missing required argument: --task");
  });

  it("rejects a missing provider argument", () => {
    expect(() =>
      parseCliArguments(["--task", "MB-01"]),
    ).toThrow("Missing required argument: --provider");
  });

  it("rejects an invalid task ID", () => {
    expect(() =>
      parseCliArguments(["--task", "MB-1", "--provider", "mock"]),
    ).toThrow("Invalid task ID");
  });

  it("rejects an unsupported provider", () => {
    expect(() =>
      parseCliArguments(["--task", "MB-01", "--provider", "gemini"]),
    ).toThrow("Invalid provider");
  });

  it("rejects unknown arguments", () => {
    expect(() =>
      parseCliArguments([
        "--task",
        "MB-01",
        "--provider",
        "mock",
        "--unknown",
      ]),
    ).toThrow("Unknown argument");
  });
});

describe("parseReportCliArguments", () => {
  it("parses a valid report command", () => {
    expect(
      parseReportCliArguments([
        "--report",
        "--run-id",
        "experiment-001",
      ]),
    ).toEqual({
      runId: "experiment-001",
    });
  });

  it("rejects a missing report flag", () => {
    expect(() =>
      parseReportCliArguments(["--run-id", "experiment-001"]),
    ).toThrow("Expected exactly one --report argument.");
  });

  it("rejects a duplicate report flag", () => {
    expect(() =>
      parseReportCliArguments([
        "--report",
        "--report",
        "--run-id",
        "experiment-001",
      ]),
    ).toThrow("Expected exactly one --report argument.");
  });

  it("rejects a missing run ID flag", () => {
    expect(() =>
      parseReportCliArguments(["--report"]),
    ).toThrow("Missing required argument: --run-id");
  });

  it("rejects a duplicate run ID flag", () => {
    expect(() =>
      parseReportCliArguments([
        "--report",
        "--run-id",
        "experiment-001",
        "--run-id",
        "experiment-002",
      ]),
    ).toThrow("Duplicate argument: --run-id.");
  });

  it("rejects a missing run ID value", () => {
    expect(() =>
      parseReportCliArguments(["--report", "--run-id"]),
    ).toThrow("Missing value for --run-id.");
  });

  it("rejects a run ID value that looks like another flag", () => {
    expect(() =>
      parseReportCliArguments(["--report", "--run-id", "--unknown"]),
    ).toThrow("Missing value for --run-id.");
  });

  it("rejects unexpected arguments", () => {
    expect(() =>
      parseReportCliArguments([
        "--report",
        "--run-id",
        "experiment-001",
        "--unknown",
      ]),
    ).toThrow("Unexpected report argument: --unknown");
  });

  it("rejects unexpected arguments when the run ID is missing", () => {
    expect(() =>
      parseReportCliArguments(["--unknown", "--report"]),
    ).toThrow("Unexpected report argument: --unknown");
  });
});