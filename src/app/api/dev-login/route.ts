import { NextResponse } from "next/server";

import {
  normalizeCallbackPath,
  resolveRequestOrigin,
  resolveTrustedRedirectUrl,
} from "@/lib/auth-navigation";
import {
  createDirectDevAuthSession,
  isDirectDevAuthEnabled,
} from "@/lib/direct-auth";

export async function POST(request: Request) {
  if (!isDirectDevAuthEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return new NextResponse("Email is required", { status: 400 });
  }

  await createDirectDevAuthSession(email);

  const callbackPath = normalizeCallbackPath(
    String(formData.get("callbackPath") ?? "/"),
  );
  const requestOrigin = resolveRequestOrigin(request);
  const redirectUrl = resolveTrustedRedirectUrl(
    callbackPath,
    requestOrigin,
  );

  return NextResponse.redirect(redirectUrl);
}
