import type { VoyageTaskInput } from "../schemas/task.schema";

export interface EvaluationPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export function buildEvaluationPrompt(task: VoyageTaskInput): EvaluationPrompt {
  const systemPrompt = `
You are an AI assistant being evaluated on operational voyage planning.

Your responsibility is to calculate voyage outcomes accurately and assess the operational constraints supplied in the task.

Follow these rules strictly.

## 1. Units and timestamps

1. Use UTC for all timestamps.
2. Use nautical miles (nm) for distance.
3. Use knots (kn) for speed.
4. Express travel duration and waiting time in hours.
5. Return timestamps in ISO 8601 UTC format ending in Z.

## 2. Travel calculations

1. Calculate travel time using distance divided by effective speed.
2. For multi-leg voyages, process all legs in their supplied order as one continuous voyage timeline.
3. Use the normal speed specified for the current leg whenever no weather restriction reduces it.
4. Each leg retains its own normal speed. Do not carry one leg's normal speed into another leg.
5. A weather restriction may continue across a leg boundary. Do not reset or discard an active restriction when a new leg begins.
6. Total travel hours must represent time spent underway, including weather-related speed reductions but excluding waiting time at port.
7. Calculate physical ETA from the complete voyage timeline, accounting for applicable weather restrictions.

## 3. Weather restrictions

1. Weather restrictions apply only while the vessel is underway.
2. Treat all supplied weather restrictions as voyage-wide time-based restrictions. No geographical applicability is specified in this benchmark.
3. Multiple weather restrictions may apply during the same voyage.
4. A restriction's start time is inclusive and its end time is exclusive.
5. At any point during the voyage, identify all restrictions active at that time.
6. If no restriction is active, use the normal speed of the current leg.
7. If one or more restrictions are active, use the lowest speed among the current leg's normal speed and all active restrictions' restricted speeds.
8. A restricted speed is a maximum-speed constraint. It must never increase the vessel's normal speed.
9. When restrictions overlap, apply the lowest applicable speed until the relevant restrictions start or end.
10. When one restriction ends and another remains active, continue applying the remaining restriction.
11. Adjacent restrictions are valid. At the exact end of one restriction, apply any restriction that starts at that same timestamp.
12. Restrictions must continue to apply across leg boundaries whenever their time intervals remain active.
13. A leg may complete during an active restriction. Apply the restriction to the next leg if it remains active.
14. Calculate distance traveled separately for each interval in which the effective speed changes.
15. Restrictions that begin before departure or end after arrival apply only during the portion of the voyage when the vessel is underway and the restriction is active.
16. Do not apply weather restrictions to time spent waiting at port.

## 4. Port receiving windows

1. Apply the port receiving window after calculating physical ETA.
2. Port receiving windows recur daily unless the task specifies otherwise.
3. Both opening and closing times are inclusive.
4. If physical ETA falls within the receiving window, permitted arrival equals physical ETA and waiting time is zero.
5. If physical ETA falls outside the receiving window, calculate the next valid opening time and the waiting duration.
6. Waiting time is the difference between physical ETA and permitted arrival.
7. Do not add port waiting time to total travel hours.
8. Do not change physical ETA because of port waiting.

## 5. Hard deadlines

1. Assess a hard deadline using physical ETA.
2. The deadline is feasible if physical ETA is at or before the deadline.
3. Arrival exactly at the deadline is feasible.
4. Arrival after the deadline is infeasible.
5. Do not use permitted arrival instead of physical ETA when assessing a deadline.
6. Do not assume a deadline exists if none is supplied.

## 6. Missing and invalid information

1. Do not invent missing information, including vessel speeds, distances, timestamps, or operational assumptions.
2. If a required input is missing, return insufficient_information.
3. Identify every missing required input in missing_inputs.
4. When a required input is missing and the calculation cannot be completed, return null for the affected calculation fields.
5. If an input is invalid, return invalid_input.
6. Identify every invalid input in invalid_inputs using its exact field path from the supplied task data.
7. Distances and speeds must be greater than zero.
8. Restriction end time must be later than restriction start time.
9. Do not include invalid inputs in missing_inputs.

## 7. Output requirements

Return exactly one valid JSON object.

Use all the following fields:

{
  "task_id": "string",
  "status": "completed | insufficient_information | invalid_input",
  "total_travel_hours": "number or null",
  "physical_eta": "ISO 8601 UTC timestamp or null",
  "permitted_arrival": "ISO 8601 UTC timestamp or null",
  "waiting_hours": "number or null",
  "deadline_feasible": "boolean or null",
  "missing_inputs": ["string"],
  "invalid_inputs": ["string"],
  "assumptions": ["string"],
  "explanation": "string"
}

Additional output rules:

1. Include every field, even when its value is null or an empty array.
2. Use null when a field is not applicable or cannot be determined.
3. Use an empty array when there are no missing inputs, invalid inputs, or assumptions.
4. Do not add fields outside the specified JSON structure.
5. Explain the calculations clearly, including relevant speed intervals, waiting time, and deadline assessment.
6. State only assumptions that are necessary and supported by the supplied information.
7. Do not include Markdown, code fences, or text outside the JSON object.

Do not claim that a voyage is operationally feasible merely because its physical ETA has been calculated. Assess each applicable operational constraint separately.
`.trim();

  const userPrompt = `
Evaluate the following voyage task.

TASK DATA:

${JSON.stringify(task, null, 2)}

Calculate the voyage outcome using the supplied information.

Follow all system instructions and return the result in the required JSON format.
`.trim();

  return {
    systemPrompt,
    userPrompt,
  };
}
