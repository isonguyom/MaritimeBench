import { GoogleGenAI } from "@google/genai";
import type {
  ModelAdapter,
  ModelRequest,
  ModelResponse,
} from "./model.adapter";

export class GoogleAdapter implements ModelAdapter {
  readonly provider = "google";

  private readonly client: GoogleGenAI;

  constructor(apiKey: string | undefined = process.env.GOOGLE_API_KEY) {
    if (!apiKey || apiKey === "your_google_api_key_here") {
      throw new Error(
        "Google API key is missing. Add a valid GOOGLE_API_KEY to your .env file.",
      );
    }

    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();

    const response = await this.client.models.generateContent({
      model: request.model,
      contents: request.userPrompt,
      config: {
        systemInstruction: request.systemPrompt,
        ...(request.maxOutputTokens !== undefined
          ? { maxOutputTokens: request.maxOutputTokens }
          : {}),
        ...(request.temperature !== undefined
          ? { temperature: request.temperature }
          : {}),
      },
    });

    return {
      provider: this.provider,
      model: request.model,
      content: response.text ?? "",
      latencyMs: Date.now() - startTime,
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    };
  }
}
