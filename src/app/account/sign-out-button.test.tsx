import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignOutButton } from "@/app/account/sign-out-button";

const signOutMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

describe("SignOutButton", () => {
  beforeEach(() => {
    signOutMock.mockReset();
  });

  it("signs the user out back to the login page with a signed-out notice", async () => {
    signOutMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledWith({
        callbackUrl: "/login?reason=signed-out",
      });
    });
  });
});
