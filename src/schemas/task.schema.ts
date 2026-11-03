import { z } from "zod";

export const VoyageLegSchema = z.object({
  leg_id: z.string(),
  distance_nm: z.number().positive(),
  speed_kn: z.number().positive().optional(),
});

export const WeatherRestrictionSchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  restricted_speed_kn: z.number().positive(),
});

export const PortWindowSchema = z.object({
  opens_at: z.string().regex(/^\d{2}:\d{2}$/),
  closes_at: z.string().regex(/^\d{2}:\d{2}$/),
});

export const VoyageTaskSchema = z.object({
  task_id: z.string(),
  title: z.string(),
  description: z.string(),

  departure_time: z.string().datetime(),

  legs: z.array(VoyageLegSchema).min(1),

  weather_restrictions: z.array(WeatherRestrictionSchema).default([]),

  port_window: PortWindowSchema.optional(),

  deadline: z.string().datetime().optional(),
});

export type VoyageTask = z.infer<typeof VoyageTaskSchema>;