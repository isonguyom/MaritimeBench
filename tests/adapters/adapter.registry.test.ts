import { describe, expect, it, vi } from "vitest";
import type { ModelAdapter } from "../../src/adapters/model.adapter";
import {
  getRegisteredProviders,
  registerAdapter,
  resolveAdapter,
} from "../../src/adapters/adapter.registry";

function createMockAdapter(provider: string): ModelAdapter {
  return {
    provider,
    generate: vi.fn(),
  };
}

describe("Adapter Registry", () => {
  it("should register all built-in providers", () => {
    expect(getRegisteredProviders()).toEqual([
      "mock",
      "openai",
      "anthropic",
      "google",
    ]);
  });

  it("should resolve the mock adapter with its default model", () => {
    const result = resolveAdapter("mock");

    expect(result.adapter.provider).toBe("mock");
    expect(result.model).toBe("mock-model");
  });

  it("should normalize provider names", () => {
    const result = resolveAdapter(" MOCK ");

    expect(result.adapter.provider).toBe("mock");
    expect(result.model).toBe("mock-model");
  });

  it("should reject an unsupported provider", () => {
    expect(() => resolveAdapter("unsupported")).toThrow(
      "Unsupported provider: unsupported.",
    );
  });

  it("should prioritize a model override over the environment variable", () => {
    const envName = "MARITIMEBENCH_REGISTRY_OVERRIDE_MODEL";
    const previousValue = process.env[envName];

    try {
      process.env[envName] = "environment-model";

      const adapter = createMockAdapter("registry-override-test");
      const createAdapter = vi.fn(() => adapter);

      registerAdapter("registry-override-test", {
        createAdapter,
        modelEnvironmentVariable: envName,
        defaultModel: "default-model",
      });

      const result = resolveAdapter("registry-override-test", "override-model");

      expect(result.model).toBe("override-model");
      expect(result.adapter).toBe(adapter);
      expect(createAdapter).toHaveBeenCalledOnce();
    } finally {
      if (previousValue === undefined) {
        delete process.env[envName];
      } else {
        process.env[envName] = previousValue;
      }
    }
  });

  it("should use the environment variable when no model override is provided", () => {
    const envName = "MARITIMEBENCH_REGISTRY_ENV_MODEL";
    const previousValue = process.env[envName];

    try {
      process.env[envName] = "environment-model";

      const adapter = createMockAdapter("registry-env-test");
      const createAdapter = vi.fn(() => adapter);

      registerAdapter("registry-env-test", {
        createAdapter,
        modelEnvironmentVariable: envName,
      });

      const result = resolveAdapter("registry-env-test");

      expect(result.model).toBe("environment-model");
      expect(result.adapter).toBe(adapter);
      expect(createAdapter).toHaveBeenCalledOnce();
    } finally {
      if (previousValue === undefined) {
        delete process.env[envName];
      } else {
        process.env[envName] = previousValue;
      }
    }
  });

  it("should use the default model when no override or environment value exists", () => {
    const adapter = createMockAdapter("registry-default-test");

    registerAdapter("registry-default-test", {
      createAdapter: () => adapter,
      defaultModel: "default-model",
    });

    const result = resolveAdapter("registry-default-test");

    expect(result.model).toBe("default-model");
    expect(result.adapter).toBe(adapter);
  });

  it("should reject a missing model configuration", () => {
    const createAdapter = vi.fn(() =>
      createMockAdapter("registry-missing-test"),
    );

    registerAdapter("registry-missing-test", {
      createAdapter,
      modelEnvironmentVariable: "MARITIMEBENCH_NONEXISTENT_MODEL",
    });

    expect(() => resolveAdapter("registry-missing-test")).toThrow(
      "No model configured for registry-missing-test.",
    );

    expect(createAdapter).not.toHaveBeenCalled();
  });

  it("should normalize provider names during registration", () => {
    const adapter = createMockAdapter("registry-normalized-test");

    registerAdapter(" Registry-Normalized-Test ", {
      createAdapter: () => adapter,
      defaultModel: "test-model",
    });

    const result = resolveAdapter("REGISTRY-NORMALIZED-TEST");

    expect(result.adapter).toBe(adapter);
    expect(result.model).toBe("test-model");
  });

  it("should reject an empty provider name", () => {
    expect(() =>
      registerAdapter("   ", {
        createAdapter: () => createMockAdapter("empty-test"),
        defaultModel: "test-model",
      }),
    ).toThrow("Provider name cannot be empty.");
  });

  it("should reject duplicate provider registrations", () => {
    const registration = {
      createAdapter: () => createMockAdapter("registry-duplicate-test"),
      defaultModel: "test-model",
    };

    registerAdapter("registry-duplicate-test", registration);

    expect(() =>
      registerAdapter("REGISTRY-DUPLICATE-TEST", registration),
    ).toThrow("Provider already registered: registry-duplicate-test");
  });
});
