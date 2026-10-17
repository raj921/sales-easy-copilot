import { z } from "zod";

export const preferencesSchema = z.strictObject({
  theme: z.enum(["system", "light", "dark"]),
  density: z.enum(["comfortable", "compact"]),
  resultView: z.enum(["summary", "evidence", "json"]),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = {
  theme: "light",
  density: "comfortable",
  resultView: "summary",
};
export function parsePreferences(value: string | null): Preferences {
  try {
    return preferencesSchema.parse(JSON.parse(value ?? "null"));
  } catch {
    return defaultPreferences;
  }
}
