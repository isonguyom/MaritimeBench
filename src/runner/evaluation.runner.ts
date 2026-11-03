import type { ModelAdapter } from "../adapters/model.adapter";
import { gradeVoyageResponse } from "../graders/voyage.grader";
import { loadEvaluationData } from "./data.loader";
import { buildEvaluationPrompt } from "./prompt.builder";
import { saveEvaluationResult } from "./result.storage";

export interface EvaluationRunOptions {
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface EvaluationRunResult {
  task_id: string;
  provider: string;
  model: string;
  latency_ms: number;
  input_tokens?: number;
  output_tokens?: number;
  raw_response: string;
  parse_error: string | null;
  grading: ReturnType<typeof gradeVoyageResponse>;
}

export async function runEvaluation(
  taskId: string,
  adapter: ModelAdapter,
  options: EvaluationRunOptions,
): Promise<EvaluationRunResult> {
  // Load and validate the task and its reference.
  const { task, reference } = loadEvaluationData(taskId);

  // Build the prompt using task data only.
  const prompt = buildEvaluationPrompt(task);

  // Send the task to the model through the supplied adapter.
  const modelResponse = await adapter.generate({
    model: options.model,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    ...(options.temperature !== undefined
      ? { temperature: options.temperature }
      : {}),
    ...(options.maxOutputTokens !== undefined
      ? { maxOutputTokens: options.maxOutputTokens }
      : {}),
  });

  // Parse the model's JSON response.
  let parsedResponse: unknown;
  let parseError: string | null = null;

  try {
    parsedResponse = JSON.parse(modelResponse.content);
  } catch (error) {
    parsedResponse = modelResponse.content;

    parseError =
      error instanceof Error
        ? error.message
        : String(error);
  }

  // Grade the response against the independently loaded reference.
  const grading = gradeVoyageResponse(
    parsedResponse,
    task,
    reference,
  );

  const result: EvaluationRunResult = {
    task_id: taskId,
    provider: modelResponse.provider,
    model: modelResponse.model,
    latency_ms: modelResponse.latencyMs,
    ...(modelResponse.inputTokens !== undefined
      ? { input_tokens: modelResponse.inputTokens }
      : {}),
    ...(modelResponse.outputTokens !== undefined
      ? { output_tokens: modelResponse.outputTokens }
      : {}),
    raw_response: modelResponse.content,
    parse_error: parseError,
    grading,
  };

  // Save the evaluation result to disk.
  saveEvaluationResult(result);

  return result;
}