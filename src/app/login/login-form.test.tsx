import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/app/login/login-form";

const signInMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    signInMock.mockReset();
  });

  it("uses the current host when building the magic-link callback URL", async () => {
    signInMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText("工作邮箱"), "manager@store.com");
    await user.click(screen.getByRole("button", { name: "发送登录链接" }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("email", {
        email: "manager@store.com",
        redirect: false,
        callbackUrl: "http://localhost:3000/",
      });
    });
  });

  it("preserves an explicit callback path from the login page", async () => {
    signInMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<LoginForm callbackPath="/history" />);

    await user.type(screen.getByLabelText("工作邮箱"), "manager@store.com");
    await user.click(screen.getByRole("button", { name: "发送登录链接" }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("email", {
        email: "manager@store.com",
        redirect: false,
        callbackUrl: "http://localhost:3000/history",
      });
    });
  });

  it("shows an auth notice when the user was redirected from a protected page", () => {
    render(
        <LoginForm
          callbackPath="/history"
          notice="请先登录，再继续访问你刚才打开的页面。"
        />,
      );

    expect(
      screen.getByText("请先登录，再继续访问你刚才打开的页面。"),
    ).toBeInTheDocument();
  });

  it("renders a direct-entry form in local development mode", () => {
    render(<LoginForm authMode="direct-dev" callbackPath="/history" />);

    expect(
      screen.getByText("当前是本地开发模式。输入工作邮箱后可直接进入，无需邮件验证。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "直接进入" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("/history")).toHaveAttribute("name", "callbackPath");
    expect(screen.getByDisplayValue("/history")).toHaveAttribute("type", "hidden");
    expect(screen.getByRole("form")).toHaveAttribute("action", "/api/dev-login");
    expect(screen.getByRole("form")).toHaveAttribute("method", "post");
  });
});
