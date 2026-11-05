import { z } from "zod";

export const nonEmptyString = z
  .string()
  .refine(
    (value) => value.trim().length > 0,
    "Must not be empty or contain only whitespace",
  );

export const descriptionString = z
  .string()
  .refine(
    (value) => value.length === 0 || value.trim().length > 0,
    "Must not contain only whitespace",
  );

export const taskIdSchema = z
  .string()
  .regex(
    /^MB-\d{2,}$/,
    "Task ID must follow the pattern MB-XX with at least two digits",
  );

export const legIdSchema = z
  .string()
  .regex(
    /^LEG-\d{2,}$/,
    "Leg ID must follow the pattern LEG-XX with at least two digits",
  );

export const clockTimeSchema = z
  .string()
  .regex(
    /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    "Time must be a valid 24-hour HH:MM value",
  );
