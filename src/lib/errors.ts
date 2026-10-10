export type AppErrorCode =
  | "CONFIGURATION_ERROR"
  | "INVALID_MODEL_RESPONSE"
  | "MODEL_TIMEOUT"
  | "MODEL_UNAVAILABLE";

/** Messages must be safe for a public response: no upstream bodies or secrets. */
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}
