import "server-only";
import { z } from "zod";
import { AppError } from "../errors";

const deepSeekEnvSchema = z.object({
  DEEPSEEK_API_KEY: z.string().trim().min(1),
  DEEPSEEK_MODEL: z.string().trim().min(1).default("deepseek-flash"),
  DEEPSEEK_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(15000)
    .default(15000),
  DEEPSEEK_MAX_RETRIES: z.coerce.number().int().min(0).max(2).default(1),
});

export function getDeepSeekEnv() {
  const result = deepSeekEnvSchema.safeParse({
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
    DEEPSEEK_TIMEOUT_MS: process.env.DEEPSEEK_TIMEOUT_MS,
    DEEPSEEK_MAX_RETRIES: process.env.DEEPSEEK_MAX_RETRIES,
  });

  if (!result.success) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "DeepSeek configuration is missing or invalid. Check the server environment.",
      503,
    );
  }
  return result.data;
}
