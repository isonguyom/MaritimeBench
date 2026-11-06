# MaritimeBench Commands

## 1. Setup

```powershell
npm install
Copy-Item .env.example .env
```

## 2. Quality Checks

```powershell
npm run quality
```

## 3. Mock Evaluation

Run the complete benchmark:

```powershell
npm run eval:mock
```

Run a specific task:

```powershell
npm run eval:mock -- --task MB-01
```

## 4. Real-Model Evaluation

Run the complete benchmark:

```powershell
npm run eval
```

Select a model:

```powershell
npm run eval -- --model MODEL_NAME
```

Specify trials per task:

```powershell
npm run eval -- --model MODEL_NAME --trials 5
```

Run a specific task:

```powershell
npm run eval -- --task MB-01 --model MODEL_NAME
```

Run a specific task with a specified model and number of trials:

```powershell
npm run eval -- --task MB-01 --model MODEL_NAME --trials 5
```

## 5. Report Generation

```powershell
npm run report -- --run-id RUN_ID
```