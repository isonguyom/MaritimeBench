export interface ModelRequest {
  model: string;
  taskId?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface ModelResponse {
  provider: string;
  model: string;
  content: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface ModelAdapter {
  readonly provider: string;

  generate(request: ModelRequest): Promise<ModelResponse>;
}
