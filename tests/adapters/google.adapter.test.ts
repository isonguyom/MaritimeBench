import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAdapter } from "../../src/adapters/google.adapter";

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return {
      models: {
        generateContent: generateContentMock,
      },
    };
  }),
}));

describe("GoogleAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject a missing API key", () => {
    expect(() => new GoogleAdapter("")).toThrow("Google API key is missing.");
  });

  it("should send a request and capture the model response", async () => {
    generateContentMock.mockResolvedValue({
      text: '{"task_id":"MB-01","status":"completed"}',
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 50,
      },
    });

    const adapter = new GoogleAdapter("test-api-key");

    const result = await adapter.generate({
      model: "gemini-test-model",
      systemPrompt: "You are a voyage planning assistant.",
      userPrompt: "Evaluate MB-01.",
    });

    expect(generateContentMock).toHaveBeenCalledWith({
      model: "gemini-test-model",
      contents: "Evaluate MB-01.",
      config: {
        systemInstruction: "You are a voyage planning assistant.",
      },
    });

    expect(result).toMatchObject({
      provider: "google",
      model: "gemini-test-model",
      content: '{"task_id":"MB-01","status":"completed"}',
      inputTokens: 100,
      outputTokens: 50,
    });

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("should pass optional generation settings", async () => {
    generateContentMock.mockResolvedValue({
      text: "{}",
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
      },
    });

    const adapter = new GoogleAdapter("test-api-key");

    await adapter.generate({
      model: "gemini-test-model",
      systemPrompt: "System instructions.",
      userPrompt: "User input.",
      temperature: 0,
      maxOutputTokens: 500,
    });

    expect(generateContentMock).toHaveBeenCalledWith({
      model: "gemini-test-model",
      contents: "User input.",
      config: {
        systemInstruction: "System instructions.",
        temperature: 0,
        maxOutputTokens: 500,
      },
    });
  });
});
