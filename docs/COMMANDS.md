# MaritimeBench Commands

## 1. Setup

Install dependencies from the committed lockfile:

```powershell
npm ci
```

Alternatively, use `npm install` when adding or updating dependencies.

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

## 3. Mock Provider

The Mock provider is the default when using `npm run dev`.

Run the complete benchmark suite:

```powershell
npm run dev
```

Explicitly select Mock:

```powershell
npm run dev -- --provider mock
```

Run a specific task:

```powershell
npm run dev -- --provider mock --task MB-01
```

Run the complete suite with multiple trials per task:

```powershell
npm run dev -- --provider mock --suite all --trials 5
```

Specify the Mock model:

```powershell
npm run dev -- --provider mock --model mock-model
```

Mock evaluation validates the benchmark execution pipeline and deterministic grading. It does not measure actual AI model performance.

## 4. AI Model Providers

MaritimeBench supports three AI model providers: OpenAI, Anthropic, and Google Gemini.

**Warning:** All three providers make real API requests and may incur charges. Configure the appropriate API key and model ID in `.env` before running an evaluation.

| Provider | CLI flag | API key | Model |
|---|---|---|---|
| OpenAI | `--provider openai` | `OPENAI_API_KEY` | `OPENAI_MODEL` |
| Anthropic | `--provider anthropic` | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` |
| Google Gemini | `--provider google` | `GOOGLE_API_KEY` | `GOOGLE_MODEL` |

### Run the complete benchmark suite

OpenAI (default provider for `npm run eval`):

```powershell
npm run eval
```

Anthropic:

```powershell
npm run eval -- --provider anthropic
```

Google Gemini:

```powershell
npm run eval -- --provider google
```

### Run a specific benchmark task

OpenAI:

```powershell
npm run eval -- --provider openai --task MB-01
```

Anthropic:

```powershell
npm run eval -- --provider anthropic --task MB-01
```

Google Gemini:

```powershell
npm run eval -- --provider google --task MB-01
```

### Run multiple trials per task

OpenAI:

```powershell
npm run eval -- --provider openai --suite all --trials 5
```

Anthropic:

```powershell
npm run eval -- --provider anthropic --suite all --trials 5
```

Google Gemini:

```powershell
npm run eval -- --provider google --suite all --trials 5
```

### Override the model ID

The `--model` argument overrides the model configured in the provider's environment variable.

OpenAI:

```powershell
npm run eval -- --provider openai --model YOUR_MODEL_ID
```

Anthropic:

```powershell
npm run eval -- --provider anthropic --model YOUR_MODEL_ID
```

Google Gemini:

```powershell
npm run eval -- --provider google --model YOUR_MODEL_ID
```

If neither `--model` nor the corresponding environment variable is supplied, model resolution fails.

## 5. Supported Evaluation Arguments

| Argument | Description | Example |
|---|---|---|
| `--task` | Run one benchmark task | `--task MB-01` |
| `--suite` | Select a benchmark suite; currently supports `all` | `--suite all` |
| `--provider` | Select `mock`, `openai`, `anthropic`, or `google` | `--provider anthropic` |
| `--model` | Specify the provider model ID | `--model YOUR_MODEL_ID` |
| `--trials` | Number of trials per task; defaults to `1` | `--trials 5` |

Use either `--task` or `--suite`, not both.

If neither is supplied, the complete benchmark suite runs by default.

Provider defaults depend on the entry point:

- `npm run dev` defaults to Mock.
- `npm run eval` defaults to OpenAI.

The `--provider` argument overrides the default.

Model selection precedence:

1. Model supplied through `--model`.
2. Model configured in the provider's environment variable.
3. Built-in default, if available.

Currently, only Mock has a built-in default: `mock-model`.

OpenAI, Anthropic, and Google require their respective model environment variables unless a model is supplied through `--model`.

## 6. Run Records and Trial Results

Every evaluation generates a unique run ID.

Run information and evaluation records are stored under:

```text
results/
```

Individual trial records are saved in this directory and associated with their corresponding run ID.

Each successful trial record preserves evaluation evidence, including:

- Task, run, provider, and model identifiers.
- Trial number and execution timestamps.
- Latency and available token usage.
- Complete system and user prompts.
- Raw model response.
- JSON parsing error, if any.
- Grading result and individual evaluation checks.

These records preserve model outputs and grading evidence needed for subsequent analysis, per-run report generation, and aggregate report generation.

API execution failures are recorded separately from successfully completed and graded trials. A failed API request should not automatically be interpreted as a model reasoning failure.

## 7. Per-Run Report Generation

Generate reports from a previously completed evaluation:

```powershell
npm run dev -- --report --run-id RUN_ID
```

Replace `RUN_ID` with the actual ID printed after evaluation.

Per-run reports are saved under:

```text
transcripts/<RUN_ID>/
```

The generated reports include:

- `task-summary.csv` - task-level evaluation metrics.
- `benchmark-summary.json` - benchmark-level evaluation summary.

Report generation uses previously saved trial records. It does not execute new model evaluations or make new provider API requests.

Per-run reports are protected against accidental overwriting. Use a distinct run ID for each evaluation.

## 8. Aggregate Report Generation

Aggregate reports combine compatible completed real-provider evaluation runs into a consolidated benchmark summary.

Aggregation automatically discovers available run records under:

```text
transcripts/
```

No manually maintained source-run configuration is required.

### Aggregate all discovered real-provider runs

```powershell
npm run dev -- --aggregate
```

The command:

1. Discovers available run records.
2. Excludes Mock provider runs.
3. Validates that selected runs are completed and have no failed, pending, running, or unstarted trials.
4. Verifies that saved trial records match the recorded trial counts.
5. Checks provider, model, generation settings, prompts, and trial-count compatibility.
6. Generates aggregate reports and provenance information.

If a discovered real-provider run is incomplete or incompatible, aggregation fails rather than silently including it or treating it as valid evidence.

### Aggregate explicitly selected runs

Use `--runs` to select specific run IDs:

```powershell
npm run dev -- --aggregate --runs run-id-1,run-id-2
```

For example:

```powershell
npm run dev -- --aggregate --runs run-7880f106,run-3b9a370
```

Only the specified runs are considered. Each ID must identify an existing eligible run.

The `--runs` argument accepts comma-separated run IDs. Empty selections, duplicate run IDs, unknown IDs, Mock runs, incomplete runs, and incompatible configurations are rejected.

### Aggregate output

Aggregate reports are saved directly under:

```text
transcripts/
```

The generated files include:

- `benchmark-summary.json` - consolidated benchmark and task-level evaluation statistics.
- `task-summary.csv` - consolidated task-level metrics.
- `source-runs.json` - aggregate provenance, including source run IDs, trial counts, and configuration consistency information.

`source-runs.json` is generated as an output. It is not a manually maintained input file.

Aggregate generation does not execute new model evaluations or make provider API requests.

The aggregate generator prepares the new reports before replacing existing root-level aggregate reports. It also maintains backups and attempts to restore previous reports if installation fails.

Original run records, individual trial records, and per-run reports are preserved. Aggregation does not modify the original trial records.

### Aggregate compatibility

Only compatible evaluation cohorts should be combined.

The aggregate CLI checks:

- Same provider.
- Same exact model ID.
- Same temperature and maximum output-token settings.
- Same system prompt.
- Same user prompt for each task.
- Consistent trial counts across included tasks.

Do not combine different providers, exact models, prompts, or generation settings into one model-level result.

Use explicit `--runs` selection when the results directory contains multiple evaluation cohorts that should remain separate.

## 9. Comparing Providers and Models

For meaningful provider or model comparisons:

1. Run the same benchmark tasks for each provider or model.
2. Use the same number of trials per task.
3. Keep prompts, assumptions, and grading rules unchanged.
4. Record the provider and exact model ID for every run.
5. Compare task scores, pass rates, constraint violations, response validity, latency, and token usage where available.
6. Report API execution failures separately from model reasoning failures.

Keep Mock results separate from real model evaluations. Mock results validate the benchmark pipeline and grader; they are not evidence of actual AI model performance.

Do not combine different exact models into a single model-level score. Clearly identify the provider and model associated with every reported result.

Provider integration support should not be interpreted as evidence that a provider has already been evaluated. Report only evaluation results backed by actual saved trial records.

## 10. Important Evaluation Notes

- Preserve original trial records as evaluation evidence.
- Do not manually alter trial outputs or grading results to improve reported performance.
- Do not interpret missing or unaccessible constraint information as a successful constraint check.
- Distinguish `pass@k` from `pass_all@k` when interpreting repeated-trial performance.
- Treat missing configuration metadata as unrecorded rather than assuming a default value.
- Use the generated aggregate provenance file to document exactly which runs contribute to a consolidated report.
- Keep Mock evaluations and real model evaluations separate.
- Do not interpret API execution failures as model reasoning failures.