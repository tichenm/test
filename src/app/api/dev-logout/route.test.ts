import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestOriginMock = vi.fn();
const clearDirectDevAuthSessionMock = vi.fn();
const isDirectDevAuthEnabledMock = vi.fn();

vi.mock("@/lib/auth-navigation", () => ({
  resolveRequestOrigin: (...args: unknown[]) => resolveRequestOriginMock(...args),
}));

vi.mock("@/lib/direct-auth", () => ({
  clearDirectDevAuthSession: (...args: unknown[]) => clearDirectDevAuthSessionMock(...args),
  isDirectDevAuthEnabled: (...args: unknown[]) => isDirectDevAuthEnabledMock(...args),
}));

import { GET } from "@/app/api/dev-logout/route";

describe("dev logout route", () => {
  beforeEach(() => {
    resolveRequestOriginMock.mockReset();
    clearDirectDevAuthSessionMock.mockReset();
    isDirectDevAuthEnabledMock.mockReset();
  });

  it("returns 404 when direct dev auth is disabled", async () => {
    isDirectDevAuthEnabledMock.mockReturnValue(false);

    const response = await GET(
      new Request("http://localhost:3000/api/dev-logout"),
    );

    expect(response.status).toBe(404);
  });

  it("redirects signed-out users back to the resolved request origin", async () => {
    isDirectDevAuthEnabledMock.mockReturnValue(true);
    resolveRequestOriginMock.mockReturnValue("http://127.0.0.1:3000");

    const response = await GET(
      new Request("http://localhost:3000/api/dev-logout", {
        headers: {
          host: "127.0.0.1:3000",
        },
      }),
    );

    expect(clearDirectDevAuthSessionMock).toHaveBeenCalled();
    expect(resolveRequestOriginMock).toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://127.0.0.1:3000/login?reason=signed-out",
    );
  });
});
