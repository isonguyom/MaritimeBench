import type { EvaluationRunResult } from "./evaluation.runner";
import type { VoyageTask } from "../schemas/task.schema";

export const PASS_K_VALUES = [1, 2, 3, 5] as const;

export type KMetricValues = Record<
  (typeof PASS_K_VALUES)[number],
  number | null
>;

export type KEligibleTaskCounts = Record<
  (typeof PASS_K_VALUES)[number],
  number
>;

export interface TaskSummary {
  task_id: string;
  provider: string;
  model: string;
  run_id?: string;
  temperature?: number;
  max_output_tokens?: number;

  total_trials: number;
  valid_trials: number;
  passed_trials: number;

  task_pass_rate: number;
  average_score: number;

  response_validity_rate: number;

  average_latency_ms: number;
  median_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;

  average_input_tokens: number | null;
  average_output_tokens: number | null;

  score_standard_deviation: number;
  minimum_score: number;
  maximum_score: number;

  constraint_applicable_trials: number;
  constraint_assessable_trials: number;
  constraint_failure_trials: number;
  constraint_failure_rate: number | null;

  pass_at_k: KMetricValues;
  pass_all_k: KMetricValues;
}

export interface BenchmarkSummary {
  provider: string;
  model: string;
  run_id?: string;
  temperature?: number;
  max_output_tokens?: number;

  total_tasks: number;
  total_trials: number;

  macro_average_task_pass_rate: number;
  macro_average_task_score: number;

  response_validity_rate: number;

  constraint_applicable_trials: number;
  constraint_assessable_trials: number;
  constraint_failure_trials: number;
  constraint_failure_rate: number | null;

  macro_average_pass_at_k: KMetricValues;
  macro_average_pass_all_k: KMetricValues;

  pass_at_k_eligible_tasks: KEligibleTaskCounts;
  pass_all_k_eligible_tasks: KEligibleTaskCounts;

  task_summaries: TaskSummary[];
}

export interface AggregationResult {
  task_summaries: TaskSummary[];
  benchmark_summaries: BenchmarkSummary[];
}

export type TrialRecord = EvaluationRunResult;

export interface TaskTrialGroup {
  task_id: string;
  provider: string;
  model: string;
  run_id?: string;
  temperature?: number;
  max_output_tokens?: number;
  trials: TrialRecord[];
}

export function groupTrialsByTask(trials: TrialRecord[]): TaskTrialGroup[] {
  const groups = new Map<string, TaskTrialGroup>();

  for (const trial of trials) {
    const key = JSON.stringify([
      trial.task_id,
      trial.provider,
      trial.model,
      trial.run_id ?? null,
      trial.temperature ?? null,
      trial.max_output_tokens ?? null,
    ]);

    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.trials.push(trial);
      continue;
    }

    groups.set(key, {
      task_id: trial.task_id,
      provider: trial.provider,
      model: trial.model,
      ...(trial.run_id !== undefined ? { run_id: trial.run_id } : {}),
      ...(trial.temperature !== undefined
        ? { temperature: trial.temperature }
        : {}),
      ...(trial.max_output_tokens !== undefined
        ? { max_output_tokens: trial.max_output_tokens }
        : {}),
      trials: [trial],
    });
  }

  return Array.from(groups.values());
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middleIndex = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
  }

  return sorted[middleIndex];
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const mean =
    values.reduce((total, value) => total + value, 0) / values.length;

  const variance =
    values.reduce((total, value) => total + Math.pow(value - mean, 2), 0) /
    values.length;

  return Math.sqrt(variance);
}

/**
 * Estimates the probability of obtaining at least one successful
 * trial when selecting k trials without replacement.
 *
 * Returns null when fewer than k trials are available.
 */
function calculatePassAtK(
  totalTrials: number,
  passedTrials: number,
  k: number,
): number | null {
  if (totalTrials < k) {
    return null;
  }

  if (totalTrials - passedTrials < k) {
    return 100;
  }

  let probabilityOfNoSuccess = 1;

  for (let i = 0; i < k; i++) {
    probabilityOfNoSuccess *=
      (totalTrials - passedTrials - i) / (totalTrials - i);
  }

  return (1 - probabilityOfNoSuccess) * 100;
}

/**
 * Estimates the probability that all k selected trials succeed
 * when selecting k trials without replacement.
 *
 * Returns null when fewer than k trials are available.
 */
function calculatePassAllK(
  totalTrials: number,
  passedTrials: number,
  k: number,
): number | null {
  if (totalTrials < k) {
    return null;
  }

  if (passedTrials < k) {
    return 0;
  }

  let probabilityOfAllSuccesses = 1;

  for (let i = 0; i < k; i++) {
    probabilityOfAllSuccesses *= (passedTrials - i) / (totalTrials - i);
  }

  return probabilityOfAllSuccesses * 100;
}

function calculateKMetrics(
  totalTrials: number,
  passedTrials: number,
): {
  passAtK: KMetricValues;
  passAllK: KMetricValues;
} {
  const passAtK = Object.fromEntries(
    PASS_K_VALUES.map((k) => [
      k,
      calculatePassAtK(totalTrials, passedTrials, k),
    ]),
  ) as KMetricValues;

  const passAllK = Object.fromEntries(
    PASS_K_VALUES.map((k) => [
      k,
      calculatePassAllK(totalTrials, passedTrials, k),
    ]),
  ) as KMetricValues;

  return { passAtK, passAllK };
}

function calculateMacroAverageKMetrics(
  summaries: TaskSummary[],
  metric: "pass_at_k" | "pass_all_k",
): {
  averages: KMetricValues;
  eligibleTasks: KEligibleTaskCounts;
} {
  const averages = {} as KMetricValues;
  const eligibleTasks = {} as KEligibleTaskCounts;

  for (const k of PASS_K_VALUES) {
    const eligibleSummaries = summaries.filter(
      (summary) => summary[metric][k] !== null,
    );

    eligibleTasks[k] = eligibleSummaries.length;

    averages[k] =
      eligibleSummaries.length === 0
        ? null
        : eligibleSummaries.reduce(
            (total, summary) => total + summary[metric][k]!,
            0,
          ) / eligibleSummaries.length;
  }

  return { averages, eligibleTasks };
}

export function aggregateTaskGroup(
  group: TaskTrialGroup,
  task: VoyageTask,
): TaskSummary {
  const trials = group.trials;

  if (trials.length === 0) {
    throw new Error("Cannot aggregate an empty trial group.");
  }

  const totalTrials = trials.length;

  const validTrials = trials.filter((trial) => trial.grading.valid_response);

  const passedTrials = trials.filter(
    (trial) => trial.grading.valid_response && trial.grading.task_passed,
  );

  const scores = trials.map((trial) => trial.grading.score);
  const latencies = trials.map((trial) => trial.latency_ms);

  const inputTokens = trials
    .map((trial) => trial.input_tokens)
    .filter((value): value is number => value !== undefined);

  const outputTokens = trials
    .map((trial) => trial.output_tokens)
    .filter((value): value is number => value !== undefined);

  const constraintCategories = new Set([
    "weather_constraint",
    "port_constraint",
    "deadline_constraint",
  ]);

  const hasApplicableConstraints =
    task.weather_restrictions.length > 0 ||
    task.port_window !== undefined ||
    task.deadline !== undefined;

  const assessableConstraintTrials = validTrials.filter((trial) =>
    trial.grading.checks.some((check) =>
      check.categories.some((category) => constraintCategories.has(category)),
    ),
  );

  const constraintFailureTrials = assessableConstraintTrials.filter((trial) =>
    trial.grading.checks.some(
      (check) =>
        check.categories.some((category) =>
          constraintCategories.has(category),
        ) && !check.passed,
    ),
  );

  const average = (values: number[]): number | null => {
    if (values.length === 0) {
      return null;
    }

    return values.reduce((total, value) => total + value, 0) / values.length;
  };

  const { passAtK, passAllK } = calculateKMetrics(
    totalTrials,
    passedTrials.length,
  );

  return {
    task_id: group.task_id,
    provider: group.provider,
    model: group.model,
    ...(group.run_id !== undefined ? { run_id: group.run_id } : {}),
    ...(group.temperature !== undefined
      ? { temperature: group.temperature }
      : {}),
    ...(group.max_output_tokens !== undefined
      ? { max_output_tokens: group.max_output_tokens }
      : {}),

    total_trials: totalTrials,
    valid_trials: validTrials.length,
    passed_trials: passedTrials.length,

    task_pass_rate: (passedTrials.length / totalTrials) * 100,
    average_score: average(scores) ?? 0,

    response_validity_rate: (validTrials.length / totalTrials) * 100,

    average_latency_ms: average(latencies) ?? 0,
    median_latency_ms: calculateMedian(latencies),
    min_latency_ms: Math.min(...latencies),
    max_latency_ms: Math.max(...latencies),

    average_input_tokens: average(inputTokens),
    average_output_tokens: average(outputTokens),

    score_standard_deviation: calculateStandardDeviation(scores),
    minimum_score: Math.min(...scores),
    maximum_score: Math.max(...scores),

    pass_at_k: passAtK,
    pass_all_k: passAllK,

    constraint_applicable_trials: hasApplicableConstraints ? totalTrials : 0,
    constraint_assessable_trials: assessableConstraintTrials.length,
    constraint_failure_trials: constraintFailureTrials.length,
    constraint_failure_rate:
      assessableConstraintTrials.length > 0
        ? (constraintFailureTrials.length / assessableConstraintTrials.length) *
          100
        : null,
  };
}

export function aggregateBenchmarkSummaries(
  taskSummaries: TaskSummary[],
): BenchmarkSummary[] {
  const groups = new Map<string, TaskSummary[]>();

  for (const summary of taskSummaries) {
    const key = JSON.stringify([
      summary.provider,
      summary.model,
      summary.run_id ?? null,
      summary.temperature ?? null,
      summary.max_output_tokens ?? null,
    ]);

    const existingGroup = groups.get(key);

    if (existingGroup) {
      const duplicateTask = existingGroup.some(
        (existing) => existing.task_id === summary.task_id,
      );

      if (duplicateTask) {
        throw new Error(
          `Duplicate task summary found for ${summary.task_id} in the same benchmark group.`,
        );
      }

      existingGroup.push(summary);
    } else {
      groups.set(key, [summary]);
    }
  }

  return Array.from(groups.values()).map((summaries) => {
    const totalTrials = summaries.reduce(
      (total, summary) => total + summary.total_trials,
      0,
    );

    const totalValidTrials = summaries.reduce(
      (total, summary) => total + summary.valid_trials,
      0,
    );

    const constraintApplicableTrials = summaries.reduce(
      (total, summary) => total + summary.constraint_applicable_trials,
      0,
    );

    const constraintAssessableTrials = summaries.reduce(
      (total, summary) => total + summary.constraint_assessable_trials,
      0,
    );

    const constraintFailureTrials = summaries.reduce(
      (total, summary) => total + summary.constraint_failure_trials,
      0,
    );

    const average = (values: number[]): number =>
      values.reduce((total, value) => total + value, 0) / values.length;

    const {
      averages: macroAveragePassAtK,
      eligibleTasks: passAtKEligibleTasks,
    } = calculateMacroAverageKMetrics(summaries, "pass_at_k");

    const {
      averages: macroAveragePassAllK,
      eligibleTasks: passAllKEligibleTasks,
    } = calculateMacroAverageKMetrics(summaries, "pass_all_k");

    const firstSummary = summaries[0];

    return {
      provider: firstSummary.provider,
      model: firstSummary.model,
      ...(firstSummary.run_id !== undefined
        ? { run_id: firstSummary.run_id }
        : {}),
      ...(firstSummary.temperature !== undefined
        ? { temperature: firstSummary.temperature }
        : {}),
      ...(firstSummary.max_output_tokens !== undefined
        ? { max_output_tokens: firstSummary.max_output_tokens }
        : {}),

      total_tasks: new Set(summaries.map((summary) => summary.task_id)).size,
      total_trials: totalTrials,

      macro_average_task_pass_rate: average(
        summaries.map((summary) => summary.task_pass_rate),
      ),
      macro_average_task_score: average(
        summaries.map((summary) => summary.average_score),
      ),

      response_validity_rate:
        totalTrials > 0 ? (totalValidTrials / totalTrials) * 100 : 0,

      constraint_applicable_trials: constraintApplicableTrials,
      constraint_assessable_trials: constraintAssessableTrials,
      constraint_failure_trials: constraintFailureTrials,
      constraint_failure_rate:
        constraintAssessableTrials > 0
          ? (constraintFailureTrials / constraintAssessableTrials) * 100
          : null,

      macro_average_pass_at_k: macroAveragePassAtK,
      macro_average_pass_all_k: macroAveragePassAllK,

      pass_at_k_eligible_tasks: passAtKEligibleTasks,
      pass_all_k_eligible_tasks: passAllKEligibleTasks,

      task_summaries: summaries,
    };
  });
}

export function aggregateResults(
  trials: TrialRecord[],
  tasks: VoyageTask[],
): AggregationResult {
  if (trials.length === 0) {
    return {
      task_summaries: [],
      benchmark_summaries: [],
    };
  }

  const taskMap = new Map(tasks.map((task) => [task.task_id, task]));
  const trialGroups = groupTrialsByTask(trials);

  const taskSummaries = trialGroups.map((group) => {
    const task = taskMap.get(group.task_id);

    if (!task) {
      throw new Error(`Task definition not found for ${group.task_id}.`);
    }

    return aggregateTaskGroup(group, task);
  });

  const benchmarkSummaries = aggregateBenchmarkSummaries(taskSummaries);

  return {
    task_summaries: taskSummaries,
    benchmark_summaries: benchmarkSummaries,
  };
}
