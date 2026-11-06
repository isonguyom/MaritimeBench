# MaritimeBench

### Beyond ETA: Evaluating AI in Operational Voyage Planning

MaritimeBench is a benchmark for evaluating how effectively AI models reason about operational voyage-planning constraints.

Rather than evaluating ETA calculations alone, MaritimeBench examines whether models can produce feasible, constraint-aware voyage plans while accounting for weather-related speed restrictions, port receiving windows, arrival deadlines, multiple voyage legs, and incomplete or invalid information.

The benchmark uses synthetic, controlled scenarios with independently verified reference outcomes. It is designed to evaluate model reasoning and operational constraint handling, not to replace professional maritime judgment or real-time voyage-planning systems.

## Objectives

MaritimeBench evaluates whether an AI model can:

- Calculate voyage duration and physical arrival times accurately.
- Account for temporary weather-related speed restrictions.
- Determine permitted port arrival times and required waiting periods.
- Evaluate hard arrival deadlines.
- Propagate calculations across multiple voyage legs.
- Identify missing information without inventing values.
- Detect invalid inputs before performing calculations.
- Integrate multiple operational constraints into a feasible plan.

## Benchmark Scenarios

The current benchmark contains nine evaluation tasks.

| ID    | Scenario                              | Evaluation Focus                             |
| ----- | ------------------------------------- | -------------------------------------------- |
| MB-01 | Baseline ETA                          | Single-leg voyage calculation                |
| MB-02 | Multi-leg Voyage                      | Consecutive voyage-leg calculations          |
| MB-03 | Weather Speed Restriction             | Speed changes during a temporary restriction |
| MB-04 | Port Arrival Within Receiving Window  | Arrival within a permitted receiving window  |
| MB-05 | Port Waiting Time                     | Waiting after a port receiving window closes |
| MB-06 | Hard Deadline Feasibility             | Arrival deadline compliance                  |
| MB-07 | Missing Required Information          | Missing vessel speed and clarification       |
| MB-08 | Combined Weather and Port Constraints | Integration of weather and port constraints  |
| MB-09 | Multiple Invalid Voyage Inputs        | Detection of multiple invalid inputs         |

## Evaluation Methodology

Each benchmark task has:

1. A structured task definition containing voyage inputs and operational constraints.
2. A corresponding reference response containing the expected outcome.
3. A model prompt requesting a structured JSON response.
4. A response schema for validating model output.
5. A deterministic grader for checking the response against the reference.

The evaluation process separates response validity from benchmark correctness. A response must satisfy the expected structure and then pass the applicable grading checks.

### Evaluation Dimensions

- **Numerical Accuracy:** Correct voyage duration, arrival time, and waiting time.
- **Constraint Compliance:** Correct handling of weather restrictions and port receiving windows.
- **Schedule Feasibility:** Correct assessment of arrival deadlines.
- **Information Handling:** Appropriate identification of missing and invalid inputs.
- **Response Validity:** Compliance with the required structured response format.

### Operational Assumptions

- All timestamps use UTC and ISO 8601 format.
- Distances are expressed in nautical miles (nm).
- Vessel speeds are expressed in knots (kn).
- Weather-related speed restrictions apply only while the vessel is underway.
- Port receiving windows are evaluated using the benchmark's defined daily-window rules.
- Receiving-window boundaries are inclusive in the current benchmark specification.
- A hard deadline is feasible only when physical arrival is at or before the deadline.
- Missing or invalid information must be identified rather than silently assumed or corrected.
- Additional delays, currents, traffic, and other operational factors are not introduced unless explicitly specified in a task.

## Project Architecture

```text
MaritimeBench/
├── data/
│   ├── tasks/
│   └── references/
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
│   │   └── result.storage.ts
│   ├── schemas/
│   ├── tasks/
│   ├── utils/
│   └── index.ts
├── tests/
├── results/
├── package.json
└── tsconfig.json
```

### Key Components

- **Adapters:** Provide a provider-independent model interface, with mock and OpenAI implementations.
- **Task Loader:** Loads and validates benchmark tasks and their corresponding reference data.
- **Prompt Builder:** Constructs the instructions and task-specific model prompts.
- **Voyage Engine:** Provides deterministic voyage-planning calculations.
- **Grader:** Validates model responses and evaluates them against expected outcomes.
- **Evaluation Runner:** Coordinates model execution, grading, and result storage.
- **Reporting:** Aggregates evaluation records and generates CSV and JSON reports.

## Technology Stack

- TypeScript
- Node.js
- Zod
- OpenAI API
- Vitest
- Prettier

## Getting Started

### Prerequisites

- Node.js
- npm
- An OpenAI API key if running evaluations against OpenAI models.

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/isonguyom/MaritimeBench.git
cd MaritimeBench
npm install
```

### Environment Configuration

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=your_model_name
```

The mock provider does not require an OpenAI API key.

## Running Evaluations

### Mock Evaluation

Run a benchmark task using the deterministic mock adapter:

```bash
npm run dev -- --task MB-01 --provider mock
```

Replace `MB-01` with any available task ID from `MB-01` to `MB-09`.

### OpenAI Evaluation

Run a task against an OpenAI model configured in your `.env` file:

```bash
npm run dev -- --task MB-01 --provider openai
```

The CLI currently executes one task per invocation.

### Generating Reports

Generate CSV and JSON reports from stored evaluation records using a run ID:

```bash
npm run dev -- --report --run-id YOUR_RUN_ID
```

## Quality Checks

Run the complete project quality checks:

```bash
npm run quality
```

This runs:

- Prettier formatting validation.
- TypeScript type checking.
- The complete Vitest test suite.

You can also run the individual checks:

```bash
npm run format:check
npm run typecheck
npm test
```

## Current Validation Status

The current implementation has passed:

- 315 automated tests across 21 test files.
- TypeScript type checking.
- Prettier formatting validation.
- End-to-end mock evaluation of MB-01 and MB-09, both scoring 100%.

**Note:** Mock evaluation validates the benchmark pipeline against predefined responses. It does not establish the performance of real AI models. Actual model evaluations must be conducted separately.

## Research Focus

MaritimeBench is designed around the hypothesis that models may perform adequately when operational constraints are evaluated individually but struggle when multiple constraints must be integrated into one feasible voyage plan.

Its central research focus is therefore the evaluation of constraint integration, especially the interaction between weather-related speed restrictions and port receiving windows.

## Limitations

MaritimeBench currently uses synthetic scenarios and explicitly defined operational assumptions. It does not model every factor involved in real-world voyage planning, including live weather forecasts, vessel-specific performance characteristics, traffic separation schemes, dynamic port congestion, or real-time navigational decisions.

Its results should be interpreted within the scope of the benchmark tasks and their defined assumptions.

## License

License information to be added.
