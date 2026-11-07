export interface CliOptions {
  taskId: string;
  provider: "mock" | "openai";
}

export interface ReportCliOptions {
  runId: string;
}

export function parseCliArguments(args: string[]): CliOptions {
  let taskId: string | undefined;
  let provider: string | undefined;

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];

    if (argument === "--task") {
      taskId = args[index + 1];
      index++;
    } else if (argument === "--provider") {
      provider = args[index + 1];
      index++;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!taskId) {
    throw new Error("Missing required argument: --task");
  }

  if (!/^MB-\d{2}$/.test(taskId)) {
    throw new Error(`Invalid task ID: ${taskId}. Expected format: MB-01.`);
  }

  if (!provider) {
    throw new Error("Missing required argument: --provider");
  }

  if (provider !== "mock" && provider !== "openai") {
    throw new Error(
      `Invalid provider: ${provider}. Supported providers: mock, openai.`,
    );
  }

  return {
    taskId,
    provider,
  };
}

export function parseReportCliArguments(args: string[]): ReportCliOptions {
  const reportFlagCount = args.filter(
    (argument) => argument === "--report",
  ).length;

  const runIdFlagCount = args.filter(
    (argument) => argument === "--run-id",
  ).length;

  if (reportFlagCount !== 1) {
    throw new Error("Expected exactly one --report argument.");
  }

  if (runIdFlagCount > 1) {
    throw new Error("Duplicate argument: --run-id.");
  }

  const reportIndex = args.indexOf("--report");
  const runIdIndex = args.indexOf("--run-id");

  const unexpectedArguments = args.filter(
    (argument, index) =>
      index !== reportIndex &&
      index !== runIdIndex &&
      (runIdIndex === -1 || index !== runIdIndex + 1),
  );

  if (unexpectedArguments.length > 0) {
    throw new Error(`Unexpected report argument: ${unexpectedArguments[0]}`);
  }

  if (runIdIndex === -1) {
    throw new Error(
      "Missing required argument: --run-id. Specify the experiment to report.",
    );
  }

  const runId = args[runIdIndex + 1];

  if (!runId || runId.startsWith("--")) {
    throw new Error("Missing value for --run-id.");
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(runId)) {
    throw new Error(
      "Invalid run ID. Use only letters, numbers, hyphens, and underscores.",
    );
  }

  return { runId };
}
