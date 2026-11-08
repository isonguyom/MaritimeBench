import Anthropic from "@anthropic-ai/sdk";
import type {
  ModelAdapter,
  ModelRequest,
  ModelResponse,
} from "./model.adapter";

export class AnthropicAdapter implements ModelAdapter {
  readonly provider = "anthropic";

  private readonly client: Anthropic;

  constructor(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey || apiKey === "your_anthropic_api_key_here") {
      throw new Error(
        "Anthropic API key is missing. Add a valid ANTHROPIC_API_KEY to your .env file.",
      );
    }

    this.client = new Anthropic({ apiKey });
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();

    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxOutputTokens ?? 4096,
      system: request.systemPrompt,
      messages: [
        {
          role: "user",
          content: request.userPrompt,
        },
      ],
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
    });

    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    return {
      provider: this.provider,
      model: response.model,
      content,
      latencyMs: Date.now() - startTime,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
