import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnthropicAdapter } from "../../src/adapters/anthropic.adapter";

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      messages: {
        create: createMock,
      },
    };
  }),
}));

describe("AnthropicAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject a missing API key", () => {
    expect(() => new AnthropicAdapter("")).toThrow(
      "Anthropic API key is missing.",
    );
  });

  it("should send a request and capture the model response", async () => {
    createMock.mockResolvedValue({
      model: "claude-test-model",
      content: [
        {
          type: "text",
          text: '{"task_id":"MB-01","status":"completed"}',
        },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    });

    const adapter = new AnthropicAdapter("test-api-key");

    const result = await adapter.generate({
      model: "claude-test-model",
      systemPrompt: "You are a voyage planning assistant.",
      userPrompt: "Evaluate MB-01.",
    });

    expect(createMock).toHaveBeenCalledWith({
      model: "claude-test-model",
      max_tokens: 4096,
      system: "You are a voyage planning assistant.",
      messages: [
        {
          role: "user",
          content: "Evaluate MB-01.",
        },
      ],
    });

    expect(result).toMatchObject({
      provider: "anthropic",
      model: "claude-test-model",
      content: '{"task_id":"MB-01","status":"completed"}',
      inputTokens: 100,
      outputTokens: 50,
    });

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("should pass optional generation settings", async () => {
    createMock.mockResolvedValue({
      model: "claude-test-model",
      content: [{ type: "text", text: "{}" }],
      usage: {
        input_tokens: 10,
        output_tokens: 5,
      },
    });

    const adapter = new AnthropicAdapter("test-api-key");

    await adapter.generate({
      model: "claude-test-model",
      systemPrompt: "System instructions.",
      userPrompt: "User input.",
      temperature: 0,
      maxOutputTokens: 500,
    });

    expect(createMock).toHaveBeenCalledWith({
      model: "claude-test-model",
      max_tokens: 500,
      system: "System instructions.",
      messages: [
        {
          role: "user",
          content: "User input.",
        },
      ],
      temperature: 0,
    });
  });
});
