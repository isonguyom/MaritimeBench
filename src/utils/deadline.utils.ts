export interface DeadlineResult {
  physical_eta: string;
  deadline: string;
  deadline_feasible: boolean;
  delay_hours: number;
}

export function calculateDeadlineFeasibility(
  physicalEta: string,
  deadline: string,
): DeadlineResult {
  const etaTimestamp = new Date(physicalEta).getTime();
  const deadlineTimestamp = new Date(deadline).getTime();

  if (
    !Number.isFinite(etaTimestamp) ||
    !Number.isFinite(deadlineTimestamp)
  ) {
    throw new Error("Invalid physical ETA or deadline.");
  }

  const deadlineFeasible = etaTimestamp <= deadlineTimestamp;

  const delayHours = deadlineFeasible
    ? 0
    : (etaTimestamp - deadlineTimestamp) / 3_600_000;

  return {
    physical_eta: new Date(etaTimestamp).toISOString(),
    deadline: new Date(deadlineTimestamp).toISOString(),
    deadline_feasible: deadlineFeasible,
    delay_hours: delayHours,
  };
}