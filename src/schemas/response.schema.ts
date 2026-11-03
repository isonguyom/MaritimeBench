import { z } from "zod";

export const VoyageResponseSchema = z.object({
  task_id: z.string(),

  status: z.enum([
    "completed",
    "insufficient_information",
    "invalid_input",
  ]),

  total_travel_hours: z.number().nonnegative().nullable(),

  physical_eta: z.string().datetime().nullable(),

  permitted_arrival: z.string().datetime().nullable(),

  waiting_hours: z.number().nonnegative().nullable(),

  deadline_feasible: z.boolean().nullable(),

  missing_inputs: z.array(z.string()),

  assumptions: z.array(z.string()),

  explanation: z.string(),
});

export type VoyageResponse = z.infer<typeof VoyageResponseSchema>;