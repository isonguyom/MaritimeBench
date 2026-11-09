import "dotenv/config";
import { existsSync, readFileSync, readdirSync } from "node:fs";

import path from "node:path";

import { resolveAdapter } from "./adapters/adapter.registry";
import { parseCliArguments, parseReportCliArguments } from "./runner/cli.args";
import { discoverEvaluationTasks } from "./runner/suite.loader";
import { runEvaluationSuite } from "./runner/suite.runner";
import { loadEvaluationData } from "./runner/data.loader";
import {
  generateAggregateReports,
  type AggregateProvenance,
} from "./runner/aggregate.report.generator";
import {
  generateBenchmarkSummaryJson,
  generateTaskSummaryCsv,
  loadTrialRecords,
} from "./runner/report.generator";
import type { RunManifest } from "./runner/run-manifest.storage";

export async function main(defaultProvider: string): Promise<void> {
  console.log("=================================");
  console.log("       MARITIMEBENCH");
  console.log("=================================");
  console.log("Beyond ETA: Evaluating AI in Operational Voyage Planning");
  console.log("");

  try {
    const args = process.argv.slice(2);

    if (args.includes("--aggregate")) {
      console.log("Generating aggregate benchmark reports...");

      const runsIndex = args.indexOf("--runs");
      if (runsIndex !== -1 && args.indexOf("--runs", runsIndex + 1) !== -1) {
        throw new Error("Duplicate argument: --runs.");
      }

      const unexpectedArgs = args.filter(
        (arg, index) =>
          arg !== "--aggregate" &&
          arg !== "--runs" &&
          !(runsIndex !== -1 && index === runsIndex + 1),
      );

      if (unexpectedArgs.length) {
        throw new Error(`Unexpected aggregate argument: ${unexpectedArgs[0]}`);
      }

      const requestedRuns =
        runsIndex === -1
          ? undefined
          : args[runsIndex + 1]
              ?.split(",")
              .map((id) => id.trim())
              .filter(Boolean);

      if (runsIndex !== -1 && (!requestedRuns || requestedRuns.length === 0)) {
        throw new Error("--runs requires comma-separated run IDs.");
      }

      const manifestDirectory = path.resolve(
        process.cwd(),
        "results",
        "manifests",
      );

      if (!existsSync(manifestDirectory)) {
        throw new Error("No run manifests directory found.");
      }

      const manifestFiles = readdirSync(manifestDirectory).filter((file) =>
        file.endsWith(".json"),
      );

      const manifests = manifestFiles.map(
        (file) =>
          JSON.parse(
            readFileSync(path.join(manifestDirectory, file), "utf-8"),
          ) as RunManifest,
      );

      const manifestMap = new Map(
        manifests.map((manifest) => [manifest.run_id, manifest]),
      );

      const selectedManifests = requestedRuns
        ? requestedRuns.map((runId) => {
            const manifest = manifestMap.get(runId);
            if (!manifest) {
              throw new Error(`Run manifest not found: ${runId}`);
            }
            return manifest;
          })
        : manifests.filter(
            (manifest) =>
              !["mock", "mock-provider"].includes(
                manifest.provider.toLowerCase(),
              ),
          );

      if (!selectedManifests.length) {
        throw new Error("No eligible real-AI runs found to aggregate.");
      }

      if (
        new Set(selectedManifests.map((run) => run.run_id)).size !==
        selectedManifests.length
      ) {
        throw new Error("Duplicate run IDs supplied.");
      }

      for (const manifest of selectedManifests) {
        if (
          ["mock", "mock-provider"].includes(manifest.provider.toLowerCase())
        ) {
          throw new Error(`Mock run cannot be aggregated: ${manifest.run_id}`);
        }

        const totals = manifest.totals;

        if (
          manifest.status !== "completed" ||
          totals.completed_trials !== totals.planned_trials ||
          totals.failed_trials !== 0 ||
          totals.not_started_trials !== 0 ||
          totals.running_trials !== 0 ||
          totals.pending_trials !== 0
        ) {
          throw new Error(
            `Run is incomplete or has failures: ${manifest.run_id}`,
          );
        }
      }

      const trials = selectedManifests.flatMap((manifest) => {
        const runTrials = loadTrialRecords(undefined, manifest.run_id);

        if (runTrials.length !== manifest.totals.completed_trials) {
          throw new Error(
            `Trial count mismatch for ${manifest.run_id}: expected ${manifest.totals.completed_trials}, found ${runTrials.length}.`,
          );
        }

        return runTrials;
      });

      const providers = new Set(selectedManifests.map((run) => run.provider));
      const models = new Set(selectedManifests.map((run) => run.model));
      const settings = new Set(
        selectedManifests.map((run) =>
          JSON.stringify([
            run.temperature ?? null,
            run.max_output_tokens ?? null,
          ]),
        ),
      );
      const systemPrompts = new Set(trials.map((trial) => trial.system_prompt));

      if (providers.size !== 1 || models.size !== 1 || settings.size !== 1) {
        throw new Error(
          "Incompatible aggregate: provider, model, temperature, or output-token settings differ.",
        );
      }

      if (systemPrompts.size !== 1) {
        throw new Error("Incompatible aggregate: system prompts differ.");
      }

      const userPromptsByTask = new Map<string, Set<string>>();

      for (const trial of trials) {
        const prompts =
          userPromptsByTask.get(trial.task_id) ?? new Set<string>();
        prompts.add(trial.user_prompt);
        userPromptsByTask.set(trial.task_id, prompts);
      }

      for (const [taskId, prompts] of userPromptsByTask) {
        if (prompts.size !== 1) {
          throw new Error(
            `Incompatible aggregate: user prompts differ for ${taskId}.`,
          );
        }
      }

      const taskIds = [...userPromptsByTask.keys()].sort();
      const taskTrialCounts = Object.fromEntries(
        taskIds.map((taskId) => [
          taskId,
          trials.filter((trial) => trial.task_id === taskId).length,
        ]),
      );

      const taskCounts = Object.values(taskTrialCounts);
      if (taskCounts.some((count) => count !== taskCounts[0])) {
        throw new Error(
          "Aggregate runs have inconsistent trial counts per task.",
        );
      }

      const provenance: AggregateProvenance = {
        report_type: "combined_clarified_prompt_aggregate",
        aggregate_id: `aggregate-${Date.now()}`,
        provider: [...providers][0],
        model: [...models][0],
        source_runs: selectedManifests.map((run) => ({
          run_id: run.run_id,
          trials: run.totals.completed_trials,
        })),
        source_run_ids: selectedManifests.map((run) => run.run_id),
        total_trials: trials.length,
        total_tasks: taskIds.length,
        trials_per_task: taskCounts[0] ?? 0,
        task_trial_counts: taskTrialCounts,
        configuration_consistency: {
          provider: true,
          model: true,
          system_prompt: true,
          temperature_and_max_output_tokens: true,
          task_user_prompts_across_runs: true,
        },
        original_trial_records_modified: false,
        generated_files: [
          "task-summary.csv",
          "benchmark-summary.json",
          "source-runs.json",
        ],
        generated_at: new Date().toISOString(),
      };

      const tasks = taskIds.map((taskId) => loadEvaluationData(taskId).task);
      const outputPaths = generateAggregateReports(trials, tasks, provenance);

      console.log("");
      console.log("Aggregate reports generated successfully.");
      console.log(`Source runs: ${selectedManifests.length}`);
      console.log(`Trials included: ${trials.length}`);
      outputPaths.forEach((outputPath) => console.log(outputPath));

      return;
    }
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

    const { adapter, model } = resolveAdapter(options.provider, options.model);

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

    if (result.status === "completed") {
      console.log("");
      console.log("Generating per-run reports...");

      const trials = loadTrialRecords(undefined, result.run_id);
      const tasks = taskIds.map((taskId) => loadEvaluationData(taskId).task);
      const reportDirectory = path.resolve(
        process.cwd(),
        "transcripts",
        result.run_id,
      );

      const csvPath = generateTaskSummaryCsv(trials, tasks, reportDirectory);
      const jsonPath = generateBenchmarkSummaryJson(
        trials,
        tasks,
        reportDirectory,
      );

      console.log(`Task summary: ${csvPath}`);
      console.log(`Benchmark summary: ${jsonPath}`);
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
