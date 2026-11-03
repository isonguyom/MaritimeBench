import { describe, expect, it } from "vitest";
import { parseCliArguments } from "../../src/runner/cli.args";

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