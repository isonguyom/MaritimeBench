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

For OpenAI evaluation, configure `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env`.

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

Explicitly select the mock provider:

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

## 4. OpenAI Evaluation

**Warning:** OpenAI evaluation makes API requests and may incur charges. Configure your API credentials and model before running it.

Run the complete benchmark suite:

```powershell
npm run eval
```

Explicitly select the OpenAI provider:

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

The OpenAI model is selected through `OPENAI_MODEL` in `.env`.

## 5. Supported CLI Arguments

| Argument | Description | Example |
|---|---|---|
| `--task` | Run one benchmark task | `--task MB-01` |
| `--suite` | Select a benchmark suite; currently supports `all` | `--suite all` |
| `--provider` | Select `mock` or `openai` | `--provider mock` |
| `--trials` | Number of trials per task; defaults to `1` | `--trials 5` |

Use either `--task` or `--suite`, not both.

If neither is supplied, the complete benchmark suite runs by default.

## 6. Run Manifests and Results

Every evaluation generates a unique run ID.

The run manifest is saved under:

```text
results/manifests/<RUN_ID>.json
```

Use the run ID printed after evaluation to generate reports.

## 7. Report Generation

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

- `summary.csv` — task-level evaluation summary.
- `summary.json` — benchmark-level summary.

Report generation uses previously saved trial records and does not execute new model evaluations.