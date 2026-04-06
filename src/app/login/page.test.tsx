import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthSessionMock = vi.fn();
const normalizeCallbackPathMock = vi.fn();
const redirectMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthSession: (...args: unknown[]) => getAuthSessionMock(...args),
}));

vi.mock("@/lib/auth-navigation", () => ({
  normalizeCallbackPath: (...args: unknown[]) => normalizeCallbackPathMock(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock("@/app/login/login-form", () => ({
  LoginForm: ({ callbackPath, notice }: { callbackPath: string; notice?: string }) => (
    <div>
      <p>callback:{callbackPath}</p>
      <p>notice:{notice ?? "none"}</p>
    </div>
  ),
}));

import LoginPage from "@/app/login/page";

describe("LoginPage", () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset();
    normalizeCallbackPathMock.mockReset();
    redirectMock.mockReset();
  });

  it("passes the signed-out notice and normalized callback path to the login form", async () => {
    getAuthSessionMock.mockResolvedValue(null);
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
    expect(
      screen.getByText(
        "notice:You have signed out. Use your email if you want to start another session.",
      ),
    ).toBeInTheDocument();
  });

  it("redirects authenticated users to the normalized callback path", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    normalizeCallbackPathMock.mockReturnValue("/insights");

    await LoginPage({
      searchParams: Promise.resolve({
        callbackUrl: "http://localhost:3000/insights",
      }),
    });

    expect(redirectMock).toHaveBeenCalledWith("/insights");
  });
});
