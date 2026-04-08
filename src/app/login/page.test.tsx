import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthSessionMock = vi.fn();
const isDirectDevAuthEnabledMock = vi.fn();
const normalizeCallbackPathMock = vi.fn();
const redirectMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthSession: (...args: unknown[]) => getAuthSessionMock(...args),
}));

vi.mock("@/lib/direct-auth", () => ({
  isDirectDevAuthEnabled: (...args: unknown[]) => isDirectDevAuthEnabledMock(...args),
}));

vi.mock("@/lib/auth-navigation", () => ({
  normalizeCallbackPath: (...args: unknown[]) => normalizeCallbackPathMock(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock("@/app/login/login-form", () => ({
  LoginForm: ({
    callbackPath,
    notice,
    authMode,
  }: {
    callbackPath: string;
    notice?: string;
    authMode: string;
  }) => (
    <div>
      <p>callback:{callbackPath}</p>
      <p>notice:{notice ?? "none"}</p>
      <p>authMode:{authMode}</p>
    </div>
  ),
}));

import LoginPage from "@/app/login/page";

describe("LoginPage", () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset();
    isDirectDevAuthEnabledMock.mockReset();
    normalizeCallbackPathMock.mockReset();
    redirectMock.mockReset();
  });

  it("passes the signed-out notice and normalized callback path to the login form", async () => {
    getAuthSessionMock.mockResolvedValue(null);
    isDirectDevAuthEnabledMock.mockReturnValue(false);
    normalizeCallbackPathMock.mockReturnValue("/history");

    render(
      await LoginPage({
        searchParams: Promise.resolve({
          callbackUrl: "http://localhost:3000/history",
          reason: "signed-out",
        }),
      }),
    );

    expect(normalizeCallbackPathMock).toHaveBeenCalledWith("http://localhost:3000/history");
    expect(screen.getByText("callback:/history")).toBeInTheDocument();
    expect(screen.getByText("authMode:magic-link")).toBeInTheDocument();
    expect(
      screen.getByText(
        "notice:你已退出登录。如需继续使用，请重新输入邮箱登录。",
      ),
    ).toBeInTheDocument();
  });

  it("switches the login page into direct dev auth mode when local email is disabled", async () => {
    getAuthSessionMock.mockResolvedValue(null);
    isDirectDevAuthEnabledMock.mockReturnValue(true);
    normalizeCallbackPathMock.mockReturnValue("/");

    render(await LoginPage({}));

    expect(screen.getByText("authMode:direct-dev")).toBeInTheDocument();
  });

  it("redirects authenticated users to the normalized callback path", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    isDirectDevAuthEnabledMock.mockReturnValue(false);
    normalizeCallbackPathMock.mockReturnValue("/insights");

    await LoginPage({
      searchParams: Promise.resolve({
        callbackUrl: "http://localhost:3000/insights",
      }),
    });

    expect(redirectMock).toHaveBeenCalledWith("/insights");
  });
});
