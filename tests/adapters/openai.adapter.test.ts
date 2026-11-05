import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAIAdapter } from "../../src/adapters/openai.adapter";

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      responses: {
        create: createMock,
      },
    };
  }),
}));

describe("OpenAIAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject a missing API key", () => {
    expect(() => new OpenAIAdapter("")).toThrow("OpenAI API key is missing.");
  });

  it("should send a request and capture the model response", async () => {
    createMock.mockResolvedValue({
      model: "test-model",
      output_text: '{"task_id":"MB-01","status":"completed"}',
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    });

    const adapter = new OpenAIAdapter("test-api-key");

    const result = await adapter.generate({
      model: "test-model",
      systemPrompt: "You are a voyage planning assistant.",
      userPrompt: "Evaluate MB-01.",
    });

    expect(createMock).toHaveBeenCalledWith({
      model: "test-model",
      instructions: "You are a voyage planning assistant.",
      input: "Evaluate MB-01.",
    });

    expect(result).toMatchObject({
      provider: "openai",
      model: "test-model",
      content: '{"task_id":"MB-01","status":"completed"}',
      inputTokens: 100,
      outputTokens: 50,
    });

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("should pass optional generation settings", async () => {
    createMock.mockResolvedValue({
      model: "test-model",
      output_text: "{}",
      usage: {
        input_tokens: 10,
        output_tokens: 5,
      },
    });

    const adapter = new OpenAIAdapter("test-api-key");

    await adapter.generate({
      model: "test-model",
      systemPrompt: "System instructions.",
      userPrompt: "User input.",
      temperature: 0,
      maxOutputTokens: 500,
    });

    expect(createMock).toHaveBeenCalledWith({
      model: "test-model",
      instructions: "System instructions.",
      input: "User input.",
      temperature: 0,
      max_output_tokens: 500,
    });
  });
});
