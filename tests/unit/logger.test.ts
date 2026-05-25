import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logTrace, estimateCost } from "../../lib/telemetry/logger";
import type { RunTrace } from "../../lib/telemetry/logger";

const SAMPLE_TRACE: RunTrace = {
  traceId: "test-uuid-1234",
  query: "How does getUserById work?",
  promptVersion: "system-v1",
  modelName: "gpt-4o",
  startedAt: "2026-05-25T10:00:00.000Z",
  latencyMs: 1234,
  inputTokens: 500,
  outputTokens: 200,
  totalTokens: 700,
  estimatedCostUsd: 0.0055,
  steps: 2,
  retrievedChunks: [{ file: "lib/users.ts", similarity: 0.92 }],
  toolCalls: [{ tool: "searchCodebase", input: { query: "getUserById" }, durationMs: 0 }],
  structuredOutputValid: true,
  injectionDetected: false,
};

describe("estimateCost", () => {
  it("calculates cost correctly for known token counts", () => {
    // 1000 input @ $5/1M + 500 output @ $15/1M = $0.005 + $0.0075 = $0.0125
    expect(estimateCost(1000, 500)).toBeCloseTo(0.0125, 6);
  });

  it("returns 0 for zero tokens", () => {
    expect(estimateCost(0, 0)).toBe(0);
  });

  it("applies correct per-token pricing", () => {
    // 1M input tokens should cost exactly $5
    expect(estimateCost(1_000_000, 0)).toBeCloseTo(5, 4);
    // 1M output tokens should cost exactly $15
    expect(estimateCost(0, 1_000_000)).toBeCloseTo(15, 4);
  });
});

describe("logTrace", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("calls console.log exactly once", () => {
    logTrace(SAMPLE_TRACE);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("emits valid JSON", () => {
    logTrace(SAMPLE_TRACE);
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("includes level and event fields", () => {
    logTrace(SAMPLE_TRACE);
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("INFO");
    expect(parsed.event).toBe("chat.trace");
  });

  it("includes all trace fields in the log line", () => {
    logTrace(SAMPLE_TRACE);
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(parsed.traceId).toBe("test-uuid-1234");
    expect(parsed.query).toBe("How does getUserById work?");
    expect(parsed.latencyMs).toBe(1234);
    expect(parsed.structuredOutputValid).toBe(true);
    expect(parsed.injectionDetected).toBe(false);
  });

  it("logs injection-detected traces with injectionDetected=true", () => {
    logTrace({ ...SAMPLE_TRACE, injectionDetected: true, structuredOutputValid: false });
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(parsed.injectionDetected).toBe(true);
  });

  it("includes failureReason when provided", () => {
    logTrace({ ...SAMPLE_TRACE, failureReason: "structured output validation failed" });
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(parsed.failureReason).toBe("structured output validation failed");
  });
});
