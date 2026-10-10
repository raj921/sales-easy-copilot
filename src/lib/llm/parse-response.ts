import { z } from "zod";
import { AppError } from "../errors";

export function parseModelResponse<Schema extends z.ZodType>(
  content: string | null,
  finishReason: string | null,
  schema: Schema,
): z.output<Schema> {
  if (finishReason !== "stop" || !content?.trim()) {
    throw invalidResponse();
  }

  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw invalidResponse();
  }

  const result = schema.safeParse(value);
  if (!result.success) throw invalidResponse();
  return result.data;
}

function invalidResponse() {
  return new AppError(
    "INVALID_MODEL_RESPONSE",
    "The model did not return a complete, valid result. Try again or request human review.",
    502,
  );
}
