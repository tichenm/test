import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthSessionMock = vi.fn();
const isDirectDevAuthEnabledMock = vi.fn();
const buildLoginRedirectMock = vi.fn();
const redirectMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthSession: (...args: unknown[]) => getAuthSessionMock(...args),
}));

vi.mock("@/lib/direct-auth", () => ({
  isDirectDevAuthEnabled: (...args: unknown[]) => isDirectDevAuthEnabledMock(...args),
}));

vi.mock("@/lib/auth-navigation", () => ({
  buildLoginRedirect: (...args: unknown[]) => buildLoginRedirectMock(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock("@/app/account/sign-out-button", () => ({
  SignOutButton: () => <div>退出登录按钮</div>,
}));

import AccountPage from "@/app/account/page";

describe("AccountPage", () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset();
    isDirectDevAuthEnabledMock.mockReset();
    buildLoginRedirectMock.mockReset();
    redirectMock.mockReset();
  });

  it("redirects unauthenticated users back through login", async () => {
    getAuthSessionMock.mockResolvedValue(null);
    isDirectDevAuthEnabledMock.mockReturnValue(false);
    buildLoginRedirectMock.mockReturnValue("/login?callbackUrl=%2Faccount&reason=auth");
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(AccountPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(buildLoginRedirectMock).toHaveBeenCalledWith("/account");
    expect(redirectMock).toHaveBeenCalledWith("/login?callbackUrl=%2Faccount&reason=auth");
  });

  it("renders the active identity and session shortcuts for signed-in users", async () => {
    getAuthSessionMock.mockResolvedValue({
      user: { id: "user-1", email: "manager@store.com" },
    });
    isDirectDevAuthEnabledMock.mockReturnValue(false);

    render(await AccountPage());

    expect(screen.getByText("管理当前会话")).toBeInTheDocument();
    expect(screen.getByText("manager@store.com")).toBeInTheDocument();
    expect(screen.getByText("打开工作台")).toBeInTheDocument();
    expect(screen.getByText("查看历史")).toBeInTheDocument();
    expect(screen.getByText("退出登录按钮")).toBeInTheDocument();
  });

  it("renders a direct logout link when local development auth bypass is enabled", async () => {
    getAuthSessionMock.mockResolvedValue({
      user: { id: "user-1", email: "manager@store.com" },
    });
    isDirectDevAuthEnabledMock.mockReturnValue(true);

    render(await AccountPage());

    expect(screen.getByRole("link", { name: "退出登录" })).toHaveAttribute(
      "href",
      "/api/dev-logout",
    );
  });
});
