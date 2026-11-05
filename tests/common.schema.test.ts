import { describe, expect, it } from "vitest";
import {
  nonEmptyString,
  descriptionString,
  taskIdSchema,
  legIdSchema,
  clockTimeSchema,
} from "../src/schemas/common.schema";

describe("nonEmptyString", () => {
  it("should accept a non-empty string", () => {
    expect(nonEmptyString.safeParse("Voyage planning").success).toBe(true);
  });

  it.each(["", " ", "   ", "\t", "\n"])(
    "should reject an empty or whitespace-only string: %j",
    (value) => {
      expect(nonEmptyString.safeParse(value).success).toBe(false);
    },
  );
});

describe("descriptionString", () => {
  it("should accept an empty string", () => {
    expect(descriptionString.safeParse("").success).toBe(true);
  });

  it("should accept a non-empty string", () => {
    expect(descriptionString.safeParse("Voyage planning task").success).toBe(
      true,
    );
  });

  it.each([" ", "   ", "\t", "\n"])(
    "should reject a whitespace-only string: %j",
    (value) => {
      expect(descriptionString.safeParse(value).success).toBe(false);
    },
  );
});

describe("taskIdSchema", () => {
  it.each(["MB-01", "MB-08", "MB-10", "MB-100"])(
    "should accept a valid task ID: %s",
    (value) => {
      expect(taskIdSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each(["MB-1", "MB-ABC", "MB-01-extra", "mb-01", "MB-"])(
    "should reject an invalid task ID: %s",
    (value) => {
      expect(taskIdSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("legIdSchema", () => {
  it.each(["LEG-01", "LEG-12", "LEG-100"])(
    "should accept a valid leg ID: %s",
    (value) => {
      expect(legIdSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each(["LEG-1", "LEG-ABC", "LEG-01-extra", "leg-01", "LEG-"])(
    "should reject an invalid leg ID: %s",
    (value) => {
      expect(legIdSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("clockTimeSchema", () => {
  it.each(["00:00", "08:30", "12:00", "18:45", "23:59"])(
    "should accept a valid 24-hour time: %s",
    (value) => {
      expect(clockTimeSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each(["24:00", "25:90", "12:60", "8:30", "12:5", "not-a-time"])(
    "should reject an invalid 24-hour time: %s",
    (value) => {
      expect(clockTimeSchema.safeParse(value).success).toBe(false);
    },
  );
});
