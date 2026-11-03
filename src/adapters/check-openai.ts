import "dotenv/config";
import OpenAI from "openai";

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing from .env.");
  }

  if (!model) {
    throw new Error("OPENAI_MODEL is missing from .env.");
  }

  const client = new OpenAI({ apiKey });

  console.log("Checking OpenAI API connection...");

  const response = await client.models.list();

  console.log("API authentication: successful");
  console.log(`Configured model: ${model}`);

  const modelAvailable = response.data.some(
    (item) => item.id === model,
  );

  console.log(
    `Model listed for this API key: ${modelAvailable ? "Yes" : "No"}`,
  );

  if (!modelAvailable) {
    throw new Error(
      `The configured model "${model}" was not found in the available model list.`,
    );
  }

  console.log("OpenAI API connection check completed.");
}

main().catch((error: unknown) => {
  console.error(
    "OpenAI connection check failed:",
    error instanceof Error ? error.message : "Unknown error",
  );

  process.exitCode = 1;
});