import { cookies } from "next/headers";

import { prisma } from "@/lib/db";

export const DIRECT_DEV_AUTH_COOKIE_NAME = "guided-pain-dev-session";

const DIRECT_DEV_AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

type DirectDevSession = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
  };
  expires: string;
};

export function isDirectDevAuthEnabled() {
  return process.env.NODE_ENV !== "production" && !process.env.EMAIL_SERVER_HOST;
}

export async function getDirectDevAuthSession(): Promise<DirectDevSession | null> {
  if (!isDirectDevAuthEnabled()) {
    return null;
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get(DIRECT_DEV_AUTH_COOKIE_NAME)?.value?.trim();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    user,
    expires: new Date(Date.now() + DIRECT_DEV_AUTH_COOKIE_OPTIONS.maxAge * 1000).toISOString(),
  };
}

export async function createDirectDevAuthSession(email: string): Promise<DirectDevSession> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  const loginTimestamp = new Date();
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      emailVerified: loginTimestamp,
      lastLoginAt: loginTimestamp,
    },
    update: {
      emailVerified: loginTimestamp,
      lastLoginAt: loginTimestamp,
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
    },
  });
  const cookieStore = await cookies();

  cookieStore.set(
    DIRECT_DEV_AUTH_COOKIE_NAME,
    user.id,
    DIRECT_DEV_AUTH_COOKIE_OPTIONS,
  );

  return {
    user,
    expires: new Date(Date.now() + DIRECT_DEV_AUTH_COOKIE_OPTIONS.maxAge * 1000).toISOString(),
  };
}

export async function clearDirectDevAuthSession() {
  const cookieStore = await cookies();

  cookieStore.set(DIRECT_DEV_AUTH_COOKIE_NAME, "", {
    ...DIRECT_DEV_AUTH_COOKIE_OPTIONS,
    maxAge: 0,
    expires: new Date(0),
  });
}
