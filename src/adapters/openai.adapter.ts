import OpenAI from "openai";
import type {
  ModelAdapter,
  ModelRequest,
  ModelResponse,
} from "./model.adapter";

export class OpenAIAdapter implements ModelAdapter {
  readonly provider = "openai";

  private readonly client: OpenAI;

  constructor(apiKey: string | undefined = process.env.OPENAI_API_KEY) {
    if (!apiKey || apiKey === "your_openai_api_key_here") {
      throw new Error(
        "OpenAI API key is missing. Add a valid OPENAI_API_KEY to your .env file.",
      );
    }

    this.client = new OpenAI({ apiKey });
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();

    const response = await this.client.responses.create({
      model: request.model,
      instructions: request.systemPrompt,
      input: request.userPrompt,
      ...(request.maxOutputTokens !== undefined
        ? { max_output_tokens: request.maxOutputTokens }
        : {}),
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
    });

    return {
      provider: this.provider,
      model: response.model,
      content: response.output_text,
      latencyMs: Date.now() - startTime,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    };
  }
}