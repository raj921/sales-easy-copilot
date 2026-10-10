import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { create, constructorOptions } = vi.hoisted(() => ({
  create: vi.fn(),
  constructorOptions: vi.fn(),
}));

vi.mock("openai", () => {
  class MockOpenAI {
    static APIConnectionTimeoutError = class extends Error {};
    static APIUserAbortError = class extends Error {};
    chat = { completions: { create } };
    constructor(options: unknown) {
      constructorOptions(options);
    }
  }
  return { default: MockOpenAI };
});

import OpenAI from "openai";
import { getDeepSeekEnv } from "@/lib/server/env";
import { requestStructuredJson } from "@/lib/server/deepseek";

const input = {
  systemPrompt: "Extract the outlet name.",
  userContent: "Metro Fresh",
  schema: z.strictObject({ outlet: z.string() }),
};

beforeEach(() => {
  vi.stubEnv("DEEPSEEK_API_KEY", "test-key-not-a-real-credential");
  vi.stubEnv("DEEPSEEK_MODEL", "deepseek-flash");
  vi.stubEnv("DEEPSEEK_TIMEOUT_MS", "15000");
  vi.stubEnv("DEEPSEEK_MAX_RETRIES", "1");
  create.mockReset();
});

describe("DeepSeek infrastructure (mocked, no provider calls)", () => {
  it("fails safely without a key", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    await expect(requestStructuredJson(input)).rejects.toMatchObject({
      code: "CONFIGURATION_ERROR",
      status: 503,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects unbounded retry settings", () => {
    vi.stubEnv("DEEPSEEK_MAX_RETRIES", "100");
    expect(getDeepSeekEnv).toThrow(
      "DeepSeek configuration is missing or invalid.",
    );
  });

  it("uses the official endpoint, JSON mode and bounded transport settings", async () => {
    create.mockResolvedValue({
      choices: [
        {
          finish_reason: "stop",
          message: { content: '{"outlet":"Metro Fresh"}' },
        },
      ],
    });
    await expect(requestStructuredJson(input)).resolves.toEqual({
      outlet: "Metro Fresh",
    });
    expect(constructorOptions).toHaveBeenCalledWith({
      apiKey: "test-key-not-a-real-credential",
      baseURL: "https://api.deepseek.com",
      timeout: 15000,
      maxRetries: 1,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: { type: "json_object" },
        max_tokens: 4096,
        stream: false,
      }),
      { signal: expect.any(AbortSignal) },
    );
  });

  it("does not expose upstream error bodies", async () => {
    create.mockRejectedValue(
      new Error("upstream secret and private field update"),
    );
    await expect(requestStructuredJson(input)).rejects.toMatchObject({
      code: "MODEL_UNAVAILABLE",
      message: "The model is unavailable. Try again or request human review.",
      status: 503,
    });
  });

  it("identifies transport timeouts", async () => {
    create.mockRejectedValue(new OpenAI.APIConnectionTimeoutError());
    await expect(requestStructuredJson(input)).rejects.toMatchObject({
      code: "MODEL_TIMEOUT",
      status: 504,
    });
  });
});
