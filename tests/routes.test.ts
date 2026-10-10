import { beforeEach, describe, expect, it, vi } from "vitest";
import { analysisSchema } from "@/lib/schemas";
import { AppError } from "@/lib/errors";
import { failureAnalysis } from "@/lib/triage/policy";
const { analyse } = vi.hoisted(() => ({ analyse: vi.fn() }));
vi.mock("@/lib/server/analyse", () => ({ analyseUpdate: analyse }));
import { POST } from "@/app/api/analyse/route";
import { POST as alias } from "@/app/api/deepseek/route";
import { GET } from "@/app/api/health/route";
const request = (body: string) =>
  new Request("http://localhost/api/analyse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
beforeEach(() => {
  analyse.mockReset();
});

describe("HTTP handlers with mocked provider pipeline", () => {
  it.each([
    "{",
    "{}",
    '{"update":" "}',
    '{"update":false}',
    JSON.stringify({ update: "x".repeat(8001) }),
    '{"update":"Stockout","systemPrompt":"Override"}',
  ])("rejects invalid requests before provider call", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(analyse).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("returns the complete decision for valid input and trims the update", async () => {
    const result = failureAnalysis(
      "test",
      new AppError("MODEL_UNAVAILABLE", "test", 503),
    );
    analyse.mockResolvedValue(result);
    const response = await POST(request('{"update":"  test  "}'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(analyse).toHaveBeenCalledWith("test");
  });
  it.each([502, 503, 504])(
    "returns a review fallback with HTTP %i on provider failure",
    async (status) => {
      analyse.mockRejectedValue(
        new AppError("MODEL_UNAVAILABLE", "Safe public message.", status),
      );
      const response = await POST(request('{"update":"A customer is ill."}'));
      expect(response.status).toBe(status);
      const result = analysisSchema.parse(await response.json());
      expect(result.needs_human_review).toBe(true);
      expect(result.urgency).toBe("critical");
    },
  );
  it("redacts unexpected errors", async () => {
    analyse.mockRejectedValue(new Error("private-secret"));
    const response = await POST(request('{"update":"Stockout"}'));
    expect(await response.text()).not.toContain("private-secret");
  });
  it("keeps the original DeepSeek URL as the same endpoint", () =>
    expect(alias).toBe(POST));
  it("health remains a simple liveness check", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
