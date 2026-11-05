import type { VoyageTask } from "../schemas/task.schema";
import { addHoursToDate, calculateTravelHours } from "../utils/time.utils";
import { calculateWeatherRestrictedVoyage } from "../utils/weather.utils";
import { calculatePortArrival } from "../utils/port.utils";
import { calculateDeadlineFeasibility } from "../utils/deadline.utils";

export interface VoyageCalculationResult {
  task_id: string;
  status: "completed" | "insufficient_information";
  total_travel_hours: number | null;
  physical_eta: string | null;
  permitted_arrival: string | null;
  waiting_hours: number | null;
  deadline_feasible: boolean | null;
  deadline_delay_hours: number | null;
  missing_inputs: string[];
}

export function calculateVoyage(task: VoyageTask): VoyageCalculationResult {
  const missingInputs: string[] = [];

  for (const leg of task.legs) {
    if (leg.speed_kn === undefined) {
      missingInputs.push("vessel_speed");
      break;
    }
  }

  if (missingInputs.length > 0) {
    return {
      task_id: task.task_id,
      status: "insufficient_information",
      total_travel_hours: null,
      physical_eta: null,
      permitted_arrival: null,
      waiting_hours: null,
      deadline_feasible: null,
      deadline_delay_hours: null,
      missing_inputs: missingInputs,
    };
  }

  let totalTravelHours = 0;
  let physicalEta: string;

  if (task.weather_restrictions.length > 0) {
    if (task.legs.length !== 1 || task.weather_restrictions.length !== 1) {
      throw new Error(
        "Weather calculations currently support one leg and one restriction.",
      );
    }

    const leg = task.legs[0];

    const weatherResult = calculateWeatherRestrictedVoyage(
      task.departure_time,
      leg.distance_nm,
      leg.speed_kn!,
      task.weather_restrictions[0],
    );

    totalTravelHours = weatherResult.total_travel_hours;
    physicalEta = weatherResult.arrival_time;
  } else {
    for (const leg of task.legs) {
      totalTravelHours += calculateTravelHours(leg.distance_nm, leg.speed_kn!);
    }

    physicalEta = addHoursToDate(task.departure_time, totalTravelHours);
  }

  let permittedArrival: string | null = null;
  let waitingHours: number | null = null;

  if (task.port_window) {
    const portResult = calculatePortArrival(physicalEta, task.port_window);

    permittedArrival = portResult.permitted_arrival;
    waitingHours = portResult.waiting_hours;
  }

  let deadlineFeasible: boolean | null = null;
  let deadlineDelayHours: number | null = null;

  if (task.deadline) {
    const deadlineResult = calculateDeadlineFeasibility(
      physicalEta,
      task.deadline,
    );

    deadlineFeasible = deadlineResult.deadline_feasible;
    deadlineDelayHours = deadlineResult.delay_hours;
  }

  return {
    task_id: task.task_id,
    status: "completed",
    total_travel_hours: totalTravelHours,
    physical_eta: physicalEta,
    permitted_arrival: permittedArrival,
    waiting_hours: waitingHours,
    deadline_feasible: deadlineFeasible,
    deadline_delay_hours: deadlineDelayHours,
    missing_inputs: [],
  };
}
