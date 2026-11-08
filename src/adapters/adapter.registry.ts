import type { ModelAdapter } from "./model.adapter";

import { MockAdapter } from "./mock.adapter";
import { OpenAIAdapter } from "./openai.adapter";
import { AnthropicAdapter } from "./anthropic.adapter";
import { GoogleAdapter } from "./google.adapter";

export interface AdapterRegistration {
  createAdapter: () => ModelAdapter;
  modelEnvironmentVariable?: string;
  defaultModel?: string;
}

export interface ResolvedAdapter {
  adapter: ModelAdapter;
  model: string;
}

const registrations = new Map<string, AdapterRegistration>();

export function registerAdapter(
  provider: string,
  registration: AdapterRegistration,
): void {
  const normalizedProvider = provider.trim().toLowerCase();

  if (!normalizedProvider) {
    throw new Error("Provider name cannot be empty.");
  }

  if (registrations.has(normalizedProvider)) {
    throw new Error(`Provider already registered: ${normalizedProvider}`);
  }

  registrations.set(normalizedProvider, registration);
}

export function getRegisteredProviders(): string[] {
  return [...registrations.keys()];
}

export function resolveAdapter(
  provider: string,
  modelOverride?: string,
): ResolvedAdapter {
  const normalizedProvider = provider.trim().toLowerCase();
  const registration = registrations.get(normalizedProvider);

  if (!registration) {
    throw new Error(
      `Unsupported provider: ${provider}. Supported providers: ${getRegisteredProviders().join(", ")}.`,
    );
  }

  const model =
    modelOverride?.trim() ||
    (registration.modelEnvironmentVariable
      ? process.env[registration.modelEnvironmentVariable]?.trim()
      : undefined) ||
    registration.defaultModel;

  if (!model) {
    const configuration = registration.modelEnvironmentVariable
      ? `--model or ${registration.modelEnvironmentVariable}`
      : "--model";

    throw new Error(
      `No model configured for ${normalizedProvider}. Specify ${configuration}.`,
    );
  }

  return {
    adapter: registration.createAdapter(),
    model,
  };
}

// Built-in provider registrations.

registerAdapter("mock", {
  createAdapter: () => new MockAdapter(),
  defaultModel: "mock-model",
});

registerAdapter("openai", {
  createAdapter: () => new OpenAIAdapter(),
  modelEnvironmentVariable: "OPENAI_MODEL",
});

registerAdapter("anthropic", {
  createAdapter: () => new AnthropicAdapter(),
  modelEnvironmentVariable: "ANTHROPIC_MODEL",
});

registerAdapter("google", {
  createAdapter: () => new GoogleAdapter(),
  modelEnvironmentVariable: "GOOGLE_MODEL",
});
