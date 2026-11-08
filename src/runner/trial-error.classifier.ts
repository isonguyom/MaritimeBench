export type TrialErrorCategory = "transient" | "permanent" | "unknown";

export interface TrialErrorClassification {
  category: TrialErrorCategory;
  message: string;
  status?: number;
  continuable: boolean;
}

export class ModelRequestError extends Error {
  constructor(public readonly originalError: unknown) {
    const message =
      originalError instanceof Error
        ? originalError.message
        : String(originalError);

    super(`Model request failed: ${message}`);

    this.name = "ModelRequestError";
  }
}

export function classifyTrialError(error: unknown): TrialErrorClassification {
  const originalError =
    error instanceof ModelRequestError ? error.originalError : error;

  const message =
    originalError instanceof Error
      ? originalError.message
      : String(originalError);

  error = originalError;

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : undefined;

  if (status !== undefined && status >= 100 && status <= 599) {
    if (status === 408 || status === 409 || status === 429 || status >= 500) {
      return {
        category: "transient",
        message,
        status,
        continuable: true,
      };
    }

    if (status >= 400 && status < 500) {
      return {
        category: "permanent",
        message,
        status,
        continuable: false,
      };
    }
  }

  if (
    error instanceof Error &&
    (error.name === "APIConnectionError" ||
      error.name === "APIConnectionTimeoutError")
  ) {
    return {
      category: "transient",
      message,
      continuable: true,
    };
  }

  return {
    category: "unknown",
    message,
    continuable: false,
  };
}
