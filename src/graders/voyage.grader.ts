import { VoyageResponseSchema } from "../schemas/response.schema";
import type { VoyageResponse } from "../schemas/response.schema";
import type { VoyageTask } from "../schemas/task.schema";

export interface GradingCheck {
  name: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  critical: boolean;
}

export interface GradingResult {
  task_id: string;
  valid_response: boolean;
  score: number;
  passed_checks: number;
  total_checks: number;
  task_passed: boolean;
  checks: GradingCheck[];
  errors: string[];
}

const TIME_TOLERANCE_MS = 60_000;
const HOURS_TOLERANCE = 1 / 60;

export function gradeVoyageResponse(
  responseData: unknown,
  task: VoyageTask,
  reference: VoyageResponse,
): GradingResult {
  
    // Prevent grading a response against the wrong task reference.
  if (task.task_id !== reference.task_id) {
    throw new Error(
      `Task/reference mismatch: task "${task.task_id}" does not match reference "${reference.task_id}".`,
    );
  }

  const parsedResponse = VoyageResponseSchema.safeParse(responseData);

  if (!parsedResponse.success) {
    return {
      task_id: reference.task_id,
      valid_response: false,
      score: 0,
      passed_checks: 0,
      total_checks: 0,
      task_passed: false,
      checks: [],
      errors: parsedResponse.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    };
  }

  const response = parsedResponse.data;
  const checks: GradingCheck[] = [];

  function addCheck(
    name: string,
    passed: boolean,
    expected: unknown,
    actual: unknown,
  ): void {
    checks.push({
      name,
      passed,
      expected,
      actual,
      critical: true,
    });
  }

  function timestampsMatch(
    actual: string | null,
    expected: string | null,
  ): boolean {
    if (actual === null || expected === null) {
      return actual === expected;
    }

    const actualTime = new Date(actual).getTime();
    const expectedTime = new Date(expected).getTime();

    return (
      Number.isFinite(actualTime) &&
      Number.isFinite(expectedTime) &&
      Math.abs(actualTime - expectedTime) <= TIME_TOLERANCE_MS
    );
  }

  function numbersMatch(
    actual: number | null,
    expected: number | null,
  ): boolean {
    if (actual === null || expected === null) {
      return actual === expected;
    }

    return Math.abs(actual - expected) <= HOURS_TOLERANCE;
  }

  addCheck(
    "task_id",
    response.task_id === reference.task_id,
    reference.task_id,
    response.task_id,
  );

  addCheck(
    "status",
    response.status === reference.status,
    reference.status,
    response.status,
  );

  const expectedMissingInputs = [...reference.missing_inputs].sort();
  const actualMissingInputs = [...response.missing_inputs].sort();

  addCheck(
    "missing_inputs",
    JSON.stringify(actualMissingInputs) ===
      JSON.stringify(expectedMissingInputs),
    expectedMissingInputs,
    actualMissingInputs,
  );

  // Only grade voyage calculations when the reference expects completion.
  if (reference.status === "completed") {
    addCheck(
      "total_travel_hours",
      numbersMatch(
        response.total_travel_hours,
        reference.total_travel_hours,
      ),
      reference.total_travel_hours,
      response.total_travel_hours,
    );

    addCheck(
      "physical_eta",
      timestampsMatch(
        response.physical_eta,
        reference.physical_eta,
      ),
      reference.physical_eta,
      response.physical_eta,
    );

    // Port-related checks apply only when the task defines a port window.
    if (task.port_window) {
      addCheck(
        "permitted_arrival",
        timestampsMatch(
          response.permitted_arrival,
          reference.permitted_arrival,
        ),
        reference.permitted_arrival,
        response.permitted_arrival,
      );

      addCheck(
        "waiting_hours",
        numbersMatch(
          response.waiting_hours,
          reference.waiting_hours,
        ),
        reference.waiting_hours,
        response.waiting_hours,
      );
    }

    // Deadline feasibility applies only when the task defines a deadline.
    if (task.deadline) {
      addCheck(
        "deadline_feasible",
        response.deadline_feasible === reference.deadline_feasible,
        reference.deadline_feasible,
        response.deadline_feasible,
      );
    }
  }

  // When required information is missing, the model must not invent calculations.
if (reference.status === "insufficient_information") {
  addCheck(
    "total_travel_hours",
    response.total_travel_hours === reference.total_travel_hours,
    reference.total_travel_hours,
    response.total_travel_hours,
  );

  addCheck(
    "physical_eta",
    response.physical_eta === reference.physical_eta,
    reference.physical_eta,
    response.physical_eta,
  );

  addCheck(
    "permitted_arrival",
    response.permitted_arrival === reference.permitted_arrival,
    reference.permitted_arrival,
    response.permitted_arrival,
  );

  addCheck(
    "waiting_hours",
    response.waiting_hours === reference.waiting_hours,
    reference.waiting_hours,
    response.waiting_hours,
  );

  addCheck(
    "deadline_feasible",
    response.deadline_feasible === reference.deadline_feasible,
    reference.deadline_feasible,
    response.deadline_feasible,
  );
}

  const passedChecks = checks.filter((check) => check.passed).length;
  const totalChecks = checks.length;

  const score = (passedChecks / totalChecks) * 100;

  const taskPassed = checks.every(
    (check) => !check.critical || check.passed,
  );

  return {
    task_id: reference.task_id,
    valid_response: true,
    score,
    passed_checks: passedChecks,
    total_checks: totalChecks,
    task_passed: taskPassed,
    checks,
    errors: [],
  };
}