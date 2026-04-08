import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthSessionMock = vi.fn();
const buildLoginRedirectMock = vi.fn();
const redirectMock = vi.fn();
const listWorkbenchDiagnosticRailsMock = vi.fn();
const getDiagnosticRailMock = vi.fn();
const listInterviewSessionsForUserMock = vi.fn();
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

vi.mock("@/components/rail-picker", () => ({
  RailPicker: () => <div>RailPicker</div>,
}));

vi.mock("@/lib/diagnostic-engine", () => ({
  DEFAULT_WORKBENCH_RAIL_KEY: "store-stock-replenishment",
  getDiagnosticRail: (...args: unknown[]) => getDiagnosticRailMock(...args),
  isRailKey: () => true,
  listWorkbenchDiagnosticRails: (...args: unknown[]) =>
    listWorkbenchDiagnosticRailsMock(...args),
}));

vi.mock("@/lib/interviews", () => ({
  createInterviewSessionForUser: vi.fn(),
  listInterviewSessionsForUser: (...args: unknown[]) => listInterviewSessionsForUserMock(...args),
}));

vi.mock("@/lib/interview-presenters", () => ({
  getEmptyHistoryCopy: () => "还没有历史记录。",
  getInterviewCardTitle: (...args: unknown[]) => getInterviewCardTitleMock(...args),
  getInterviewRailLabel: (...args: unknown[]) => getInterviewRailLabelMock(...args),
}));

import HomePage from "@/app/page";

describe("HomePage", () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset();
    buildLoginRedirectMock.mockReset();
    redirectMock.mockReset();
    listWorkbenchDiagnosticRailsMock.mockReset();
    getDiagnosticRailMock.mockReset();
    listInterviewSessionsForUserMock.mockReset();
    getInterviewCardTitleMock.mockReset();
    getInterviewRailLabelMock.mockReset();

    listWorkbenchDiagnosticRailsMock.mockReturnValue([
      { key: "store-stock-replenishment", label: "门店库存与补货" },
    ]);
    getDiagnosticRailMock.mockReturnValue({
      workbenchSummary: "默认诊断摘要",
    });
    getInterviewCardTitleMock.mockReturnValue("缺货");
    getInterviewRailLabelMock.mockReturnValue("库存与补货");
  });

  it("redirects unauthenticated users back through login", async () => {
    getAuthSessionMock.mockResolvedValue(null);
    buildLoginRedirectMock.mockReturnValue("/login?callbackUrl=%2F&reason=auth");
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT");

    expect(buildLoginRedirectMock).toHaveBeenCalledWith("/");
    expect(redirectMock).toHaveBeenCalledWith("/login?callbackUrl=%2F&reason=auth");
  });

  it("renders real href targets for draft and completed session shortcuts", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    listInterviewSessionsForUserMock.mockResolvedValue([
      {
        id: "draft-1",
        status: "ACTIVE",
        startedAt: new Date("2026-04-08T00:00:00Z"),
      },
      {
        id: "done-1",
        status: "COMPLETED",
        railKey: "inventory-replenishment",
        startedAt: new Date("2026-04-08T00:00:00Z"),
        storeName: "12号店",
        roleName: "门店店长",
        diagnosisRecord: {
          nextAction: "先复盘补货交接。",
        },
      },
    ]);

    render(await HomePage());

    expect(screen.getByText("RailPicker")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "继续填写" })).toHaveAttribute(
      "href",
      "/interview/draft-1",
    );
    expect(
      screen.getByRole("link", {
        name: /库存与补货12号店门店店长缺货.*先复盘补货交接。/,
      }),
    ).toHaveAttribute("href", "/history/done-1");
  });
});
