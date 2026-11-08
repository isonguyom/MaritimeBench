# MaritimeBench Commands

## 1. Setup

Install dependencies:

```powershell
npm install
```

Create your environment file:

```powershell
Copy-Item .env.example .env
```

Configure the credentials and model IDs for the providers you intend to use:

```env
# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=

# Anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

# Google Gemini
GOOGLE_API_KEY=
GOOGLE_MODEL=
```

The Mock provider does not require API credentials.

Never commit your `.env` file or expose API keys.

## 2. Quality Checks

Run formatting, TypeScript type checking, and the complete test suite:

```powershell
npm run quality
```

Run individual checks:

```powershell
npm run format:check
npm run typecheck
npm test
```

Format source and test files:

```powershell
npm run format
```

## 3. Mock Evaluation

Mock evaluation is the default provider when using `npm run dev`.

Run the complete benchmark suite:

```powershell
npm run dev
```

Run a specific task:

```powershell
npm run dev -- --task MB-01
```

Explicitly select the Mock provider:

```powershell
npm run dev -- --provider mock
```

Run the complete suite with multiple trials per task:

```powershell
npm run dev -- --suite all --trials 5
```

Run a specific task with multiple trials:

```powershell
npm run dev -- --task MB-01 --trials 5
```

Mock evaluation validates the benchmark execution pipeline and deterministic grading. It does not measure actual AI model performance.

## 4. OpenAI Evaluation

**Warning:** OpenAI evaluation makes real API requests and may incur charges. Configure `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env` before running it.

Run the complete benchmark suite:

```powershell
npm run eval
```

`npm run eval` uses OpenAI by default. It does not automatically run all supported providers.

Explicitly select OpenAI through the development command:

```powershell
npm run dev -- --provider openai
```

Run a specific task:

```powershell
npm run eval -- --task MB-01
```

Run the complete suite with multiple trials per task:

```powershell
npm run eval -- --suite all --trials 5
```

Run a specific task with multiple trials:

```powershell
npm run eval -- --task MB-01 --trials 5
```

Specify a model directly:

```powershell
npm run eval -- --provider openai --model YOUR_MODEL_ID
```

The model is selected through `--model` when supplied; otherwise, `OPENAI_MODEL` is used.

## 5. Anthropic Evaluation

**Warning:** Anthropic evaluation makes real API requests and may incur charges. Configure `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` in `.env` before running it.

Run the complete benchmark suite:

```powershell
npm run eval -- --provider anthropic
```

Run a specific task:

```powershell
npm run eval -- --provider anthropic --task MB-01
```

Run the complete suite with multiple trials:

```powershell
npm run eval -- --provider anthropic --suite all --trials 5
```

Specify a model directly:

```powershell
npm run eval -- --provider anthropic --model YOUR_MODEL_ID
```

The model is selected through `--model` when supplied; otherwise, `ANTHROPIC_MODEL` is used.

## 6. Google Gemini Evaluation

**Warning:** Google evaluation makes real API requests and may incur charges. Configure `GOOGLE_API_KEY` and `GOOGLE_MODEL` in `.env` before running it.

Run the complete benchmark suite:

```powershell
npm run eval -- --provider google
```

Run a specific task:

```powershell
npm run eval -- --provider google --task MB-01
```

Run the complete suite with multiple trials:

```powershell
npm run eval -- --provider google --suite all --trials 5
```

Specify a model directly:

```powershell
npm run eval -- --provider google --model YOUR_MODEL_ID
```

The model is selected through `--model` when supplied; otherwise, `GOOGLE_MODEL` is used.

## 7. Supported CLI Arguments

| Argument | Description | Example |
|---|---|---|
| `--task` | Run one benchmark task | `--task MB-01` |
| `--suite` | Select a benchmark suite; currently supports `all` | `--suite all` |
| `--provider` | Select `mock`, `openai`, `anthropic`, or `google` | `--provider anthropic` |
| `--model` | Specify the model ID | `--model YOUR_MODEL_ID` |
| `--trials` | Number of trials per task; defaults to `1` | `--trials 5` |

Use either `--task` or `--suite`, not both.

If neither is supplied, the complete benchmark suite runs by default.

Provider defaults depend on the command:

- `npm run dev` defaults to Mock.
- `npm run eval` defaults to OpenAI.

The `--provider` argument overrides the default.

Model selection precedence:

1. Model supplied through `--model`.
2. Model configured in the provider's environment variable.
3. Provider default, if configured.

## 8. Run Manifests and Results

Every evaluation generates a unique run ID.

The run manifest is saved under:

```text
results/manifests/<RUN_ID>.json
```

Trial-level result files are also saved under `results/`.

Use the run ID printed after evaluation to generate reports or compare runs.

## 9. Report Generation

Generate reports for a completed evaluation:

```powershell
npm run dev -- --report --run-id RUN_ID
```

Replace `RUN_ID` with the actual ID printed after evaluation.

Reports are saved under:

```text
results/reports/<RUN_ID>/
```

The generated reports include:

- `task-summary.csv` — task-level evaluation summary.
- `benchmark-summary.json` — benchmark-level summary.

Report generation uses previously saved trial records and does not execute new model evaluations.

## 10. Comparing Providers

For meaningful provider comparisons:

1. Run the same benchmark tasks for each provider.
2. Use the same number of trials per task.
3. Keep prompts, assumptions, and grading rules unchanged.
4. Record the provider and model ID for every run.
5. Compare task scores, pass rates, constraint violations, response validity, latency, and token usage where available.

Keep Mock results separate from real model evaluations.

A failed API request caused by missing credentials, rate limits, or insufficient account credits is an execution failure, not automatically a model reasoning failure.