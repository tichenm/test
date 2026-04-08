import { beforeEach, describe, expect, it, vi } from "vitest";

const buildLoginRedirectMock = vi.fn();
const resolveRequestOriginMock = vi.fn();
const buildDiagnosisHandoffBriefMock = vi.fn();
const buildDiagnosisHandoffFilenameMock = vi.fn();
const getAuthSessionMock = vi.fn();
const getInterviewSessionForUserMock = vi.fn();

vi.mock("@/lib/auth-navigation", () => ({
  buildLoginRedirect: (...args: unknown[]) => buildLoginRedirectMock(...args),
  resolveRequestOrigin: (...args: unknown[]) => resolveRequestOriginMock(...args),
}));

vi.mock("@/lib/diagnosis-handoff", () => ({
  buildDiagnosisHandoffBrief: (...args: unknown[]) => buildDiagnosisHandoffBriefMock(...args),
  buildDiagnosisHandoffFilename: (...args: unknown[]) => buildDiagnosisHandoffFilenameMock(...args),
}));

vi.mock("@/lib/auth", () => ({
  getAuthSession: (...args: unknown[]) => getAuthSessionMock(...args),
}));

vi.mock("@/lib/interviews", () => ({
  getInterviewSessionForUser: (...args: unknown[]) => getInterviewSessionForUserMock(...args),
}));

import { GET } from "@/app/history/[sessionId]/brief/route";

describe("diagnosis brief route", () => {
  beforeEach(() => {
    buildLoginRedirectMock.mockReset();
    resolveRequestOriginMock.mockReset();
    buildDiagnosisHandoffBriefMock.mockReset();
    buildDiagnosisHandoffFilenameMock.mockReset();
    getAuthSessionMock.mockReset();
    getInterviewSessionForUserMock.mockReset();
  });

  it("redirects unauthenticated requests with the full brief callback path", async () => {
    getAuthSessionMock.mockResolvedValue(null);
    buildLoginRedirectMock.mockReturnValue(
      "/login?callbackUrl=%2Fhistory%2Fsession-1%2Fbrief%3Fdownload%3D1&reason=auth",
    );
    resolveRequestOriginMock.mockReturnValue("http://127.0.0.1:3000");

    const response = await GET(
      new Request("http://localhost:3000/history/session-1/brief?download=1", {
        headers: {
          host: "127.0.0.1:3000",
        },
      }),
      { params: Promise.resolve({ sessionId: "session-1" }) },
    );

    expect(response.status).toBe(302);
    expect(buildLoginRedirectMock).toHaveBeenCalledWith("/history/session-1/brief?download=1");
    expect(resolveRequestOriginMock).toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://127.0.0.1:3000/login?callbackUrl=%2Fhistory%2Fsession-1%2Fbrief%3Fdownload%3D1&reason=auth",
    );
  });

  it("returns 409 when the diagnosis is not ready for handoff", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    getInterviewSessionForUserMock.mockResolvedValue({
      id: "session-1",
      status: "ACTIVE",
      diagnosisRecord: null,
    });

    const response = await GET(
      new Request("http://localhost:3000/history/session-1/brief"),
      { params: Promise.resolve({ sessionId: "session-1" }) },
    );

    expect(response.status).toBe(409);
    expect(await response.text()).toBe("Diagnosis is not ready for handoff.");
  });

  it("returns an inline plain-text brief by default", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    getInterviewSessionForUserMock.mockResolvedValue({
      id: "session-1",
      status: "COMPLETED",
      diagnosisRecord: { likelyRootCause: "Late replenishment handoff" },
    });
    buildDiagnosisHandoffFilenameMock.mockReturnValue("session-1-brief.txt");
    buildDiagnosisHandoffBriefMock.mockReturnValue("Likely root cause: Late replenishment handoff");

    const response = await GET(
      new Request("http://localhost:3000/history/session-1/brief"),
      { params: Promise.resolve({ sessionId: "session-1" }) },
    );

    expect(getInterviewSessionForUserMock).toHaveBeenCalledWith("user-1", "session-1");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="session-1-brief.txt"',
    );
    expect(await response.text()).toBe("Likely root cause: Late replenishment handoff");
  });

  it("switches to attachment mode when download=1 is present", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    getInterviewSessionForUserMock.mockResolvedValue({
      id: "session-1",
      status: "COMPLETED",
      diagnosisRecord: { likelyRootCause: "Late replenishment handoff" },
    });
    buildDiagnosisHandoffFilenameMock.mockReturnValue("session-1-brief.txt");
    buildDiagnosisHandoffBriefMock.mockReturnValue("Likely root cause: Late replenishment handoff");

    const response = await GET(
      new Request("http://localhost:3000/history/session-1/brief?download=1"),
      { params: Promise.resolve({ sessionId: "session-1" }) },
    );

    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="session-1-brief.txt"',
    );
  });
});
