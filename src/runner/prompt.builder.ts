import type { VoyageTask } from "../schemas/task.schema";

export interface EvaluationPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export function buildEvaluationPrompt(
  task: VoyageTask,
): EvaluationPrompt {
  const systemPrompt = `
You are an AI assistant being evaluated on operational voyage planning.

Your task is to analyse the supplied voyage information and calculate the voyage outcome accurately.

Follow these rules strictly:

1. Use UTC for all timestamps.
2. Use nautical miles (nm) for distance and knots (kn) for speed.
3. Calculate travel time using distance divided by speed.
4. Apply weather speed restrictions only during the specified restriction period and only while the vessel is underway.
5. Apply port receiving windows when calculating permitted arrival and waiting time.
6. Treat port-window opening and closing times as inclusive.
7. A hard deadline is feasible only if the physical ETA is at or before the deadline.
8. Do not invent missing information, vessel speeds, or operational assumptions.
9. If required information is missing, identify it and return insufficient_information.
10. If an input is invalid, return invalid_input.
11. Explain your calculations and state any assumptions.

Return only a valid JSON object with these fields:

{
  "task_id": "string",
  "status": "completed | insufficient_information | invalid_input",
  "total_travel_hours": "number or null",
  "physical_eta": "ISO 8601 timestamp or null",
  "permitted_arrival": "ISO 8601 timestamp or null",
  "waiting_hours": "number or null",
  "deadline_feasible": "boolean or null",
  "missing_inputs": ["string"],
  "assumptions": ["string"],
  "explanation": "string"
}

Do not include Markdown formatting, code fences, or additional text outside the JSON object.

Do not claim that a voyage is operationally feasible merely because its physical ETA has been calculated. Assess each applicable constraint separately.
`.trim();

  const userPrompt = `
Evaluate the following voyage task.

TASK DATA:

${JSON.stringify(task, null, 2)}

Calculate the voyage outcome using the supplied information and follow the system instructions.

Return the result in the required JSON format.
`.trim();

  return {
    systemPrompt,
    userPrompt,
  };
}