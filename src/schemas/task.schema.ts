import { z } from "zod";

import {
  nonEmptyString,
  descriptionString,
  taskIdSchema,
  legIdSchema,
  clockTimeSchema,
} from "./common.schema";

export const VoyageLegSchema = z.object({
  leg_id: legIdSchema,

  distance_nm: z.number().positive(),
  speed_kn: z.number().positive().optional(),
});

export const WeatherRestrictionSchema = z
  .object({
    start_time: z.iso.datetime(),
    end_time: z.iso.datetime(),
    restricted_speed_kn: z.number().positive(),
  })
  .refine(
    (restriction) =>
      Date.parse(restriction.end_time) > Date.parse(restriction.start_time),
    {
      message: "Weather restriction end time must be later than start time",
      path: ["end_time"],
    },
  );

export const PortWindowSchema = z.object({
  opens_at: clockTimeSchema,
  closes_at: clockTimeSchema,
});

export const VoyageTaskSchema = z.object({
  task_id: taskIdSchema,
  title: nonEmptyString,
  description: descriptionString,

  departure_time: z.iso.datetime(),

  legs: z.array(VoyageLegSchema).min(1),

  weather_restrictions: z.array(WeatherRestrictionSchema).default([]),

  port_window: PortWindowSchema.optional(),

  deadline: z.iso.datetime().optional(),
});

export type VoyageTask = z.infer<typeof VoyageTaskSchema>;
