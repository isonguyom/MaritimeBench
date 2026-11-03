export interface CliOptions {
  taskId: string;
  provider: "mock" | "openai";
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
    throw new Error(
      `Invalid task ID: ${taskId}. Expected format: MB-01.`,
    );
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