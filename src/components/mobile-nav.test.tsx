import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

import { MobileNav } from "@/components/mobile-nav";

describe("MobileNav", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });

  it("hides the mobile nav for signed-out visitors", () => {
    usePathnameMock.mockReturnValue("/");

    const { container } = render(<MobileNav isAuthenticated={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("hides the mobile nav during the interview flow", () => {
    usePathnameMock.mockReturnValue("/interview/session-1");

    const { container } = render(<MobileNav isAuthenticated />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows account navigation and marks the active route", () => {
    usePathnameMock.mockReturnValue("/account");

    render(<MobileNav isAuthenticated />);

    expect(screen.getByText("工作台")).toBeInTheDocument();
    expect(screen.getByText("洞察")).toBeInTheDocument();
    expect(screen.getByText("历史")).toBeInTheDocument();
    expect(screen.getByText("账户")).toBeInTheDocument();
    expect(screen.getByText("账户").className).toContain("bg-[var(--color-accent)]");
  });
});
