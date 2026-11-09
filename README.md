# MaritimeBench

## Beyond ETA: Evaluating AI in Operational Voyage Planning

MaritimeBench is a deterministic benchmark for evaluating how large language models reason about operational maritime voyage-planning problems.

It tests whether AI models can calculate physical arrival times while correctly handling weather-related speed restrictions, port receiving windows, waiting periods, hard deadlines, multiple voyage legs, and missing or invalid information.

Unlike a basic ETA calculator, MaritimeBench evaluates whether a model can produce a mathematically correct and operationally feasible voyage outcome when multiple constraints interact.

**Repository:** https://github.com/isonguyom/MaritimeBench

**Video walkthrough:** [MaritimeBench Walkthrough](https://drive.google.com/file/d/10H_2VHe2dgooepeDGwxMrXL-g45_Jcah/view?usp=sharing)

---

## 1. Domain and Expertise

**Domain:** Nautical Science, Maritime engineering, maritime operations, and operational voyage planning.

MaritimeBench was developed using nautical science and maritime engineering knowledge and software engineering practices, with particular attention to:

- Vessel speed and distance calculations.
- Physical estimated time of arrival (ETA).
- Weather-related speed restrictions.
- Port receiving windows and waiting time.
- Hard arrival deadlines.
- Multi-leg voyage calculations.
- Missing and invalid operational information.
- Combined operational constraints.

The benchmark uses controlled synthetic maritime scenarios. It is intended to evaluate AI reasoning in a defined operational context, not to replace professional navigational judgment or real-time voyage-planning systems.

## 2. What It Tests and Why It Matters

MaritimeBench evaluates whether an AI model can move beyond producing a plausible ETA and calculate a voyage outcome that respects all applicable operational constraints.

It measures:

- Numerical accuracy.
- Constraint integration.
- Schedule feasibility.
- Structured response validity.
- Missing and invalid information handling.
- Consistency across repeated trials.

**Central research question:**

Can an AI model produce a mathematically correct and operationally feasible voyage plan when several operational constraints interact?

### Why this matters

An incorrect ETA or an overlooked operational restriction can affect port coordination, vessel scheduling, arrival planning, and downstream operational decisions.

A model that calculates physical arrival correctly but ignores a weather restriction or port receiving window may produce an answer that is mathematically plausible but operationally unsuitable.

MaritimeBench is designed to expose these weaknesses through controlled, reproducible evaluation tasks.

### Intended users

- AI researchers evaluating numerical and constraint-based reasoning.
- Developers building maritime AI applications.
- Maritime technology companies assessing AI-assisted operational workflows.
- Researchers investigating LLM reliability in domain-specific applications.

## 3. Benchmark Tasks

MaritimeBench contains nine synthetic tasks. Each task has a JSON input definition and a separately stored expected reference outcome.

| Task | Scenario | What makes it challenging |
|---|---|---|
| MB-01 | Baseline ETA | Requires accurate distance, speed, duration, and physical arrival calculations. |
| MB-02 | Multi-leg Voyage | Requires sequential calculations across two consecutive legs while preserving the voyage timeline. |
| MB-03 | Weather Speed Restriction | Requires applying a temporary speed restriction only while the vessel is underway and the restriction is active. |
| MB-04 | Port Arrival Within Receiving Window | Requires comparing physical ETA against an inclusive port receiving window. |
| MB-05 | Port Waiting Time | Requires calculating the next permitted arrival and waiting duration without changing physical travel time. |
| MB-06 | Hard Deadline Feasibility | Requires determining whether physical arrival is at or before a specified deadline. |
| MB-07 | Missing Required Information | Requires identifying missing vessel speed and withholding unsupported calculations. |
| MB-08 | Combined Weather and Port Constraints | Requires integrating a weather-related speed reduction with port receiving windows and waiting-time calculations. |
| MB-09 | Multiple Invalid Voyage Inputs | Requires identifying all invalid inputs and their exact field paths before attempting calculations. |

### Task difficulty

The tasks progress from basic calculations to integrated operational reasoning:

- **Foundational calculations:** MB-01, MB-04, MB-06.
- **Operational constraint handling:** MB-02, MB-03, MB-05, MB-07, MB-09.
- **Integrated constraint reasoning:** MB-08.

MB-08 is particularly important because an incorrect physical ETA can propagate into permitted arrival and waiting-time calculations.

## 4. Evaluation Methodology

Each benchmark task has:

1. A structured JSON task definition.
2. A separately stored reference outcome.
3. A system prompt defining operational rules.
4. A task-specific user prompt.
5. A structured response schema.
6. A deterministic grading process.

The evaluation pipeline sends the task to a selected model provider, captures the response, validates its structure, and compares the result against the independently stored reference outcome.

### Operational assumptions

The benchmark applies the following rules consistently:

- All timestamps use UTC and ISO 8601 format.
- Distances are expressed in nautical miles (nm).
- Speeds are expressed in knots (kn).
- Travel duration and waiting time are expressed in hours.
- Weather restrictions apply only while the vessel is underway.
- Weather restrictions are time-based and can span multiple voyage legs.
- When multiple restrictions overlap, the lowest applicable speed is used.
- Port receiving windows recur daily unless otherwise specified.
- Port-window opening and closing times are inclusive.
- Port waiting time is excluded from total travel hours.
- Hard deadlines are assessed using physical ETA, not permitted arrival.
- Arrival exactly at a hard deadline is considered feasible.
- Missing or invalid inputs must be identified rather than invented.
- No unstated currents, traffic delays, or additional operational delays are introduced.

## 5. Grading and Scoring

MaritimeBench uses a deterministic reference-based grader rather than an LLM judge.

Each response is evaluated against predefined checks for the relevant task.

### Scoring formula

Task Score = (Number of Checks Passed / Total Number of Checks) × 100%

Every grader check is marked critical.

A task passes only when all its critical checks pass. The diagnostic percentage and strict task pass/fail status are both reported.

### Tolerances

- Timestamps: 1 minute.
- Duration values: 1 minute, equivalent to \(1/60\) hour.

A response outside the applicable tolerance fails the corresponding check.

### Multi-trial metrics

For repeated evaluations, MaritimeBench calculates:

**pass@k**

The probability of obtaining at least one successful response when selecting \(k\) trials without replacement:

pass@k = 1 − [C(n − c, k) / C(n, k)]

**pass^k**

The probability that all \(k\) selected trials are successful:

passᵏ = C(c, k) / C(n, k)

Where:

- \(n\) = total trials.
- \(c\) = successful trials.
- \(k\) = number of selected trials.
- \(C(a, b)\) = Number of ways to choose b items from a items (combination).

A successful trial requires a valid structured response and a passing task grade.

Metrics are reported for \(k = 1, 2, 3, 5\). They are null when insufficient trials are available.

Benchmark-level metrics are macro-averages of eligible task-level metrics. Reports also record the number of eligible tasks for each value of \(k\).

### Grader validation

The grading implementation is covered by automated tests for:

- Correct and incorrect voyage calculations.
- Invalid response structures and unexpected fields.
- Incorrect task identifiers and task/reference mismatches.
- Timestamp and duration tolerances.
- Weather restrictions.
- Port receiving windows and waiting time.
- Hard deadline feasibility.
- Multi-leg calculations.
- Combined weather and port constraints.
- Missing and invalid inputs.
- Incorrect input field paths.
- Prevention of unsupported calculations.

Reference-validation tests compare the calculation engine with stored outcomes for MB-01 through MB-08. MB-09 grading behaviour is covered by dedicated grader tests.

This validates implementation consistency and expected behaviour. It does not establish that every benchmark assumption represents every real-world maritime operation.

## 6. Models and Evaluation Results

### Evaluation status

As of 9 November 2026, the benchmark pipeline has been validated using the Mock provider, and a successful external LLM evaluation has been completed using OpenAI.

| Provider | Configured model | Evaluation status |
|---|---|---|
| Mock | mock-model | Historical pipeline validation completed |
| OpenAI | gpt-6.1-sol | Successful evaluation completed: 36 trials across two runs; all trials passed |
| Anthropic | claude-sonnet-5-5 | Model-list check passed; generation blocked by insufficient API credits |
| Google | gemini-3.8-flash | Model metadata check passed; generation smoke test returned a server-side timeout |

The successful OpenAI evaluation represents completed AI model benchmarking, while the Mock evaluation serves only to validate the benchmark pipeline, deterministic grading, and reporting functionality.


### OpenAI evaluation

**Provider:** OpenAI  
**Model:** `gpt-6.1-sol`  
**Evaluation cohort:** Earlier nine-task benchmark cohort.

Two successful evaluation runs were completed using the same provider and model configuration.

| Run ID | Tasks | Trials | Outcome |
|---|---:|---:|---|
| `run-7880f106` | 9 | 9 | All trials passed |
| `run-3b9a370` | 9 | 27 | All trials passed |
| **Combined** | **9** | **36** | **36/36 trials passed** |

**Combined evaluation results**

| Metric | Result |
|---|---:|
| Completed trials | 36/36 |
| Failed trials | 0 |
| Trial pass rate | 100% |

All 36 OpenAI evaluation trials passed the benchmark's task-level grading requirements.

These results provide the first successful external LLM performance evidence for MaritimeBench. They demonstrate that the evaluated model completed the earlier nine-task cohort successfully under the recorded benchmark configuration.

The results must be interpreted within the scope of that cohort. They do not establish performance on additional tasks or scenarios that were not included in those runs.

**Anthropic**

The configured model was found through the model-list endpoint. A generation smoke test returned HTTP 400 with an explicit insufficient-credit error.

No successful benchmark trials were completed.

**Google Gemini**

The configured model was found through the model metadata endpoint, and network connectivity was established. A generation smoke test returned HTTP 504 (`DEADLINE_EXCEEDED`).

This is an execution failure, not evidence of model reasoning failure.

### Interpretation

The completed OpenAI evaluation provides 36 successful trials across the earlier nine-task benchmark cohort. The Mock results separately establish historical pipeline-validation evidence.

Anthropic and Google have not yet produced successful benchmark evaluation results.

The OpenAI results should not be generalized beyond the evaluated task cohort. Further evaluations across providers, models, and expanded task scenarios are needed for broader comparative conclusions.

## 7. Failure Analysis

### Observed failures

There are currently no completed external LLM trials from which to derive genuine model reasoning failures.

The observed provider failures were:

- OpenAI: insufficient API credits.
- Anthropic: insufficient API credits.
- Google: generation request deadline exceeded.

These are provider execution or account-availability issues, not benchmark reasoning failures.

The Mock evaluation completed without failures and cannot establish how an LLM responds to difficult or conflicting voyage-planning scenarios.

### Failure categories the benchmark is designed to detect

1. Incorrect travel duration or physical ETA.
2. Failure to apply weather-related speed restrictions.
3. Incorrect port arrival or waiting-time calculations.
4. Incorrect deadline feasibility assessments.
5. Failure to propagate restrictions across multiple voyage legs.
6. Failure to identify missing required information.
7. Failure to identify all invalid inputs.
8. Invented calculations when required information is unavailable.
9. Invalid or incomplete structured responses.

Actual model failure examples and model-specific analysis will be reported after successful external evaluations.

## 8. Transcripts and Evaluation Evidence

Each successfully completed trial record stores:

- Task ID and run ID.
- Trial number.
- Provider and model.
- Start and completion timestamps.
- Latency and available token usage.
- Raw model response.
- JSON parsing error, if any.
- Grading score and individual checks.
- Complete system prompt.
- Task-specific user prompt.

### Evaluation storage

Evaluation trial records are stored in the `results/` directory. Individual run reports are stored under `transcripts/<RUN_ID>/`.

### Aggregate report

MaritimeBench generates aggregate reports from compatible completed external-provider evaluation runs. The aggregate outputs are stored in the `transcripts/` directory:

- `benchmark-summary.json` — Overall benchmark results and aggregate metrics.
- `task-summary.csv` — Consolidated task-level evaluation results.
- `source-runs.json` — Identifies the source runs included in the aggregate.

These records and reports provide traceability from individual model responses and grading decisions to the consolidated evaluation results.


## 9. Setup and Dependencies

### Requirements

Verified development environment:

| Dependency | Installed version |
|---|---|
| Node.js | 25.9.0 |
| npm | 11.16.0 |
| TypeScript | 7.0.2 |
| OpenAI SDK | 7.47.0 |
| Anthropic SDK | 1.6.0 |
| Google GenAI SDK | 3.0.0 |
| Zod | 4.6.7 |
| Vitest | 4.1.12 |
| tsx | 4.23.15 |
| Prettier | 3.9.10 |
| dotenv | 18.0.9 |
| @types/node | 26.6.6 |

The package lockfile uses lockfile version 3. Dependency version ranges are defined in `package.json`, with exact resolutions recorded in `package-lock.json`.

### Clone and install

```bash
git clone https://github.com/isonguyom/MaritimeBench.git
cd MaritimeBench
npm ci
```

### Environment configuration

Create the local environment file:

```powershell
Copy-Item .env.example .env
```

Configure the providers you intend to evaluate:

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

Mock evaluation does not require API credentials.

Keep `.env` private. Never commit API keys or other secrets.

## 10. Running the Benchmark

### Mock evaluation

Run the complete benchmark suite:

```bash
npm run dev
```

Run all tasks with five trials per task:

```bash
npm run dev -- --suite all --trials 5
```

Run one task:

```bash
npm run dev -- --task MB-01
```

### OpenAI evaluation

```bash
npm run eval -- --provider openai --suite all --trials 5
```

Run a specific task:

```bash
npm run eval -- --provider openai --task MB-01
```

### Anthropic evaluation

```bash
npm run eval -- --provider anthropic --suite all --trials 5
```

### Google Gemini evaluation

```bash
npm run eval -- --provider google --suite all --trials 5
```

External provider evaluations make real API requests and may incur charges. Ensure that the configured account has sufficient credits.

### Model selection

The model supplied through `--model` takes precedence over the provider's environment variable.

For example:

```bash
npm run eval -- --provider openai --model YOUR_MODEL_ID
```

Otherwise, the provider-specific model variable is required:

- `OPENAI_MODEL`
- `ANTHROPIC_MODEL`
- `GOOGLE_MODEL`

The Mock provider has the built-in model identifier `mock-model`.

### Report generation

Generate reports for a completed evaluation:

```bash
npm run dev -- --report --run-id RUN_ID
```

Reports are saved under:

```text
results/reports/RUN_ID/
```

Generated reports:

- `task-summary.csv`
- `benchmark-summary.json`

Run manifests are saved under `results/manifests/`, while individual trial records are saved directly under `results/`.

Report generation uses saved trial records and does not execute new model evaluations.

### Aggregate report generation

Generate an aggregate report from compatible completed external-provider evaluation runs:

```bash
npm run dev -- --aggregate
```

To aggregate specific runs:

```bash
npm run dev -- --aggregate --runs run-id-1,run-id-2
```

The aggregation process validates run completeness and configuration compatibility before combining results. Mock-provider runs are excluded.

Aggregate reports are saved in the `transcripts/` directory:

- `benchmark-summary.json` — Overall aggregate benchmark results and metrics.
- `task-summary.csv` — Consolidated task-level results.
- `source-runs.json` — Provenance information identifying the source runs included in the aggregate.

Aggregation uses existing evaluation records and does not execute new model evaluations.

### Quality checks

Run formatting, TypeScript checking and the complete test suite:

```bash
npm run quality
```

Individual checks:

```bash
npm run format:check
npm run typecheck
npm test
```
### CLI options

| Option | Description |
|---|---|
| `--provider` | Selects `mock`, `openai`, `anthropic`, or `google`. |
| `--model` | Selects the model identifier supported by the provider. |
| `--task` | Runs a specific task, such as `MB-01`. |
| `--suite all` | Runs the complete available task suite. |
| `--trials` | Sets the number of trials per task. |
| `--aggregate` | Aggregates compatible completed external-provider runs. |
| `--runs` | Restricts aggregation to specified run IDs. |

`--task` and `--suite` are mutually exclusive.


## 11. Data Provenance and Prior Work

### Benchmark data

All nine voyage-planning task scenarios and their corresponding reference outcomes were developed specifically for MaritimeBench during the hackathon.

The benchmark uses synthetic voyage-planning scenarios. It does not use an external operational voyage dataset as its task or reference source.

Task definitions and expected outcomes are maintained separately:

```text
data/
├── tasks/
│   ├── MB-01.json
│   ├── MB-02.json
│   ├── ...
│   └── MB-09.json
└── references/
    ├── MB-01.json
    ├── MB-02.json
    ├── ...
    └── MB-09.json
```

The reference outcomes provide the expected results for deterministic grading.

### Pre-existing work and hackathon-created work

MaritimeBench was developed as a dedicated benchmark project for the micro1 Eval Hackathon.

The task scenarios, reference outcomes, evaluation prompts, grading logic, provider integrations, runner, and reporting implementation were developed for this project.

The developer's prior maritime engineering knowledge and software engineering experience informed the benchmark design.

No pre-existing external benchmark dataset is claimed as original MaritimeBench data.

### External packages and licences

Third-party dependencies and their licences are governed by their respective authors and maintainers. The dependency list and resolved versions are recorded in `package.json` and `package-lock.json`.

No project-level `LICENSE` file is currently present in the repository. The project should not be assumed to be released under MIT or another open-source licence.

## 12. Architecture

MaritimeBench uses a provider-independent architecture that separates benchmark data, model integrations, evaluation execution, deterministic grading, result storage, and report generation.

```text
MaritimeBench/
├── data/
│   ├── tasks/              # Nine benchmark task definitions
│   └── references/         # Validated reference outcomes
├── src/
│   ├── adapters/           # AI provider and Mock integrations
│   ├── graders/            # Deterministic response grading
│   ├── runner/             # Evaluation execution and reporting workflows
│   ├── schemas/            # Data and response validation schemas
│   ├── tasks/              # Task loading and handling
│   ├── utils/              # Shared utilities
│   ├── cli.ts              # CLI argument handling and commands
│   ├── index.ts             # Main application entry point
│   └── eval.ts              # External model evaluation entry point
├── tests/                   # Automated tests
├── docs/                    # Project documentation
├── results/
│   ├── manifests/           # Evaluation run manifests
│   └──                      # Individual trial records
├── transcripts/
│   ├── <RUN_ID>/            # Individual run reports
│   ├── benchmark-summary.json
│   ├── task-summary.csv
│   └── source-runs.json      # Aggregate report provenance
├── .env.example
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

### Main components

- **Benchmark data:** Defines the voyage-planning tasks and their reference outcomes.
- **Provider adapters:** Integrate Mock, OpenAI, Anthropic, and Google Gemini.
- **Evaluation runner:** Executes benchmark tasks and records model responses.
- **Deterministic grader:** Evaluates responses against predefined reference outcomes.
- **Result storage:** Preserves trial records and run manifests.
- **Reporting and aggregation:** Generates individual evaluation reports and consolidated reports across compatible runs.
- **CLI:** Provides commands for evaluation, report generation, and aggregation.


## 13. Limitations and Future Work

MaritimeBench is a controlled benchmark and does not represent the full complexity of operational maritime decision-making.

Current limitations include:

- Synthetic scenarios cannot capture every real-world voyage condition.
- Results depend on the task definitions, prompts, and grading rules used.
- API availability, rate limits, and provider errors can affect execution.
- The historical successful OpenAI results do not establish performance across every available provider.
- Additional model evaluations are needed to build a broader comparative evidence base.
- Genuine model failure transcripts and measured cost/runtime data remain important evidence gaps.

Future work includes:

- Expanding the benchmark task suite.
- Running reproducible evaluations across multiple model providers.
- Increasing repeated trials for statistical comparison.
- Publishing representative successful and failed transcripts.
- Measuring API costs and execution time.
- Improving failure analysis and cross-model comparison.

## 14. Project Status

MaritimeBench has an implemented nine-task benchmark suite, provider-independent evaluation tooling, deterministic grading, trial storage, and report aggregation.

Historical OpenAI evaluation evidence includes 36 successful trials across a nine-task cohort.

The benchmark remains under active development, with further provider evaluations, failure analysis, and documentation improvements required before making broader claims about model performance in operational voyage planning.


- **Project:** MaritimeBench
- **Research title:** Beyond ETA: Evaluating AI in Operational Voyage Planning
- **Hackathon:** micro1 Eval Hackathon
- **Repository:** https://github.com/isonguyom/MaritimeBench
- **Video walkthrough:** [MaritimeBench Walkthrough](https://drive.google.com/file/d/10H_2VHe2dgooepeDGwxMrXL-g45_Jcah/view?usp=sharing)
- **Project licence:** Not yet specified