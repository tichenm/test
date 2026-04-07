import { beforeEach, describe, expect, it, vi } from "vitest";

const buildLoginRedirectMock = vi.fn();
const buildHistoryExportCsvMock = vi.fn();
const buildHistoryExportFilenameMock = vi.fn();
const filterInterviewSessionsMock = vi.fn();
const parseHistoryFiltersMock = vi.fn();
const getAuthSessionMock = vi.fn();
const listInterviewSessionsForUserMock = vi.fn();

vi.mock("@/lib/auth-navigation", () => ({
  buildLoginRedirect: (...args: unknown[]) => buildLoginRedirectMock(...args),
}));

vi.mock("@/lib/history-export", () => ({
  buildHistoryExportCsv: (...args: unknown[]) => buildHistoryExportCsvMock(...args),
  buildHistoryExportFilename: (...args: unknown[]) => buildHistoryExportFilenameMock(...args),
}));

vi.mock("@/lib/history-filters", () => ({
  filterInterviewSessions: (...args: unknown[]) => filterInterviewSessionsMock(...args),
  parseHistoryFilters: (...args: unknown[]) => parseHistoryFiltersMock(...args),
}));

vi.mock("@/lib/auth", () => ({
  getAuthSession: (...args: unknown[]) => getAuthSessionMock(...args),
}));

vi.mock("@/lib/interviews", () => ({
  listInterviewSessionsForUser: (...args: unknown[]) => listInterviewSessionsForUserMock(...args),
}));

import { GET } from "@/app/history/export/route";

describe("history export route", () => {
  beforeEach(() => {
    buildLoginRedirectMock.mockReset();
    buildHistoryExportCsvMock.mockReset();
    buildHistoryExportFilenameMock.mockReset();
    filterInterviewSessionsMock.mockReset();
    parseHistoryFiltersMock.mockReset();
    getAuthSessionMock.mockReset();
    listInterviewSessionsForUserMock.mockReset();
  });

  it("redirects unauthenticated requests back through login with the full export query", async () => {
    getAuthSessionMock.mockResolvedValue(null);
    buildLoginRedirectMock.mockReturnValue(
      "/login?callbackUrl=%2Fhistory%2Fexport%3Fstatus%3Dcompleted%26q%3DStore%2B12&reason=auth",
    );

    const response = await GET(
      new Request("http://localhost:3000/history/export?status=completed&q=Store+12"),
    );

    expect(response.status).toBe(302);
    expect(buildLoginRedirectMock).toHaveBeenCalledWith("/history/export?status=completed&q=Store+12");
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?callbackUrl=%2Fhistory%2Fexport%3Fstatus%3Dcompleted%26q%3DStore%2B12&reason=auth",
    );
  });

  it("returns a no-store csv export for the filtered session view", async () => {
    const filters = {
      status: "completed",
      railKey: "inventory-replenishment",
      reviewStatus: "all",
      painType: "all",
      storeName: "Store 12",
      roleName: "Store manager",
      query: "Store 12",
    };
    const sessions = [{ id: "session-1" }];

    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    parseHistoryFiltersMock.mockReturnValue(filters);
    listInterviewSessionsForUserMock.mockResolvedValue(sessions);
    filterInterviewSessionsMock.mockReturnValue(sessions);
    buildHistoryExportCsvMock.mockReturnValue("Session ID\nsession-1");
    buildHistoryExportFilenameMock.mockReturnValue("guided-pain-history-2026-04-06.csv");

    const response = await GET(
      new Request(
        "http://localhost:3000/history/export?status=completed&railKey=inventory-replenishment&q=Store+12",
      ),
    );

    expect(parseHistoryFiltersMock).toHaveBeenCalledWith({
      q: "Store 12",
      railKey: "inventory-replenishment",
      status: "completed",
    });
    expect(listInterviewSessionsForUserMock).toHaveBeenCalledWith("user-1");
    expect(filterInterviewSessionsMock).toHaveBeenCalledWith(sessions, filters);
    expect(buildHistoryExportCsvMock).toHaveBeenCalledWith(sessions);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="guided-pain-history-2026-04-06.csv"',
    );
    expect(await response.text()).toBe("Session ID\nsession-1");
  });
});
