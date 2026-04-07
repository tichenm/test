import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthSessionMock = vi.fn();
const buildLoginRedirectMock = vi.fn();
const redirectMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthSession: (...args: unknown[]) => getAuthSessionMock(...args),
}));

vi.mock("@/lib/auth-navigation", () => ({
  buildLoginRedirect: (...args: unknown[]) => buildLoginRedirectMock(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock("@/app/account/sign-out-button", () => ({
  SignOutButton: () => <div>Sign out button</div>,
}));

import AccountPage from "@/app/account/page";

describe("AccountPage", () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset();
    buildLoginRedirectMock.mockReset();
    redirectMock.mockReset();
  });

  it("redirects unauthenticated users back through login", async () => {
    getAuthSessionMock.mockResolvedValue(null);
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

    render(await AccountPage());

    expect(screen.getByText("Manage your session")).toBeInTheDocument();
    expect(screen.getByText("manager@store.com")).toBeInTheDocument();
    expect(screen.getByText("Open workbench")).toBeInTheDocument();
    expect(screen.getByText("Review history")).toBeInTheDocument();
    expect(screen.getByText("Sign out button")).toBeInTheDocument();
  });
});
