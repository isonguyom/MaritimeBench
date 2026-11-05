import { z } from "zod";

import { nonEmptyString, taskIdSchema } from "./common.schema";

export const VoyageResponseSchema = z.object({
  task_id: taskIdSchema,

  status: z.enum(["completed", "insufficient_information", "invalid_input"]),

  total_travel_hours: z.number().nonnegative().nullable(),

  physical_eta: z.iso.datetime().nullable(),

  permitted_arrival: z.iso.datetime().nullable(),

  waiting_hours: z.number().nonnegative().nullable(),

  deadline_feasible: z.boolean().nullable(),

  missing_inputs: z.array(nonEmptyString),

  assumptions: z.array(nonEmptyString),

  explanation: nonEmptyString,
});

export type VoyageResponse = z.infer<typeof VoyageResponseSchema>;
