import "dotenv/config";

import { MockAdapter } from "./adapters/mock.adapter";
import { OpenAIAdapter } from "./adapters/openai.adapter";
import { parseCliArguments, parseReportCliArguments } from "./runner/cli.args";
import { runEvaluation } from "./runner/evaluation.runner";
import { getMockResponse } from "./adapters/mock.responses";
import { loadEvaluationData } from "./runner/data.loader";
import {
  generateBenchmarkSummaryJson,
  generateTaskSummaryCsv,
  loadTrialRecords,
} from "./runner/report.generator";

async function main(): Promise<void> {
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

      const csvPath = generateTaskSummaryCsv(trials, tasks);
      const jsonPath = generateBenchmarkSummaryJson(trials, tasks);

      console.log("");
      console.log("Reports generated successfully.");
      console.log(`Run ID: ${runId}`);
      console.log(`Trials included: ${trials.length}`);
      console.log(`Task summary: ${csvPath}`);
      console.log(`Benchmark summary: ${jsonPath}`);

      return;
    }

    const options = parseCliArguments(args);

    console.log(`Task: ${options.taskId}`);
    console.log(`Provider: ${options.provider}`);
    console.log("");

    const adapter =
      options.provider === "mock"
        ? new MockAdapter(getMockResponse(options.taskId))
        : new OpenAIAdapter();

    const model =
      options.provider === "mock" ? "mock-model" : process.env.OPENAI_MODEL;

    if (!model) {
      throw new Error("OPENAI_MODEL is missing from your .env file.");
    }

    console.log("Running evaluation...");

    const result = await runEvaluation(options.taskId, adapter, { model });

    console.log("");
    console.log("Evaluation completed.");
    console.log(`Score: ${result.grading.score}%`);
    console.log(`Passed: ${result.grading.task_passed}`);
    console.log(`Latency: ${result.latency_ms} ms`);
    console.log(`Result saved for ${result.task_id}.`);
  } catch (error) {
    console.error("");
    console.error(
      "MaritimeBench failed:",
      error instanceof Error ? error.message : String(error),
    );

    process.exitCode = 1;
  }
}

void main();
