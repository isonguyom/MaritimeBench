import { describe, expect, it } from "vitest";
import {
  parseCliArguments,
  parseReportCliArguments,
} from "../../src/runner/cli.args";

describe("parseCliArguments", () => {
  it("parses a single task using the default mock provider", () => {
    expect(parseCliArguments(["--task", "MB-01"])).toEqual({
      taskId: "MB-01",
      provider: "mock",
      trials: 1,
    });
  });

  it("parses a single task with an explicit provider", () => {
    expect(
      parseCliArguments(["--task", "MB-08", "--provider", "openai"]),
    ).toEqual({
      taskId: "MB-08",
      provider: "openai",
      trials: 1,
    });
  });

  it("uses the supplied default provider", () => {
    expect(parseCliArguments(["--task", "MB-01"], "openai")).toEqual({
      taskId: "MB-01",
      provider: "openai",
      trials: 1,
    });
  });

  it("parses a full suite selection", () => {
    expect(parseCliArguments(["--suite", "all"])).toEqual({
      suite: "all",
      provider: "mock",
      trials: 1,
    });
  });

  it("parses a custom trial count", () => {
    expect(parseCliArguments(["--suite", "all", "--trials", "5"])).toEqual({
      suite: "all",
      provider: "mock",
      trials: 5,
    });
  });

  it("parses task, provider, and trial arguments together", () => {
    expect(
      parseCliArguments([
        "--task",
        "MB-03",
        "--provider",
        "openai",
        "--trials",
        "3",
      ]),
    ).toEqual({
      taskId: "MB-03",
      provider: "openai",
      trials: 3,
    });
  });

  it("defaults to the full suite when no task or suite is specified", () => {
    expect(parseCliArguments([])).toEqual({
      suite: "all",
      provider: "mock",
      trials: 1,
    });
  });

  it("rejects selecting both a task and a suite", () => {
    expect(() =>
      parseCliArguments(["--task", "MB-01", "--suite", "all"]),
    ).toThrow("Use either --task or --suite, not both.");
  });

  it("rejects an invalid task ID", () => {
    expect(() => parseCliArguments(["--task", "MB-1"])).toThrow(
      "Invalid task ID",
    );
  });

  it("rejects an unsupported suite", () => {
    expect(() => parseCliArguments(["--suite", "weather"])).toThrow(
      "Invalid suite",
    );
  });

  it("rejects an unsupported provider", () => {
    expect(() =>
      parseCliArguments(["--task", "MB-01", "--provider", "gemini"]),
    ).toThrow("Invalid provider");
  });

  it("rejects a missing value for an argument", () => {
    expect(() => parseCliArguments(["--task", "MB-01", "--trials"])).toThrow(
      "Missing value for --trials.",
    );
  });

  it("rejects a trial count of zero", () => {
    expect(() =>
      parseCliArguments(["--suite", "all", "--trials", "0"]),
    ).toThrow("Invalid trial count");
  });

  it("rejects a negative trial count", () => {
    expect(() =>
      parseCliArguments(["--suite", "all", "--trials", "-2"]),
    ).toThrow("Invalid trial count");
  });

  it("rejects a decimal trial count", () => {
    expect(() =>
      parseCliArguments(["--suite", "all", "--trials", "2.5"]),
    ).toThrow("Invalid trial count");
  });

  it("rejects a non-numeric trial count", () => {
    expect(() =>
      parseCliArguments(["--suite", "all", "--trials", "three"]),
    ).toThrow("Invalid trial count");
  });

  it("rejects duplicate arguments", () => {
    expect(() =>
      parseCliArguments([
        "--task",
        "MB-01",
        "--provider",
        "mock",
        "--provider",
        "openai",
      ]),
    ).toThrow("Duplicate argument: --provider.");
  });

  it("rejects unknown arguments", () => {
    expect(() => parseCliArguments(["--task", "MB-01", "--unknown"])).toThrow(
      "Unknown argument: --unknown",
    );
  });
});

describe("parseReportCliArguments", () => {
  it("parses a valid report command", () => {
    expect(
      parseReportCliArguments(["--report", "--run-id", "run-001"]),
    ).toEqual({
      runId: "run-001",
    });
  });

  it("rejects a missing report flag", () => {
    expect(() => parseReportCliArguments(["--run-id", "run-001"])).toThrow(
      "Expected exactly one --report argument.",
    );
  });

  it("rejects a duplicate report flag", () => {
    expect(() =>
      parseReportCliArguments(["--report", "--report", "--run-id", "run-001"]),
    ).toThrow("Expected exactly one --report argument.");
  });

  it("rejects a missing run ID flag", () => {
    expect(() => parseReportCliArguments(["--report"])).toThrow(
      "Missing required argument: --run-id",
    );
  });

  it("rejects a duplicate run ID flag", () => {
    expect(() =>
      parseReportCliArguments([
        "--report",
        "--run-id",
        "run-001",
        "--run-id",
        "experiment-002",
      ]),
    ).toThrow("Duplicate argument: --run-id.");
  });

  it("rejects a missing run ID value", () => {
    expect(() => parseReportCliArguments(["--report", "--run-id"])).toThrow(
      "Missing value for --run-id.",
    );
  });

  it("rejects a run ID value that looks like another flag", () => {
    expect(() =>
      parseReportCliArguments(["--report", "--run-id", "--unknown"]),
    ).toThrow("Missing value for --run-id.");
  });

  it("rejects unexpected arguments", () => {
    expect(() =>
      parseReportCliArguments(["--report", "--run-id", "run-001", "--unknown"]),
    ).toThrow("Unexpected report argument: --unknown");
  });

  it("rejects unexpected arguments when the run ID is missing", () => {
    expect(() => parseReportCliArguments(["--unknown", "--report"])).toThrow(
      "Unexpected report argument: --unknown",
    );
  });
});
