# MaritimeBench

### Beyond ETA: Evaluating AI in Operational Voyage Planning

MaritimeBench is an AI evaluation benchmark designed to assess how effectively language models reason through operational voyage-planning scenarios involving vessel performance, weather-related speed restrictions, port receiving windows, deadlines, and incomplete or invalid voyage information.

Rather than evaluating models solely on their ability to calculate estimated time of arrival (ETA), MaritimeBench examines whether they can produce numerically accurate, operationally feasible, and constraint-compliant voyage plans.

The benchmark uses controlled synthetic scenarios, structured model responses, independently defined reference outcomes, and deterministic grading to measure model performance.

## Research Objective

The primary objective is to investigate how reliably AI models handle operational voyage-planning constraints, particularly when multiple constraints must be considered together.

The benchmark focuses on the following questions:

- Can a model calculate accurate voyage durations and arrival times?
- Can it correctly apply weather-related speed restrictions?
- Can it account for port receiving windows and waiting time?
- Can it determine whether a voyage can meet a hard arrival deadline?
- Can it identify missing, invalid, or conflicting voyage information?
- Can it integrate multiple operational constraints without producing an infeasible schedule?
- How consistent are its results across repeated attempts?

The central research interest is whether models that handle individual constraints correctly can also reason reliably when those constraints interact.

## Benchmark Scope

MaritimeBench currently contains **nine implemented benchmark tasks**, identified as MB-01 through MB-09.

| Task ID | Task Name | Evaluation Focus |
|---|---|---|
| MB-01 | Baseline ETA | Basic voyage duration and arrival calculation |
| MB-02 | Multi-leg Voyage | Sequential voyage calculations across multiple legs |
| MB-03 | Weather Speed Restriction | Applying reduced vessel speed during restricted periods |
| MB-04 | Port Arrival Within Receiving Window | Determining whether arrival falls within an acceptable receiving window |
| MB-05 | Port Waiting Time | Calculating waiting time when a vessel arrives outside a receiving window |
| MB-06 | Hard Deadline Feasibility | Determining whether a voyage can meet a specified deadline |
| MB-07 | Missing Required Information | Identifying missing information required for reliable planning |
| MB-08 | Combined Weather and Port Constraints | Integrating weather restrictions and port receiving windows |
| MB-09 | Multiple Invalid Voyage Inputs | Identifying multiple invalid voyage inputs |

The scenarios are synthetic and designed to provide controlled evaluation conditions. They are not intended to represent every operational condition encountered in real-world maritime navigation.

## Evaluation Methodology

Each benchmark task consists of:

1. A structured task definition containing voyage inputs and operational constraints.
2. A reference response defining the expected outcome.
3. A model prompt requesting a structured JSON response.
4. A response schema for validating model output.
5. A deterministic grader for comparing model responses against expected results.

The evaluation pipeline separates response validity from benchmark correctness.

A response must first satisfy the expected structure. It is then evaluated against the applicable reference values and operational constraints.

### Evaluation Dimensions

**1. Numerical Accuracy**

Evaluates the correctness of voyage duration, arrival time, and waiting time.

**2. Constraint Compliance**

Evaluates whether the model correctly applies weather-related speed restrictions and port receiving windows.

**3. Schedule Feasibility**

Evaluates whether the proposed schedule satisfies specified arrival deadlines and operational timing requirements.

**4. Information Handling**

Evaluates whether the model identifies missing, invalid, or conflicting voyage information rather than silently inventing or correcting inputs.

**5. Response Validity**

Evaluates whether the model produces output that conforms to the required structured response format.

### Operational Assumptions

The benchmark uses the following assumptions:

- All timestamps use UTC and ISO 8601 format.
- Distances are expressed in nautical miles (nm).
- Vessel speeds are expressed in knots (kn).
- Weather-related speed restrictions apply only while the vessel is underway.
- Port receiving windows are evaluated using the benchmark's defined daily-window rules.
- Receiving-window boundaries are inclusive in the current benchmark specification.
- A hard deadline is feasible only when physical arrival is at or before the specified deadline.
- Missing or invalid information must be identified rather than silently assumed or corrected.
- Additional delays, currents, traffic, and other operational factors are not introduced unless explicitly specified in a task.

## Multi-Trial Evaluation Metrics

MaritimeBench supports repeated model evaluations through the `--trials` CLI argument.

A single evaluation attempt provides only one observation of model performance. Repeated trials allow the benchmark to examine both the likelihood of obtaining a successful response and the consistency of model performance.

Two statistical metrics are reported.

### 1. pass@k — At Least One Successful Attempt

`pass@k` estimates the probability of obtaining at least one successful result when selecting k attempts from the observed trials.

\[
pass@k = 1 - \frac{\binom{n-c}{k}}{\binom{n}{k}}
\]

### 2. pass^k — All Attempts Successful

`pass^k` estimates the probability that all k selected attempts are successful.

\[
pass^k = \frac{\binom{c}{k}}{\binom{n}{k}}
\]

Where:

- `n` represents the total number of observed trials.
- `c` represents the number of successful trials.
- `k` represents the number of attempts considered.
- A successful trial must have both a valid response and a passing task grade.

Both metrics use finite-sample combinatorial estimators based on selecting attempts without replacement from the observed trials.

### Supported k Values

The benchmark calculates both metrics for:

- `k = 1`
- `k = 2`
- `k = 3`
- `k = 5`

At `k = 1`, both metrics equal the task pass rate.

All metric values are expressed as percentages between 0 and 100.

### Insufficient Trials

When fewer than k trials are available, the corresponding metric is reported as `null`.

For example, at least five observed trials are required to calculate `pass@5` and `pass^5`.

This prevents the benchmark from presenting estimates where the required number of observations is unavailable.

### Benchmark-Level Aggregation

Task-level metrics are calculated independently for each evaluation group.

Benchmark-level metrics are calculated as macro-averages of eligible task-level metrics. Each eligible task contributes equally, regardless of its number of trials.

The benchmark also reports the number of eligible tasks for each k value, making the coverage of each aggregate metric transparent.

### Report Metric Fields

Task-level JSON summaries include:

- `pass_at_k`
- `pass_all_k` — the implementation field representing pass^k.

Benchmark-level JSON summaries include:

- `macro_average_pass_at_k`
- `macro_average_pass_all_k`
- `pass_at_k_eligible_tasks`
- `pass_all_k_eligible_tasks`

The CSV report provides flattened task-level columns:

- `pass_at_1`
- `pass_at_2`
- `pass_at_3`
- `pass_at_5`
- `pass_all_1`
- `pass_all_2`
- `pass_all_3`
- `pass_all_5`

## System Architecture

MaritimeBench uses a modular TypeScript architecture that separates model-provider integration, task execution, response validation, deterministic grading, result aggregation, and report generation.

```text
MaritimeBench/
├── data/
│   ├── tasks/
│   │   ├── MB-01.json
│   │   ├── MB-02.json
│   │   ├── ...
│   │   └── MB-09.json
│   └── references/
├── docs/
│   └── COMMANDS.md
├── src/
│   ├── adapters/
│   │   ├── mock.adapter.ts
│   │   ├── mock.responses.ts
│   │   ├── model.adapter.ts
│   │   └── openai.adapter.ts
│   ├── graders/
│   │   └── voyage.grader.ts
│   ├── runner/
│   │   ├── cli.args.ts
│   │   ├── data.loader.ts
│   │   ├── evaluation.runner.ts
│   │   ├── multi-trial.runner.ts
│   │   ├── prompt.builder.ts
│   │   ├── report.generator.ts
│   │   ├── result.aggregator.ts
│   │   ├── result.storage.ts
│   │   ├── run-manifest.storage.ts
│   │   ├── suite.loader.ts
│   │   ├── suite.runner.ts
│   │   └── trial-error.classifier.ts
│   ├── schemas/
│   │   ├── common.schema.ts
│   │   ├── response.schema.ts
│   │   └── task.schema.ts
│   ├── tasks/
│   │   └── voyage.engine.ts
│   ├── utils/
│   │   ├── check-openai.ts
│   │   ├── deadline.utils.ts
│   │   ├── port.utils.ts
│   │   ├── run-id.utils.ts
│   │   ├── time.utils.ts
│   │   └── weather.utils.ts
│   ├── cli.ts
│   ├── eval.ts
│   └── index.ts
├── tests/
├── results/
│   ├── manifests/
│   └── reports/
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Architecture Components

| Component | Responsibility |
|---|---|
| Adapters | Provide a common interface for model providers |
| Schemas | Validate task definitions and model responses |
| Voyage Engine | Handle deterministic voyage calculations |
| Graders | Compare model outputs against reference outcomes |
| Evaluation Runner | Execute individual model evaluations |
| Multi-Trial Runner | Execute repeated attempts for benchmark tasks |
| Suite Runner | Coordinate execution across benchmark tasks |
| Result Aggregator | Calculate task-level and benchmark-level metrics |
| Result Storage | Persist evaluation trial records |
| Run Manifest Storage | Record evaluation run metadata |
| Report Generator | Generate CSV and JSON evaluation reports |
| Utilities | Handle time, weather, port, deadline, and run-ID operations |

## Technology Stack

| Technology | Purpose |
|---|---|
| TypeScript | Core implementation |
| Node.js | Runtime environment |
| Zod | Schema validation |
| OpenAI API | External AI model evaluation |
| Vitest | Automated testing |
| Prettier | Code formatting |

## Installation and Setup

Clone the repository:

```bash
git clone https://github.com/isonguyom/MaritimeBench.git
cd MaritimeBench
```

Install dependencies:

```bash
npm install
```

Create your environment file:

```powershell
Copy-Item .env.example .env
```

For OpenAI evaluation, configure the following variables in `.env`:

```env
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=your_model_name
```

The mock provider does not require OpenAI credentials.

## Running Evaluations

MaritimeBench supports mock and OpenAI evaluation providers.

### Mock Evaluation

Mock evaluation is the default provider when using `npm run dev`.

Run the complete benchmark suite:

```bash
npm run dev
```

Run a specific task:

```bash
npm run dev -- --task MB-01
```

Explicitly select the mock provider:

```bash
npm run dev -- --provider mock
```

Run the complete suite with five trials per task:

```bash
npm run dev -- --suite all --trials 5
```

Run a specific task with multiple trials:

```bash
npm run dev -- --task MB-01 --trials 5
```

### OpenAI Evaluation

**Important:** OpenAI evaluation makes external API requests and may incur charges.

Run the complete benchmark suite:

```bash
npm run eval
```

Explicitly select the OpenAI provider:

```bash
npm run dev -- --provider openai
```

Run a specific task:

```bash
npm run eval -- --task MB-01
```

Run the complete suite with five trials per task:

```bash
npm run eval -- --suite all --trials 5
```

Run a specific task with multiple trials:

```bash
npm run eval -- --task MB-01 --trials 5
```

The model used for OpenAI evaluation is configured through `OPENAI_MODEL`.

## CLI Arguments

| Argument | Description | Example |
|---|---|---|
| `--task` | Run one benchmark task | `--task MB-01` |
| `--suite` | Select a benchmark suite | `--suite all` |
| `--provider` | Select `mock` or `openai` | `--provider mock` |
| `--trials` | Number of trials per task; defaults to 1 | `--trials 5` |
| `--report` | Generate reports from an existing evaluation run | `--report` |
| `--run-id` | Specify the evaluation run to report | `--run-id RUN_ID` |

Use either `--task` or `--suite`, not both.

If neither is supplied, the complete benchmark suite runs by default.

For additional usage instructions, see [docs/COMMANDS.md](docs/COMMANDS.md).

## Run Manifests and Result Storage

Every evaluation generates a unique run ID.

Run manifests are saved under:

```text
results/manifests/<RUN_ID>.json
```

The manifest provides metadata associated with an evaluation run.

Trial records are persisted for subsequent aggregation and report generation.

Keeping evaluation runs identifiable allows results from different models and configurations to be examined independently.

## Report Generation

Generate reports for a completed evaluation:

```bash
npm run dev -- --report --run-id RUN_ID
```

Replace `RUN_ID` with the actual evaluation run ID.

Reports are saved under:

```text
results/reports/<RUN_ID>/
```

Two report formats are generated:

| Report | Description |
|---|---|
| `summary.csv` | Task-level evaluation summary, including flattened multi-trial metrics |
| `summary.json` | Benchmark-level aggregation, task summaries, macro-averages, and eligible task counts |

Report generation uses previously saved trial records. It does not execute new model evaluations or make additional model-provider requests.

## Quality Assurance and Validation

The project includes automated tests covering its evaluation components, including:

- Voyage calculations and operational constraints.
- Task and response schema validation.
- Deterministic grading.
- Model-provider integration.
- Individual and multi-trial evaluation execution.
- Result aggregation and statistical metrics.
- CSV and JSON report generation.
- Run manifests and result persistence.
- CLI argument handling and error classification.

Run the complete quality checks:

```bash
npm run quality
```

Run individual checks:

```bash
npm run format:check
npm run typecheck
npm test
```

Format source and test files:

```bash
npm run format
```

**Latest confirmed test status:** 401 tests across 26 test files passed. TypeScript type checking also passed. These results reflect the latest confirmed runs; the complete quality command should be rerun before final submission.

### Interpreting Mock Results

The mock provider is intended to validate the evaluation pipeline and expected benchmark behaviour.

Successful mock evaluations demonstrate that task loading, execution, response validation, grading, aggregation, and reporting work as expected.

**Mock results must not be interpreted as evidence of actual AI model performance.**

Real model performance findings require evaluations using an external model provider and analysis of the resulting trial records.

## Research Limitations

MaritimeBench has several important limitations:

- Benchmark tasks use synthetic voyage scenarios rather than live operational vessel data.
- The benchmark covers a defined set of nine scenarios and does not represent every maritime operational condition.
- Deterministic grading evaluates responses against predefined reference outcomes and assumptions.
- Results may vary depending on model version, configuration, prompting, and sampling behaviour.
- Multi-trial metrics describe performance across observed attempts and should not be interpreted as guarantees of future model behaviour.
- The benchmark is an evaluation tool, not a replacement for professional maritime judgment, navigation systems, or operational decision-making.

## Research Direction

MaritimeBench aims to contribute to the evaluation of AI systems in maritime operations by moving beyond isolated ETA calculations toward constraint-aware voyage planning.

Its emphasis is on numerical correctness, operational feasibility, constraint integration, information handling, and consistency across repeated attempts.

The benchmark provides a foundation for comparing model behaviour under controlled maritime planning conditions and identifying areas where AI-assisted operational reasoning requires improvement.

## License

License information will be added when the project's distribution and reuse terms are finalized.

---

**Repository:** [github.com/isonguyom/MaritimeBench](https://github.com/isonguyom/MaritimeBench)