import type {
  ModelAdapter,
  ModelRequest,
  ModelResponse,
} from "./model.adapter";

export class MockAdapter implements ModelAdapter {
  readonly provider = "mock";

  constructor(
    private readonly mockContent: string,
    private readonly mockLatencyMs = 0,
  ) {}

  async generate(request: ModelRequest): Promise<ModelResponse> {
    return {
      provider: this.provider,
      model: request.model,
      content: this.mockContent,
      latencyMs: this.mockLatencyMs,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}
