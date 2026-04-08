import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthSessionMock = vi.fn();
const buildLoginRedirectMock = vi.fn();
const redirectMock = vi.fn();
const listInterviewSessionsForUserMock = vi.fn();
const buildInterviewInsightsMock = vi.fn();
const buildHistoryFilterHrefMock = vi.fn();
const getDiagnosisReviewStatusLabelMock = vi.fn();
const getInterviewCardTitleMock = vi.fn();
const getInterviewRailLabelMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthSession: (...args: unknown[]) => getAuthSessionMock(...args),
}));

vi.mock("@/lib/auth-navigation", () => ({
  buildLoginRedirect: (...args: unknown[]) => buildLoginRedirectMock(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock("@/lib/interviews", () => ({
  listInterviewSessionsForUser: (...args: unknown[]) => listInterviewSessionsForUserMock(...args),
}));

vi.mock("@/lib/interview-insights", () => ({
  buildInterviewInsights: (...args: unknown[]) => buildInterviewInsightsMock(...args),
}));

vi.mock("@/lib/history-filters", () => ({
  buildHistoryFilterHref: (...args: unknown[]) => buildHistoryFilterHrefMock(...args),
}));

vi.mock("@/lib/interview-presenters", () => ({
  getDiagnosisReviewStatusLabel: (...args: unknown[]) => getDiagnosisReviewStatusLabelMock(...args),
  getInterviewCardTitle: (...args: unknown[]) => getInterviewCardTitleMock(...args),
  getInterviewRailLabel: (...args: unknown[]) => getInterviewRailLabelMock(...args),
}));

import InsightsPage from "@/app/insights/page";

describe("InsightsPage", () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset();
    buildLoginRedirectMock.mockReset();
    redirectMock.mockReset();
    listInterviewSessionsForUserMock.mockReset();
    buildInterviewInsightsMock.mockReset();
    buildHistoryFilterHrefMock.mockReset();
    getDiagnosisReviewStatusLabelMock.mockReset();
    getInterviewCardTitleMock.mockReset();
    getInterviewRailLabelMock.mockReset();

    buildHistoryFilterHrefMock.mockReturnValue("/history?status=completed");
    getDiagnosisReviewStatusLabelMock.mockImplementation((value: string) => value);
    getInterviewCardTitleMock.mockReturnValue("共同导致的问题");
    getInterviewRailLabelMock.mockReturnValue("门店库存与补货");
  });

  it("redirects unauthenticated users back through login", async () => {
    getAuthSessionMock.mockResolvedValue(null);
    buildLoginRedirectMock.mockReturnValue("/login?callbackUrl=%2Finsights&reason=auth");
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(InsightsPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(buildLoginRedirectMock).toHaveBeenCalledWith("/insights");
    expect(redirectMock).toHaveBeenCalledWith("/login?callbackUrl=%2Finsights&reason=auth");
  });

  it("renders the empty-state coach marks when no completed diagnoses exist", async () => {
    getAuthSessionMock.mockResolvedValue({
      user: { id: "user-1", email: "manager@store.com" },
    });
    listInterviewSessionsForUserMock.mockResolvedValue([]);
    buildInterviewInsightsMock.mockReturnValue({
      summary: {
        totalSessions: 0,
        completedSessions: 0,
        activeSessions: 0,
        topPainType: null,
        topPainTypeCount: 0,
      },
      railBreakdown: [],
      roleBreakdown: [],
      painTypeBreakdown: [],
      topActions: [],
      storeBreakdown: [],
      reviewStatusBreakdown: [],
      severityBreakdown: [],
      recentCompleted: [],
    });

    render(await InsightsPage());

    expect(screen.getByText("看清哪些一线问题在反复出现。")).toBeInTheDocument();
    expect(screen.getByText("总会话数")).toBeInTheDocument();
    expect(screen.getByText("最高频痛点")).toBeInTheDocument();
    expect(screen.getByText("先完成几条诊断，再来看趋势。")).toBeInTheDocument();
    expect(screen.getByText("开始诊断")).toBeInTheDocument();
    expect(screen.getByText("查看历史")).toBeInTheDocument();
  });

  it("renders trend breakdowns and recent diagnoses once completed sessions exist", async () => {
    getAuthSessionMock.mockResolvedValue({
      user: { id: "user-1", email: "manager@store.com" },
    });
    listInterviewSessionsForUserMock.mockResolvedValue([{ id: "session-1" }]);
    buildInterviewInsightsMock.mockReturnValue({
      summary: {
        totalSessions: 5,
        completedSessions: 4,
        activeSessions: 1,
        topPainType: "stockout",
        topPainTypeCount: 3,
      },
      railBreakdown: [{ key: "store-stock-replenishment", label: "门店库存与补货", count: 3 }],
      roleBreakdown: [{ key: "Store manager", label: "Store manager", count: 2 }],
      painTypeBreakdown: [{ key: "stockout", label: "缺货", count: 3 }],
      topActions: [{ label: "Tighten replenishment handoff before Friday close.", count: 2 }],
      storeBreakdown: [{ key: "Store 12", label: "Store 12", count: 2 }],
      reviewStatusBreakdown: [{ key: "reviewing", label: "跟进中", count: 2 }],
      severityBreakdown: [{ key: "high", label: "高", count: 3 }],
      recentCompleted: [
        {
          id: "session-1",
          railKey: "store-stock-replenishment",
          storeName: "Store 12",
          roleName: "Store manager",
          startedAt: new Date("2026-04-06T09:00:00Z"),
          diagnosisRecord: {
            reviewStatus: "reviewing",
            nextAction: "Review replenishment ownership before the next shift.",
          },
        },
      ],
    });

    render(await InsightsPage());

    expect(screen.getByText("按流程查看问题")).toBeInTheDocument();
    expect(screen.getByText("按角色查看问题")).toBeInTheDocument();
    expect(screen.getByText("高频下一步动作")).toBeInTheDocument();
    expect(screen.getByText("最新结构化诊断")).toBeInTheDocument();
    expect(screen.getByText("Tighten replenishment handoff before Friday close.")).toBeInTheDocument();
    expect(screen.getByText("Review replenishment ownership before the next shift.")).toBeInTheDocument();
    expect(screen.getByText("共同导致的问题")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /门店库存与补货Store 12Store managerreviewing共同导致的问题.*Review replenishment ownership before the next shift\./,
      }),
    ).toHaveAttribute("href", "/history/session-1");
  });
});
