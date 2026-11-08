import { describe, expect, it } from "vitest";

import type { VoyageTask } from "../../src/schemas/task.schema";

import {
  aggregateBenchmarkSummaries,
  aggregateResults,
  aggregateTaskGroup,
  groupTrialsByTask,
  type TaskSummary,
  type TaskTrialGroup,
  type TrialRecord,
} from "../../src/runner/result.aggregator";

function createTrial(overrides: Partial<TrialRecord> = {}): TrialRecord {
  return {
    task_id: "MB-03",
    run_id: "run-001",
    trial_number: 1,
    started_at: "2026-10-15T08:00:00.000Z",
    completed_at: "2026-10-15T08:00:01.000Z",
    provider: "mock",
    model: "mock-model",
    temperature: 0,
    max_output_tokens: 1000,
    latency_ms: 1000,
    input_tokens: 100,
    output_tokens: 50,
    system_prompt: "You are a maritime voyage planning assistant.",
    user_prompt: "Calculate the voyage ETA for MB-03.",
    raw_response: "{}",
    parse_error: null,
    grading: {
      task_id: "MB-03",
      valid_response: true,
      score: 100,
      passed_checks: 2,
      total_checks: 2,
      task_passed: true,
      checks: [
        {
          name: "physical_eta",
          categories: ["calculation", "weather_constraint"],
          passed: true,
          expected: "2026-10-16T01:00:00.000Z",
          actual: "2026-10-16T01:00:00.000Z",
          critical: true,
        },
        {
          name: "total_travel_hours",
          categories: ["calculation", "weather_constraint"],
          passed: true,
          expected: 17,
          actual: 17,
          critical: true,
        },
      ],
      errors: [],
    },
    ...overrides,
  };
}

function createTask(overrides: Partial<VoyageTask> = {}): VoyageTask {
  return {
    task_id: "MB-03",
    title: "Weather Speed Restriction",
    description: "Test voyage with a weather restriction.",
    departure_time: "2026-10-15T08:00:00Z",
    legs: [
      {
        leg_id: "LEG-01",
        distance_nm: 180,
        speed_kn: 12,
      },
    ],
    weather_restrictions: [
      {
        start_time: "2026-10-15T12:00:00Z",
        end_time: "2026-10-15T16:00:00Z",
        restricted_speed_kn: 6,
      },
    ],
    ...overrides,
  };
}

function createTaskSummary(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    task_id: "MB-03",
    provider: "mock",
    model: "mock-model",
    run_id: "run-001",
    temperature: 0,
    max_output_tokens: 1000,

    total_trials: 3,
    valid_trials: 3,
    passed_trials: 2,

    task_pass_rate: 66.6667,
    average_score: 80,

    response_validity_rate: 100,

    average_latency_ms: 1500,
    median_latency_ms: 1500,
    min_latency_ms: 1000,
    max_latency_ms: 2000,

    average_input_tokens: 100,
    average_output_tokens: 50,

    score_standard_deviation: 10,
    minimum_score: 70,
    maximum_score: 90,

    constraint_applicable_trials: 3,
    constraint_assessable_trials: 3,
    constraint_failure_trials: 1,
    constraint_failure_rate: 33.3333,

    pass_at_k: {
      1: 66.6667,
      2: 100,
      3: null,
      5: null,
    },
    pass_all_k: {
      1: 66.6667,
      2: 33.3333,
      3: null,
      5: null,
    },

    ...overrides,
  };
}

describe("Result aggregator", () => {
  it("should group trials by task and experiment configuration", () => {
    const trials = [
      createTrial({ trial_number: 1 }),
      createTrial({ trial_number: 2 }),
      createTrial({
        trial_number: 1,
        temperature: 0.5,
      }),
      createTrial({
        task_id: "MB-05",
        grading: {
          ...createTrial().grading,
          task_id: "MB-05",
        },
      }),
    ];

    const groups = groupTrialsByTask(trials);

    expect(groups).toHaveLength(3);
    expect(groups[0].trials).toHaveLength(2);
  });

  it("should calculate task-level statistics correctly", () => {
    const firstTrial = createTrial({
      trial_number: 1,
      latency_ms: 1000,
    });

    const secondTrial = createTrial({
      trial_number: 2,
      latency_ms: 3000,
      input_tokens: undefined,
      grading: {
        ...createTrial().grading,
        score: 50,
        passed_checks: 1,
        task_passed: false,
        checks: [
          {
            name: "physical_eta",
            categories: ["calculation", "weather_constraint"],
            passed: false,
            expected: "2026-10-16T01:00:00.000Z",
            actual: "2026-10-16T02:00:00.000Z",
            critical: true,
          },
        ],
      },
    });

    const invalidTrial = createTrial({
      trial_number: 3,
      latency_ms: 2000,
      input_tokens: undefined,
      output_tokens: undefined,
      grading: {
        task_id: "MB-03",
        valid_response: false,
        score: 0,
        passed_checks: 0,
        total_checks: 0,
        task_passed: false,
        checks: [],
        errors: ["Invalid response"],
      },
    });

    const group: TaskTrialGroup = {
      task_id: "MB-03",
      provider: "mock",
      model: "mock-model",
      run_id: "run-001",
      temperature: 0,
      max_output_tokens: 1000,
      trials: [firstTrial, secondTrial, invalidTrial],
    };

    const summary = aggregateTaskGroup(group, createTask());

    expect(summary.total_trials).toBe(3);
    expect(summary.valid_trials).toBe(2);
    expect(summary.passed_trials).toBe(1);

    expect(summary.task_pass_rate).toBeCloseTo(33.333, 2);
    expect(summary.average_score).toBe(50);
    expect(summary.response_validity_rate).toBeCloseTo(66.666, 2);

    expect(summary.average_latency_ms).toBe(2000);
    expect(summary.median_latency_ms).toBe(2000);
    expect(summary.min_latency_ms).toBe(1000);
    expect(summary.max_latency_ms).toBe(3000);

    expect(summary.average_input_tokens).toBe(100);
    expect(summary.average_output_tokens).toBe(50);

    expect(summary.score_standard_deviation).toBeCloseTo(
      Math.sqrt(5000 / 3),
      5,
    );
    expect(summary.minimum_score).toBe(0);
    expect(summary.maximum_score).toBe(100);

    expect(summary.constraint_applicable_trials).toBe(3);
    expect(summary.constraint_assessable_trials).toBe(2);
    expect(summary.constraint_failure_trials).toBe(1);
    expect(summary.constraint_failure_rate).toBe(50);
  });

  it("should calculate median latency correctly for an even number of trials", () => {
    const trials = [
      createTrial({
        trial_number: 1,
        latency_ms: 1000,
      }),
      createTrial({
        trial_number: 2,
        latency_ms: 3000,
      }),
      createTrial({
        trial_number: 3,
        latency_ms: 2000,
      }),
      createTrial({
        trial_number: 4,
        latency_ms: 4000,
      }),
    ];

    const group: TaskTrialGroup = {
      task_id: "MB-03",
      provider: "mock",
      model: "mock-model",
      run_id: "run-001",
      temperature: 0,
      max_output_tokens: 1000,
      trials,
    };

    const summary = aggregateTaskGroup(group, createTask());

    expect(summary.median_latency_ms).toBe(2500);
  });

  it("should return null token averages when all token counts are missing", () => {
    const trials = [
      createTrial({
        trial_number: 1,
        input_tokens: undefined,
        output_tokens: undefined,
      }),
      createTrial({
        trial_number: 2,
        input_tokens: undefined,
        output_tokens: undefined,
      }),
    ];

    const group: TaskTrialGroup = {
      task_id: "MB-03",
      provider: "mock",
      model: "mock-model",
      run_id: "run-001",
      temperature: 0,
      max_output_tokens: 1000,
      trials,
    };

    const summary = aggregateTaskGroup(group, createTask());

    expect(summary.average_input_tokens).toBeNull();
    expect(summary.average_output_tokens).toBeNull();
  });

  it("should return null constraint failure rate when no constraints are assessable", () => {
    const trial = createTrial({
      grading: {
        ...createTrial().grading,
        checks: [
          {
            name: "total_travel_hours",
            categories: ["calculation"],
            passed: true,
            expected: 20,
            actual: 20,
            critical: true,
          },
        ],
      },
    });

    const group: TaskTrialGroup = {
      task_id: "MB-01",
      provider: "mock",
      model: "mock-model",
      trials: [trial],
    };
    const summary = aggregateTaskGroup(
      group,
      createTask({
        task_id: "MB-01",
        weather_restrictions: [],
      }),
    );

    expect(summary.constraint_applicable_trials).toBe(0);
    expect(summary.constraint_assessable_trials).toBe(0);
    expect(summary.constraint_failure_rate).toBeNull();
  });

  it("should count applicable constraints even when all responses are invalid", () => {
    const invalidTrial = createTrial({
      grading: {
        task_id: "MB-03",
        valid_response: false,
        score: 0,
        passed_checks: 0,
        total_checks: 0,
        task_passed: false,
        checks: [],
        errors: ["Invalid response"],
      },
    });

    const group: TaskTrialGroup = {
      task_id: "MB-03",
      provider: "mock",
      model: "mock-model",
      run_id: "run-001",
      trials: [invalidTrial],
    };

    const summary = aggregateTaskGroup(group, createTask());

    expect(summary.constraint_applicable_trials).toBe(1);
    expect(summary.constraint_assessable_trials).toBe(0);
    expect(summary.constraint_failure_trials).toBe(0);
    expect(summary.constraint_failure_rate).toBeNull();
  });

  it("should reject an empty trial group", () => {
    const group: TaskTrialGroup = {
      task_id: "MB-01",
      provider: "mock",
      model: "mock-model",
      trials: [],
    };

    expect(() => aggregateTaskGroup(group, createTask())).toThrow(
      "Cannot aggregate an empty trial group.",
    );
  });

  it("should calculate benchmark-level macro averages correctly", () => {
    const summaries = [
      createTaskSummary({
        task_id: "MB-03",
        task_pass_rate: 100,
        average_score: 100,
        total_trials: 3,
        valid_trials: 3,
      }),
      createTaskSummary({
        task_id: "MB-05",
        task_pass_rate: 50,
        average_score: 60,
        total_trials: 3,
        valid_trials: 2,
      }),
    ];

    const results = aggregateBenchmarkSummaries(summaries);

    expect(results).toHaveLength(1);

    const benchmark = results[0];

    expect(benchmark.total_tasks).toBe(2);
    expect(benchmark.total_trials).toBe(6);

    expect(benchmark.macro_average_task_pass_rate).toBe(75);
    expect(benchmark.macro_average_task_score).toBe(80);

    expect(benchmark.response_validity_rate).toBeCloseTo(83.3333, 2);

    expect(benchmark.task_summaries).toHaveLength(2);
  });

  it("should give each task equal weight in benchmark macro averages", () => {
    const summaries = [
      createTaskSummary({
        task_id: "MB-03",
        total_trials: 10,
        task_pass_rate: 100,
        average_score: 100,
      }),
      createTaskSummary({
        task_id: "MB-05",
        total_trials: 2,
        task_pass_rate: 0,
        average_score: 40,
      }),
    ];

    const results = aggregateBenchmarkSummaries(summaries);
    const benchmark = results[0];

    expect(benchmark.total_trials).toBe(12);
    expect(benchmark.macro_average_task_pass_rate).toBe(50);
    expect(benchmark.macro_average_task_score).toBe(70);
  });

  it("should reject duplicate task summaries within the same benchmark group", () => {
    const summaries = [
      createTaskSummary({
        task_id: "MB-03",
        task_pass_rate: 100,
        average_score: 100,
      }),
      createTaskSummary({
        task_id: "MB-03",
        task_pass_rate: 50,
        average_score: 60,
      }),
    ];

    expect(() => aggregateBenchmarkSummaries(summaries)).toThrow(
      "Duplicate task summary found for MB-03 in the same benchmark group.",
    );
  });

  it("should calculate pooled constraint failure rate correctly", () => {
    const summaries = [
      createTaskSummary({
        task_id: "MB-03",
        constraint_applicable_trials: 3,
        constraint_assessable_trials: 3,
        constraint_failure_trials: 1,
        constraint_failure_rate: 33.3333,
      }),
      createTaskSummary({
        task_id: "MB-05",
        constraint_applicable_trials: 3,
        constraint_assessable_trials: 2,
        constraint_failure_trials: 2,
        constraint_failure_rate: 100,
      }),
    ];

    const results = aggregateBenchmarkSummaries(summaries);
    const benchmark = results[0];

    expect(benchmark.constraint_applicable_trials).toBe(6);
    expect(benchmark.constraint_assessable_trials).toBe(5);
    expect(benchmark.constraint_failure_trials).toBe(3);
    expect(benchmark.constraint_failure_rate).toBe(60);
  });

  it("should keep different experiment configurations separate", () => {
    const summaries = [
      createTaskSummary({
        task_id: "MB-03",
        temperature: 0,
      }),
      createTaskSummary({
        task_id: "MB-05",
        temperature: 0.5,
      }),
      createTaskSummary({
        task_id: "MB-08",
        run_id: "run-002",
      }),
    ];

    const results = aggregateBenchmarkSummaries(summaries);

    expect(results).toHaveLength(3);
    expect(results[0].temperature).toBe(0);
    expect(results[1].temperature).toBe(0.5);
    expect(results[2].run_id).toBe("run-002");
  });

  it("should keep different providers and models separate", () => {
    const summaries = [
      createTaskSummary({
        task_id: "MB-03",
        provider: "provider-a",
        model: "model-a",
      }),
      createTaskSummary({
        task_id: "MB-05",
        provider: "provider-b",
        model: "model-b",
      }),
      createTaskSummary({
        task_id: "MB-08",
        provider: "provider-a",
        model: "model-c",
      }),
    ];

    const results = aggregateBenchmarkSummaries(summaries);

    expect(results).toHaveLength(3);

    expect(results.map(({ provider, model }) => ({ provider, model }))).toEqual(
      [
        { provider: "provider-a", model: "model-a" },
        { provider: "provider-b", model: "model-b" },
        { provider: "provider-a", model: "model-c" },
      ],
    );
  });

  it("should aggregate trials into task and benchmark summaries", () => {
    const trials = [
      createTrial({ trial_number: 1 }),
      createTrial({ trial_number: 2 }),
      createTrial({
        task_id: "MB-05",
        grading: {
          ...createTrial().grading,
          task_id: "MB-05",
        },
      }),
    ];

    const tasks = [
      createTask(),
      createTask({
        task_id: "MB-05",
        title: "Port Waiting Time",
        weather_restrictions: [],
        port_window: {
          opens_at: "18:00",
          closes_at: "22:00",
        },
      }),
    ];

    const result = aggregateResults(trials, tasks);

    expect(result.task_summaries).toHaveLength(2);
    expect(result.benchmark_summaries).toHaveLength(1);

    expect(result.task_summaries.map((summary) => summary.task_id)).toEqual([
      "MB-03",
      "MB-05",
    ]);

    expect(result.task_summaries[0].total_trials).toBe(2);
    expect(result.task_summaries[1].total_trials).toBe(1);

    expect(result.benchmark_summaries[0].total_tasks).toBe(2);
    expect(result.benchmark_summaries[0].total_trials).toBe(3);
  });

  it("should throw when a task definition is missing", () => {
    const trials = [createTrial()];

    expect(() => aggregateResults(trials, [])).toThrow(
      "Task definition not found for MB-03.",
    );
  });

  it("should return empty summaries when there are no trials", () => {
    const result = aggregateResults([], []);

    expect(result.task_summaries).toEqual([]);
    expect(result.benchmark_summaries).toEqual([]);
  });

  it("should calculate pass@k and pass^k using finite-sample probabilities", () => {
    const trials = [
      createTrial({ trial_number: 1 }),
      createTrial({
        trial_number: 2,
        grading: {
          ...createTrial().grading,
          task_passed: false,
          score: 0,
        },
      }),
      createTrial({ trial_number: 3 }),
      createTrial({
        trial_number: 4,
        grading: {
          ...createTrial().grading,
          task_passed: false,
          score: 0,
        },
      }),
    ];

    const summary = aggregateTaskGroup(
      {
        task_id: "MB-03",
        provider: "mock",
        model: "mock-model",
        run_id: "run-001",
        temperature: 0,
        max_output_tokens: 1000,
        trials,
      },
      createTask(),
    );

    expect(summary.passed_trials).toBe(2);

    expect(summary.pass_at_k).toEqual({
      1: 50,
      2: 83.33333333333334,
      3: 100,
      5: null,
    });

    expect(summary.pass_all_k[1]).toBe(50);
    expect(summary.pass_all_k[2]).toBeCloseTo(16.6667, 3);
    expect(summary.pass_all_k[3]).toBe(0);
    expect(summary.pass_all_k[5]).toBeNull();

    expect(summary.pass_at_k[1]).toBe(summary.task_pass_rate);
    expect(summary.pass_all_k[1]).toBe(summary.task_pass_rate);
  });

  it("should return null for pass@k and pass^k when trials are insufficient", () => {
    const trials = [
      createTrial({ trial_number: 1 }),
      createTrial({ trial_number: 2 }),
    ];

    const summary = aggregateTaskGroup(
      {
        task_id: "MB-03",
        provider: "mock",
        model: "mock-model",
        run_id: "run-001",
        temperature: 0,
        max_output_tokens: 1000,
        trials,
      },
      createTask(),
    );

    expect(summary.pass_at_k[3]).toBeNull();
    expect(summary.pass_at_k[5]).toBeNull();

    expect(summary.pass_all_k[3]).toBeNull();
    expect(summary.pass_all_k[5]).toBeNull();
  });

  it("should calculate pass@k and pass^k macro averages using eligible tasks only", () => {
    const summaries = [
      createTaskSummary({
        task_id: "MB-03",
        pass_at_k: {
          1: 100,
          2: 100,
          3: 80,
          5: null,
        },
        pass_all_k: {
          1: 100,
          2: 50,
          3: 20,
          5: null,
        },
      }),
      createTaskSummary({
        task_id: "MB-05",
        pass_at_k: {
          1: 0,
          2: 50,
          3: null,
          5: null,
        },
        pass_all_k: {
          1: 0,
          2: 25,
          3: null,
          5: null,
        },
      }),
    ];

    const benchmark = aggregateBenchmarkSummaries(summaries)[0];

    expect(benchmark.macro_average_pass_at_k).toEqual({
      1: 50,
      2: 75,
      3: 80,
      5: null,
    });

    expect(benchmark.macro_average_pass_all_k).toEqual({
      1: 50,
      2: 37.5,
      3: 20,
      5: null,
    });

    expect(benchmark.pass_at_k_eligible_tasks).toEqual({
      1: 2,
      2: 2,
      3: 1,
      5: 0,
    });

    expect(benchmark.pass_all_k_eligible_tasks).toEqual({
      1: 2,
      2: 2,
      3: 1,
      5: 0,
    });
  });
});
