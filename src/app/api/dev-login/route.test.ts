import { beforeEach, describe, expect, it, vi } from "vitest";

const normalizeCallbackPathMock = vi.fn();
const resolveRequestOriginMock = vi.fn();
const resolveTrustedRedirectUrlMock = vi.fn();
const createDirectDevAuthSessionMock = vi.fn();
const isDirectDevAuthEnabledMock = vi.fn();

vi.mock("@/lib/auth-navigation", () => ({
  normalizeCallbackPath: (...args: unknown[]) => normalizeCallbackPathMock(...args),
  resolveRequestOrigin: (...args: unknown[]) => resolveRequestOriginMock(...args),
  resolveTrustedRedirectUrl: (...args: unknown[]) => resolveTrustedRedirectUrlMock(...args),
}));

vi.mock("@/lib/direct-auth", () => ({
  createDirectDevAuthSession: (...args: unknown[]) => createDirectDevAuthSessionMock(...args),
  isDirectDevAuthEnabled: (...args: unknown[]) => isDirectDevAuthEnabledMock(...args),
}));

import { POST } from "@/app/api/dev-login/route";

describe("dev login route", () => {
  beforeEach(() => {
    normalizeCallbackPathMock.mockReset();
    resolveRequestOriginMock.mockReset();
    resolveTrustedRedirectUrlMock.mockReset();
    createDirectDevAuthSessionMock.mockReset();
    isDirectDevAuthEnabledMock.mockReset();
  });

  it("returns 404 when direct dev auth is disabled", async () => {
    isDirectDevAuthEnabledMock.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost:3000/api/dev-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "email=qa%40store.com&callbackPath=%2F",
      }),
    );

    expect(response.status).toBe(404);
  });

  it("redirects using the resolved request origin", async () => {
    isDirectDevAuthEnabledMock.mockReturnValue(true);
    normalizeCallbackPathMock.mockReturnValue("/");
    resolveRequestOriginMock.mockReturnValue("http://127.0.0.1:3000");
    resolveTrustedRedirectUrlMock.mockReturnValue("http://127.0.0.1:3000/");

    const response = await POST(
      new Request("http://localhost:3000/api/dev-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          host: "127.0.0.1:3000",
        },
        body: "email=qa%40store.com&callbackPath=%2F",
      }),
    );

    expect(createDirectDevAuthSessionMock).toHaveBeenCalledWith("qa@store.com");
    expect(normalizeCallbackPathMock).toHaveBeenCalledWith("/");
    expect(resolveRequestOriginMock).toHaveBeenCalled();
    expect(resolveTrustedRedirectUrlMock).toHaveBeenCalledWith(
      "/",
      "http://127.0.0.1:3000",
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/");
  });
});
