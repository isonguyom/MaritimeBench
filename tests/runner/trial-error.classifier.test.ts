import { describe, expect, it } from "vitest";
import {
  classifyTrialError,
  ModelRequestError,
} from "../../src/runner/trial-error.classifier";

describe("classifyTrialError", () => {
  it.each([408, 409, 429, 500, 502, 503])(
    "classifies HTTP %i as transient",
    (status) => {
      const error = Object.assign(new Error("Temporary API failure."), {
        status,
      });

      expect(classifyTrialError(error)).toEqual({
        category: "transient",
        message: "Temporary API failure.",
        status,
        continuable: true,
      });
    },
  );

  it.each([400, 401, 403, 404, 422])(
    "classifies HTTP %i as permanent",
    (status) => {
      const error = Object.assign(new Error("Permanent API failure."), {
        status,
      });

      expect(classifyTrialError(error)).toEqual({
        category: "permanent",
        message: "Permanent API failure.",
        status,
        continuable: false,
      });
    },
  );

  it.each([99, 600, 999])(
    "classifies invalid HTTP status %i as unknown",
    (status) => {
      const error = Object.assign(new Error("Invalid status code."), {
        status,
      });

      expect(classifyTrialError(error)).toEqual({
        category: "unknown",
        message: "Invalid status code.",
        continuable: false,
      });
    },
  );

  it("classifies connection errors as transient", () => {
    const error = new Error("Connection failed.");
    error.name = "APIConnectionError";

    expect(classifyTrialError(error)).toEqual({
      category: "transient",
      message: "Connection failed.",
      continuable: true,
    });
  });

  it("classifies connection timeout errors as transient", () => {
    const error = new Error("Request timed out.");
    error.name = "APIConnectionTimeoutError";

    expect(classifyTrialError(error)).toEqual({
      category: "transient",
      message: "Request timed out.",
      continuable: true,
    });
  });

  it("classifies unknown errors as non-continuable", () => {
    expect(classifyTrialError(new Error("Unexpected failure."))).toEqual({
      category: "unknown",
      message: "Unexpected failure.",
      continuable: false,
    });
  });

  it("handles non-Error values", () => {
    expect(classifyTrialError("Unexpected string failure.")).toEqual({
      category: "unknown",
      message: "Unexpected string failure.",
      continuable: false,
    });
  });

  it("unwraps ModelRequestError and classifies the original error", () => {
    const originalError = Object.assign(new Error("Rate limit exceeded."), {
      status: 429,
    });

    const error = new ModelRequestError(originalError);

    expect(classifyTrialError(error)).toEqual({
      category: "transient",
      message: "Rate limit exceeded.",
      status: 429,
      continuable: true,
    });
  });
});
