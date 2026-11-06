import { z } from "zod";

import {
  nonEmptyString,
  descriptionString,
  taskIdSchema,
  legIdSchema,
  clockTimeSchema,
} from "./common.schema";

const VoyageLegBaseSchema = z.object({
  leg_id: legIdSchema,
  distance_nm: z.number().positive(),
  speed_kn: z.number().optional(),
});

export const VoyageLegSchema = VoyageLegBaseSchema.extend({
  speed_kn: z.number().positive().optional(),
});

const WeatherRestrictionBaseSchema = z.object({
  start_time: z.iso.datetime(),
  end_time: z.iso.datetime(),
  restricted_speed_kn: z.number().positive(),
});

export const WeatherRestrictionSchema = WeatherRestrictionBaseSchema.refine(
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

const VoyageTaskShape = {
  task_id: taskIdSchema,
  title: nonEmptyString,
  description: descriptionString,
  departure_time: z.iso.datetime(),
  port_window: PortWindowSchema.optional(),
  deadline: z.iso.datetime().optional(),
};

export const VoyageTaskSchema = z.object({
  ...VoyageTaskShape,
  legs: z.array(VoyageLegSchema).min(1),
  weather_restrictions: z.array(WeatherRestrictionSchema).default([]),
});

export const InvalidVoyageTaskSchema = z.object({
  ...VoyageTaskShape,
  legs: z.array(VoyageLegBaseSchema).min(1),
  weather_restrictions: z.array(WeatherRestrictionBaseSchema).default([]),
});

export type VoyageTask = z.infer<typeof VoyageTaskSchema>;

export type InvalidVoyageTask = z.infer<typeof InvalidVoyageTaskSchema>;

export type VoyageTaskInput = VoyageTask | InvalidVoyageTask;
