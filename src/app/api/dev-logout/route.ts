import { NextResponse } from "next/server";

import { resolveRequestOrigin } from "@/lib/auth-navigation";
import { clearDirectDevAuthSession, isDirectDevAuthEnabled } from "@/lib/direct-auth";

export async function GET(request: Request) {
  if (!isDirectDevAuthEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  await clearDirectDevAuthSession();

  return NextResponse.redirect(
    new URL("/login?reason=signed-out", resolveRequestOrigin(request)),
  );
}
