export interface CliOptions {
  taskId?: string;
  suite?: "all";
  provider: "mock" | "openai";
  trials: number;
}

export interface ReportCliOptions {
  runId: string;
}

export function parseCliArguments(
  args: string[],
  defaultProvider: "mock" | "openai" = "mock",
): CliOptions {
  let taskId: string | undefined;
  let suite: string | undefined;
  let provider: string | undefined;
  let trialsValue: string | undefined;

  const seenArguments = new Set<string>();

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];

    if (
      argument !== "--task" &&
      argument !== "--suite" &&
      argument !== "--provider" &&
      argument !== "--trials"
    ) {
      throw new Error(`Unknown argument: ${argument}`);
    }

    if (seenArguments.has(argument)) {
      throw new Error(`Duplicate argument: ${argument}.`);
    }

    seenArguments.add(argument);

    const value = args[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}.`);
    }

    switch (argument) {
      case "--task":
        taskId = value;
        break;

      case "--suite":
        suite = value;
        break;

      case "--provider":
        provider = value;
        break;

      case "--trials":
        trialsValue = value;
        break;
    }

    index++;
  }

  if (taskId && suite) {
    throw new Error("Use either --task or --suite, not both.");
  }

  if (!taskId && !suite) {
    suite = "all";
  }

  if (taskId && !/^MB-\d{2}$/.test(taskId)) {
    throw new Error(`Invalid task ID: ${taskId}. Expected format: MB-01.`);
  }

  if (suite && suite !== "all") {
    throw new Error(`Invalid suite: ${suite}. Supported suites: all.`);
  }

  const selectedProvider = provider ?? defaultProvider;

  if (selectedProvider !== "mock" && selectedProvider !== "openai") {
    throw new Error(
      `Invalid provider: ${selectedProvider}. Supported providers: mock, openai.`,
    );
  }

  let trials = 1;

  if (trialsValue !== undefined) {
    if (!/^\d+$/.test(trialsValue)) {
      throw new Error("Invalid trial count. Expected a positive integer.");
    }

    trials = Number(trialsValue);

    if (!Number.isSafeInteger(trials) || trials < 1) {
      throw new Error("Invalid trial count. Expected a positive integer.");
    }
  }

  return {
    ...(taskId ? { taskId } : {}),
    ...(suite ? { suite: suite as "all" } : {}),
    provider: selectedProvider,
    trials,
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
