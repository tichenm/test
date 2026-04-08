import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthSessionMock = vi.fn();
const buildLoginRedirectMock = vi.fn();
const redirectMock = vi.fn();
const listDiagnosticRailsMock = vi.fn();
const buildHistoryExportHrefMock = vi.fn();
const buildHistoryFilterOptionsMock = vi.fn();
const filterInterviewSessionsMock = vi.fn();
const parseHistoryFiltersMock = vi.fn();
const listInterviewSessionsForUserMock = vi.fn();
const getDiagnosisPainTypeLabelMock = vi.fn();
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

vi.mock("@/lib/diagnostic-engine", () => ({
  listDiagnosticRails: (...args: unknown[]) => listDiagnosticRailsMock(...args),
}));

vi.mock("@/lib/history-export", () => ({
  buildHistoryExportHref: (...args: unknown[]) => buildHistoryExportHrefMock(...args),
}));

vi.mock("@/lib/history-filters", () => ({
  buildHistoryFilterOptions: (...args: unknown[]) => buildHistoryFilterOptionsMock(...args),
  filterInterviewSessions: (...args: unknown[]) => filterInterviewSessionsMock(...args),
  parseHistoryFilters: (...args: unknown[]) => parseHistoryFiltersMock(...args),
}));

vi.mock("@/lib/interviews", () => ({
  listInterviewSessionsForUser: (...args: unknown[]) => listInterviewSessionsForUserMock(...args),
}));

vi.mock("@/lib/interview-presenters", () => ({
  getDiagnosisPainTypeLabel: (...args: unknown[]) => getDiagnosisPainTypeLabelMock(...args),
  getDiagnosisReviewStatusLabel: (...args: unknown[]) => getDiagnosisReviewStatusLabelMock(...args),
  getEmptyHistoryCopy: () => "还没有历史记录。",
  getInterviewCardTitle: (...args: unknown[]) => getInterviewCardTitleMock(...args),
  getInterviewRailLabel: (...args: unknown[]) => getInterviewRailLabelMock(...args),
}));

vi.mock("@/lib/pain-types", () => ({
  DIAGNOSIS_PAIN_TYPES: ["stockout"],
}));

import HistoryPage from "@/app/history/page";

describe("HistoryPage", () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset();
    buildLoginRedirectMock.mockReset();
    redirectMock.mockReset();
    listDiagnosticRailsMock.mockReset();
    buildHistoryExportHrefMock.mockReset();
    buildHistoryFilterOptionsMock.mockReset();
    filterInterviewSessionsMock.mockReset();
    parseHistoryFiltersMock.mockReset();
    listInterviewSessionsForUserMock.mockReset();
    getDiagnosisPainTypeLabelMock.mockReset();
    getDiagnosisReviewStatusLabelMock.mockReset();
    getInterviewCardTitleMock.mockReset();
    getInterviewRailLabelMock.mockReset();

    listDiagnosticRailsMock.mockReturnValue([
      { key: "inventory-replenishment", label: "库存与补货" },
    ]);
    buildHistoryExportHrefMock.mockReturnValue("/history/export?status=completed");
    buildHistoryFilterOptionsMock.mockReturnValue({
      storeNames: ["12号店"],
      roleNames: ["门店店长"],
    });
    parseHistoryFiltersMock.mockReturnValue({
      status: "all",
      railKey: "all",
      reviewStatus: "all",
      painType: "all",
      severity: "all",
      storeName: "",
      roleName: "",
      query: "",
    });
    getDiagnosisPainTypeLabelMock.mockReturnValue("缺货");
    getDiagnosisReviewStatusLabelMock.mockReturnValue("跟进中");
    getInterviewCardTitleMock.mockReturnValue("缺货");
    getInterviewRailLabelMock.mockReturnValue("库存与补货");
  });

  it("redirects unauthenticated users back through login", async () => {
    getAuthSessionMock.mockResolvedValue(null);
    buildLoginRedirectMock.mockReturnValue("/login?callbackUrl=%2Fhistory&reason=auth");
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(HistoryPage({})).rejects.toThrow("NEXT_REDIRECT");

    expect(buildLoginRedirectMock).toHaveBeenCalledWith("/history");
    expect(redirectMock).toHaveBeenCalledWith("/login?callbackUrl=%2Fhistory&reason=auth");
  });

  it("renders real href targets for completed and draft history cards", async () => {
    const interviews = [
      {
        id: "done-1",
        status: "COMPLETED",
        railKey: "inventory-replenishment",
        startedAt: new Date("2026-04-08T00:00:00Z"),
        storeName: "12号店",
        roleName: "门店店长",
        diagnosisRecord: {
          reviewStatus: "reviewing",
          nextAction: "先复盘补货交接。",
        },
      },
      {
        id: "draft-1",
        status: "ACTIVE",
        railKey: "inventory-replenishment",
        startedAt: new Date("2026-04-08T00:00:00Z"),
        storeName: "12号店",
        roleName: "门店店长",
        diagnosisRecord: null,
      },
    ];

    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    listInterviewSessionsForUserMock.mockResolvedValue(interviews);
    filterInterviewSessionsMock.mockReturnValue(interviews);

    render(await HistoryPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: "导出当前视图" })).toHaveAttribute(
      "href",
      "/history/export?status=completed",
    );
    expect(
      screen.getByRole("link", {
        name: /已完成跟进中库存与补货12号店门店店长.*缺货.*先复盘补货交接。/,
      }),
    ).toHaveAttribute("href", "/history/done-1");
    expect(
      screen.getByRole("link", {
        name: /进行中的草稿库存与补货12号店门店店长.*缺货.*继续完成引导式问答/,
      }),
    ).toHaveAttribute("href", "/interview/draft-1");
  });
});
