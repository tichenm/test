import { afterEach, describe, expect, it, vi } from "vitest";

import {
  generateDiagnosisSummary,
  generateGuidedQuestion,
  renderDiagnosisSummary,
  renderGuidedQuestion,
} from "@/lib/ai";
import type { DiagnosisRecord } from "@/lib/diagnosis-schema";
import type { InterviewState } from "@/lib/diagnostic-engine";

const sampleState: InterviewState = {
  railKey: "inventory-replenishment",
  currentStep: "frequency-pattern",
  fields: {
    painType: "stockout",
  },
};

const sampleRecord: DiagnosisRecord = {
  painType: "stockout",
  severity: "high",
  frequency: "weekly",
  timeWindow: "weekends",
  affectedScope: "fast-moving SKUs",
  peopleInvolved: "shift leads",
  currentWorkaround: "manual Slack reminders",
  operationalImpact: "missed weekend sales and rushed transfers",
  likelyRootCause:
    "Late replenishment handoff is causing fast-moving items to miss the next stock cycle.",
  nextAction:
    "Review the replenishment handoff timing and ownership before the next weekend shift.",
};

describe("ai helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("falls back to deterministic guided questions when no API key is configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const question = await generateGuidedQuestion(
      "How often do you run out of stock in this situation?",
      sampleState,
    );

    expect(question).toBe(
      renderGuidedQuestion(
        "How often do you run out of stock in this situation?",
        sampleState,
      ),
    );
  });

  it("uses the OpenAI response output_text when an API key is configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "gpt-5.4");
    vi.stubEnv("OPENAI_REASONING_EFFORT", "high");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: "AI summary from the live provider.",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const summary = await generateDiagnosisSummary(sampleRecord);

    expect(summary).toBe("AI summary from the live provider.");
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(requestInit.body));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
    expect(payload.model).toBe("gpt-5.4");
    expect(payload.reasoning).toEqual({
      effort: "high",
    });
  });

  it("falls back to deterministic diagnosis summaries when the provider response is unusable", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    vi.stubGlobal("fetch", fetchMock);

    const summary = await generateDiagnosisSummary(sampleRecord);

    expect(summary).toBe(renderDiagnosisSummary(sampleRecord));
  });
});
