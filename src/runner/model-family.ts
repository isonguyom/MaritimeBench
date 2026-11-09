export interface ModelFamily {
  name: string;
  source: "inferred_from_model_id" | "unknown";
}

/**
 * Infers a broad model family from a provider's exact model identifier.
 * The exact model identifier must always be retained separately.
 */
export function inferModelFamily(model: string): ModelFamily {
  const normalized = model.trim().toLowerCase();

  const patterns = [
    { pattern: /^gpt-(\d+(?:\.\d+)?)(o)?(?:-|$)/, family: "gpt" },
    { pattern: /^(o\d+)(?:-|$)/, family: "reasoning" },
    {
      pattern: /^claude-(\d+(?:-\d+)?)-(haiku|sonnet|opus)(?:-|$)/,
      family: "claude",
    },
    {
      pattern: /^gemini-(\d+(?:\.\d+)?)-(pro|flash|ultra)(?:-|$)/,
      family: "gemini",
    },
  ];

  for (const entry of patterns) {
    const match = normalized.match(entry.pattern);

    if (match) {
      const family =
        entry.family === "gpt"
          ? `gpt-${match[1]}${match[2] ?? ""}`
          : entry.family === "reasoning"
            ? match[1]
            : `${entry.family}-${match[1]}-${match[2]}`;

      return {
        name: family,
        source: "inferred_from_model_id",
      };
    }
  }

  return {
    name: "unknown",
    source: "unknown",
  };
}
