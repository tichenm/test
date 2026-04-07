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

    await user.type(screen.getByLabelText("Work email"), "manager@store.com");
    await user.click(screen.getByRole("button", { name: "Send sign-in link" }));

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

    await user.type(screen.getByLabelText("Work email"), "manager@store.com");
    await user.click(screen.getByRole("button", { name: "Send sign-in link" }));

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
        notice="Sign in to continue to the page you asked for."
      />,
    );

    expect(
      screen.getByText("Sign in to continue to the page you asked for."),
    ).toBeInTheDocument();
  });
});
