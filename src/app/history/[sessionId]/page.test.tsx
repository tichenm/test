import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthSessionMock = vi.fn();
const buildLoginRedirectMock = vi.fn();
const buildDiagnosisHandoffBriefMock = vi.fn();
const getInterviewRailLabelMock = vi.fn();
const getDiagnosisReviewStatusLabelMock = vi.fn();
const getDiagnosisSeverityLabelMock = vi.fn();
const getInterviewSessionForUserMock = vi.fn();
const updateDiagnosisFollowUpForUserMock = vi.fn();
const redirectMock = vi.fn();
const notFoundMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthSession: (...args: unknown[]) => getAuthSessionMock(...args),
}));

vi.mock("@/lib/auth-navigation", () => ({
  buildLoginRedirect: (...args: unknown[]) => buildLoginRedirectMock(...args),
}));

vi.mock("@/lib/diagnosis-handoff", () => ({
  buildDiagnosisHandoffBrief: (...args: unknown[]) => buildDiagnosisHandoffBriefMock(...args),
}));

vi.mock("@/lib/interview-presenters", () => ({
  getInterviewRailLabel: (...args: unknown[]) => getInterviewRailLabelMock(...args),
  getDiagnosisReviewStatusLabel: (...args: unknown[]) => getDiagnosisReviewStatusLabelMock(...args),
  getDiagnosisSeverityLabel: (...args: unknown[]) => getDiagnosisSeverityLabelMock(...args),
}));

vi.mock("@/lib/interviews", () => ({
  getInterviewSessionForUser: (...args: unknown[]) => getInterviewSessionForUserMock(...args),
  updateDiagnosisFollowUpForUser: (...args: unknown[]) => updateDiagnosisFollowUpForUserMock(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
  notFound: (...args: unknown[]) => notFoundMock(...args),
}));

import DiagnosisDetailPage from "@/app/history/[sessionId]/page";

describe("DiagnosisDetailPage", () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset();
    buildLoginRedirectMock.mockReset();
    buildDiagnosisHandoffBriefMock.mockReset();
    getInterviewRailLabelMock.mockReset();
    getDiagnosisReviewStatusLabelMock.mockReset();
    getInterviewSessionForUserMock.mockReset();
    updateDiagnosisFollowUpForUserMock.mockReset();
    redirectMock.mockReset();
    notFoundMock.mockReset();

    buildDiagnosisHandoffBriefMock.mockReturnValue("Handoff brief body");
    getInterviewRailLabelMock.mockReturnValue("门店库存与补货");
    getDiagnosisReviewStatusLabelMock.mockImplementation((status: string) =>
      status === "reviewing" ? "跟进中" : "待跟进",
    );
    getDiagnosisSeverityLabelMock.mockImplementation((severity: string) =>
      severity === "high" ? "高" : "中",
    );
  });

  it("redirects unauthenticated users back through login", async () => {
    getAuthSessionMock.mockResolvedValue(null);
    buildLoginRedirectMock.mockReturnValue("/login?callbackUrl=%2Fhistory%2Fsession-1&reason=auth");
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(
      DiagnosisDetailPage({ params: Promise.resolve({ sessionId: "session-1" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(buildLoginRedirectMock).toHaveBeenCalledWith("/history/session-1");
    expect(redirectMock).toHaveBeenCalledWith("/login?callbackUrl=%2Fhistory%2Fsession-1&reason=auth");
  });

  it("redirects unfinished interviews back into the interview flow", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    getInterviewSessionForUserMock.mockResolvedValue({
      id: "session-1",
      status: "ACTIVE",
      diagnosisRecord: null,
    });
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(
      DiagnosisDetailPage({ params: Promise.resolve({ sessionId: "session-1" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/interview/session-1");
  });

  it("renders the diagnosis detail page as a manager recap card", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    getInterviewSessionForUserMock.mockResolvedValue({
      id: "session-1",
      railKey: "store-stock-replenishment",
      storeName: "Store 18",
      roleName: "Store manager",
      status: "COMPLETED",
      messages: [
        { id: "m-1", role: "ASSISTANT", content: "Prompt", stepKey: "problem-symptom" },
        { id: "m-2", role: "USER", content: "Answer", stepKey: "problem-symptom" },
      ],
      diagnosisRecord: {
        painType: "stockout",
        severity: "high",
        reviewStatus: "reviewing",
        ownerName: "Area manager",
        reviewNote: "Comparing sell-through against allocation inputs.",
        frequency: "every weekend campaign",
        timeWindow: "promo launch weekends",
        affectedScope: "promo shelves and high-traffic beverage displays",
        peopleInvolved: "HQ allocation planning and the merchandising system",
        currentWorkaround:
          "the store keeps escalating because the forecast and allocation signal stay too low",
        operationalImpact: "the shelf goes empty even though the team checks it on time",
        likelyRootCause:
          "This looks more like an HQ or system issue. The store is repeatedly working around replenishment or planning signals that do not match the floor.",
        nextAction:
          "Pull the last two weeks of affected SKUs and compare store sell-through with the replenishment or allocation signal being sent from HQ.",
        aiSummary: "Summary text",
      },
    });

    render(await DiagnosisDetailPage({ params: Promise.resolve({ sessionId: "session-1" }) }));

    expect(screen.getByText("当前判断")).toBeInTheDocument();
    expect(screen.getByText("更像是上游触发的问题")).toBeInTheDocument();
    expect(screen.getByText("为什么这样判断")).toBeInTheDocument();
    expect(screen.getByText("重复模式")).toBeInTheDocument();
    expect(screen.getByText("发生位置")).toBeInTheDocument();
    expect(screen.getByText("补救信号")).toBeInTheDocument();
    expect(screen.getByText("优先做什么")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pull the last two weeks of affected SKUs and compare store sell-through with the replenishment or allocation signal being sent from HQ.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("团队当前状态")).toBeInTheDocument();
    expect(screen.getByText("Area manager")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Comparing sell-through against allocation inputs."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开纯文本" })).toHaveAttribute(
      "href",
      "/history/session-1/brief",
    );
    expect(screen.getByRole("link", { name: "下载摘要" })).toHaveAttribute(
      "href",
      "/history/session-1/brief?download=1",
    );
  });
});
