import { beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.fn();
const findUniqueMock = vi.fn();
const upsertMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: (...args: unknown[]) => cookiesMock(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      upsert: (...args: unknown[]) => upsertMock(...args),
    },
  },
}));

import {
  DIRECT_DEV_AUTH_COOKIE_NAME,
  clearDirectDevAuthSession,
  createDirectDevAuthSession,
  getDirectDevAuthSession,
  isDirectDevAuthEnabled,
} from "@/lib/direct-auth";

describe("direct dev auth", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    findUniqueMock.mockReset();
    upsertMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("enables direct dev auth only outside production when SMTP is not configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_SERVER_HOST", "");
    expect(isDirectDevAuthEnabled()).toBe(true);

    vi.stubEnv("EMAIL_SERVER_HOST", "smtp.example.com");
    expect(isDirectDevAuthEnabled()).toBe(false);

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_SERVER_HOST", "");
    expect(isDirectDevAuthEnabled()).toBe(false);
  });

  it("loads a signed-in user from the direct dev auth cookie", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_SERVER_HOST", "");
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "user-1" }),
    });
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      email: "manager@store.com",
      name: null,
      image: null,
    });

    const session = await getDirectDevAuthSession();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });
    expect(session).toMatchObject({
      user: {
        id: "user-1",
        email: "manager@store.com",
      },
    });
  });

  it("creates a persistent direct dev auth cookie for the entered email", async () => {
    const setCookieMock = vi.fn();

    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_SERVER_HOST", "");
    cookiesMock.mockResolvedValue({
      set: setCookieMock,
    });
    upsertMock.mockResolvedValue({
      id: "user-2",
      email: "manager@store.com",
      name: null,
      image: null,
    });

    const session = await createDirectDevAuthSession(" Manager@Store.com ");

    expect(upsertMock).toHaveBeenCalledWith({
      where: { email: "manager@store.com" },
      create: {
        email: "manager@store.com",
        emailVerified: expect.any(Date),
        lastLoginAt: expect.any(Date),
      },
      update: {
        emailVerified: expect.any(Date),
        lastLoginAt: expect.any(Date),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });
    expect(setCookieMock).toHaveBeenCalledWith(
      DIRECT_DEV_AUTH_COOKIE_NAME,
      "user-2",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
      }),
    );
    expect(session).toMatchObject({
      user: {
        id: "user-2",
        email: "manager@store.com",
      },
    });
  });

  it("clears the direct dev auth cookie with an explicit past expiry", async () => {
    const setCookieMock = vi.fn();

    cookiesMock.mockResolvedValue({
      set: setCookieMock,
    });

    await clearDirectDevAuthSession();

    expect(setCookieMock).toHaveBeenCalledWith(
      DIRECT_DEV_AUTH_COOKIE_NAME,
      "",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        maxAge: 0,
        expires: expect.any(Date),
      }),
    );
    expect(setCookieMock.mock.calls[0][2].expires.getTime()).toBe(0);
  });
});
