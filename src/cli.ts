import "dotenv/config";

import path from "node:path";

import { MockAdapter } from "./adapters/mock.adapter";
import { OpenAIAdapter } from "./adapters/openai.adapter";
import { parseCliArguments, parseReportCliArguments } from "./runner/cli.args";
import { discoverEvaluationTasks } from "./runner/suite.loader";
import { runEvaluationSuite } from "./runner/suite.runner";
import { loadEvaluationData } from "./runner/data.loader";
import {
  generateBenchmarkSummaryJson,
  generateTaskSummaryCsv,
  loadTrialRecords,
} from "./runner/report.generator";

export async function main(defaultProvider: "mock" | "openai"): Promise<void> {
  console.log("=================================");
  console.log("       MARITIMEBENCH");
  console.log("=================================");
  console.log("Beyond ETA: Evaluating AI in Operational Voyage Planning");
  console.log("");

  try {
    const args = process.argv.slice(2);

    if (args.includes("--report")) {
      console.log("Generating benchmark reports...");

      const { runId } = parseReportCliArguments(args);
      const trials = loadTrialRecords(undefined, runId);

      if (trials.length === 0) {
        throw new Error(`No saved trial records found for run ID: ${runId}`);
      }

      const taskIds = [...new Set(trials.map((trial) => trial.task_id))];
      const tasks = taskIds.map((taskId) => loadEvaluationData(taskId).task);

      const reportDirectory = path.resolve(
        process.cwd(),
        "results",
        "reports",
        runId,
      );

      const csvPath = generateTaskSummaryCsv(trials, tasks, reportDirectory);

      const jsonPath = generateBenchmarkSummaryJson(
        trials,
        tasks,
        reportDirectory,
      );

      console.log("");
      console.log("Reports generated successfully.");
      console.log(`Run ID: ${runId}`);
      console.log(`Trials included: ${trials.length}`);
      console.log(`Task summary: ${csvPath}`);
      console.log(`Benchmark summary: ${jsonPath}`);

      return;
    }

    const options = parseCliArguments(args, defaultProvider);

    const taskIds = options.taskId
      ? [options.taskId]
      : discoverEvaluationTasks();

    const model =
      options.provider === "mock" ? "mock-model" : process.env.OPENAI_MODEL;

    if (!model) {
      throw new Error("OPENAI_MODEL is missing from your .env file.");
    }

    const adapter =
      options.provider === "mock" ? new MockAdapter() : new OpenAIAdapter();

    console.log(`Mode: ${options.taskId ? "Single task" : "Full suite"}`);
    console.log(`Tasks: ${taskIds.length}`);
    console.log(`Provider: ${options.provider}`);
    console.log(`Model: ${model}`);
    console.log(`Trials per task: ${options.trials}`);
    console.log("");

    console.log("Running evaluation...");

    const result = await runEvaluationSuite(taskIds, adapter, {
      model,
      trials: options.trials,
    });

    console.log("");
    console.log("Evaluation finished.");
    console.log(`Run ID: ${result.run_id}`);
    console.log(`Status: ${result.status}`);
    console.log(`Tasks: ${result.total_tasks}`);
    console.log(`Completed trials: ${result.total_trials}`);
    console.log(`Manifest: ${result.manifest_path}`);

    for (const taskResult of result.task_results) {
      const passed = taskResult.results.filter(
        (trial) => trial.grading.task_passed,
      ).length;

      console.log(
        `${taskResult.task_id}: ${passed}/${taskResult.total_trials} passed`,
      );
    }

    if (result.fatal_error) {
      console.error(`Fatal error: ${result.fatal_error}`);
      process.exitCode = 1;
    } else if (result.status === "completed_with_failures") {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("");
    console.error(
      "MaritimeBench failed:",
      error instanceof Error ? error.message : String(error),
    );

    process.exitCode = 1;
  }
}
