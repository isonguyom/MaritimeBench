import type {
  ModelAdapter,
  ModelRequest,
  ModelResponse,
} from "./model.adapter";
import { getMockResponse } from "./mock.responses";

export class MockAdapter implements ModelAdapter {
  readonly provider = "mock";

  constructor(private readonly mockLatencyMs = 0) {}

  async generate(request: ModelRequest): Promise<ModelResponse> {
    if (!request.taskId) {
      throw new Error("MockAdapter requires a task ID.");
    }

    return {
      provider: this.provider,
      model: request.model,
      content: getMockResponse(request.taskId),
      latencyMs: this.mockLatencyMs,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}
