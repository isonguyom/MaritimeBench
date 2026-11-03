import { describe, expect, it } from "vitest";

import { MockAdapter } from "../../src/adapters/mock.adapter";

describe("MockAdapter", () => {
  it("returns the predefined mock response", async () => {
    const mockContent = '{"task_id":"MB-01","status":"completed"}';

    const adapter = new MockAdapter(mockContent);

    const response = await adapter.generate({
      model: "test-model",
      systemPrompt: "Test system prompt",
      userPrompt: "Test user prompt",
    });

    expect(response).toEqual({
      provider: "mock",
      model: "test-model",
      content: mockContent,
      latencyMs: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  });

  it("uses the configured mock latency", async () => {
    const adapter = new MockAdapter("{}", 250);

    const response = await adapter.generate({
      model: "test-model",
      systemPrompt: "Test system prompt",
      userPrompt: "Test user prompt",
    });

    expect(response.latencyMs).toBe(250);
  });

  it("implements the ModelAdapter interface", () => {
    const adapter = new MockAdapter("{}");

    expect(adapter.provider).toBe("mock");
    expect(typeof adapter.generate).toBe("function");
  });
});