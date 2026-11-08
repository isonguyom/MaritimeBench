import { describe, expect, it } from "vitest";

import { MockAdapter } from "../../src/adapters/mock.adapter";
import { getMockResponse } from "../../src/adapters/mock.responses";

describe("MockAdapter", () => {
  it("returns the mock response configured for the requested task", async () => {
    const adapter = new MockAdapter();

    const response = await adapter.generate({
      model: "test-model",
      taskId: "MB-01",
      systemPrompt: "Test system prompt",
      userPrompt: "Test user prompt",
    });

    expect(response).toEqual({
      provider: "mock",
      model: "test-model",
      content: getMockResponse("MB-01"),
      latencyMs: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  });

  it("uses the configured mock latency", async () => {
    const adapter = new MockAdapter(250);

    const response = await adapter.generate({
      model: "test-model",
      taskId: "MB-01",
      systemPrompt: "Test system prompt",
      userPrompt: "Test user prompt",
    });

    expect(response.latencyMs).toBe(250);
  });

  it("rejects requests without a task ID", async () => {
    const adapter = new MockAdapter();

    await expect(
      adapter.generate({
        model: "test-model",
        systemPrompt: "Test system prompt",
        userPrompt: "Test user prompt",
      }),
    ).rejects.toThrow("MockAdapter requires a task ID.");
  });

  it("implements the ModelAdapter interface", () => {
    const adapter = new MockAdapter();

    expect(adapter.provider).toBe("mock");
    expect(typeof adapter.generate).toBe("function");
  });
});
