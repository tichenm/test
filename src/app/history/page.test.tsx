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

  it("surfaces a priority queue for high-severity unfinished follow-up work", async () => {
    const interviews = [
      {
        id: "done-high-new",
        status: "COMPLETED",
        railKey: "inventory-replenishment",
        startedAt: new Date("2026-04-08T09:00:00Z"),
        storeName: "12号店",
        roleName: "门店店长",
        diagnosisRecord: {
          severity: "high",
          reviewStatus: "new",
          nextAction: "先补缺货商品的责任交接。",
        },
      },
      {
        id: "done-high-reviewing",
        status: "COMPLETED",
        railKey: "inventory-replenishment",
        startedAt: new Date("2026-04-08T11:00:00Z"),
        storeName: "18号店",
        roleName: "门店店长",
        diagnosisRecord: {
          severity: "high",
          reviewStatus: "reviewing",
          nextAction: "先核对最新高峰补货节奏。",
        },
      },
      {
        id: "done-medium-reviewing",
        status: "COMPLETED",
        railKey: "inventory-replenishment",
        startedAt: new Date("2026-04-08T12:00:00Z"),
        storeName: "22号店",
        roleName: "值班店长",
        diagnosisRecord: {
          severity: "medium",
          reviewStatus: "reviewing",
          nextAction: "先复盘本周盘点误差。",
        },
      },
      {
        id: "done-resolved",
        status: "COMPLETED",
        railKey: "inventory-replenishment",
        startedAt: new Date("2026-04-08T13:00:00Z"),
        storeName: "30号店",
        roleName: "门店店长",
        diagnosisRecord: {
          severity: "high",
          reviewStatus: "resolved",
          nextAction: "这条不该再出现在优先队列。",
        },
      },
      {
        id: "draft-1",
        status: "ACTIVE",
        railKey: "inventory-replenishment",
        startedAt: new Date("2026-04-08T14:00:00Z"),
        storeName: "40号店",
        roleName: "门店店长",
        diagnosisRecord: null,
      },
    ];

    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    listInterviewSessionsForUserMock.mockResolvedValue(interviews);
    filterInterviewSessionsMock.mockReturnValue(interviews);
    getDiagnosisReviewStatusLabelMock.mockImplementation((value: string) =>
      value === "new" ? "待跟进" : value === "reviewing" ? "跟进中" : "已解决",
    );

    render(await HistoryPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("优先处理队列")).toBeInTheDocument();
    expect(screen.getByText("先处理高严重度且仍未闭环的问题。")).toBeInTheDocument();

    const priorityLinks = screen.getAllByRole("link", { name: /优先处理/ });

    expect(priorityLinks).toHaveLength(3);
    expect(priorityLinks[0]).toHaveAttribute("href", "/history/done-high-reviewing");
    expect(priorityLinks[1]).toHaveAttribute("href", "/history/done-high-new");
    expect(priorityLinks[2]).toHaveAttribute("href", "/history/done-medium-reviewing");
    expect(
      priorityLinks.some((link) => link.getAttribute("href") === "/history/done-resolved"),
    ).toBe(false);
  });
});
