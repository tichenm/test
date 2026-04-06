import { describe, expect, it } from "vitest";

import {
  buildLoginRedirect,
  normalizeCallbackPath,
  resolveLoginCallbackUrl,
  resolveTrustedRedirectUrl,
  rewriteVerificationUrlToCallbackOrigin,
} from "@/lib/auth-navigation";

describe("auth navigation", () => {
  it("preserves the protected path when redirecting to login", () => {
    expect(buildLoginRedirect("/history")).toBe(
      "/login?callbackUrl=%2Fhistory&reason=auth",
    );
    expect(buildLoginRedirect("/history/abc123")).toBe(
      "/login?callbackUrl=%2Fhistory%2Fabc123&reason=auth",
    );
  });

  it("normalizes absolute and relative callback paths", () => {
    expect(normalizeCallbackPath("/history")).toBe("/history");
    expect(normalizeCallbackPath("history")).toBe("/history");
    expect(normalizeCallbackPath("http://localhost:3000/history")).toBe("/history");
    expect(normalizeCallbackPath(undefined)).toBe("/");
  });

  it("resolves callback URLs against the current browser origin", () => {
    expect(
      resolveLoginCallbackUrl("/history", "http://127.0.0.1:3000"),
    ).toBe("http://127.0.0.1:3000/history");
    expect(
      resolveLoginCallbackUrl(undefined, "http://127.0.0.1:3000"),
    ).toBe("http://127.0.0.1:3000/");
  });

  it("rewrites verification links to the callback origin when hosts differ", () => {
    expect(
      rewriteVerificationUrlToCallbackOrigin(
        "http://localhost:3000/api/auth/callback/email?callbackUrl=http%3A%2F%2F127.0.0.1%3A3000%2Fhistory&token=abc&email=test%40store.com",
      ),
    ).toBe(
      "http://127.0.0.1:3000/api/auth/callback/email?callbackUrl=http%3A%2F%2F127.0.0.1%3A3000%2Fhistory&token=abc&email=test%40store.com",
    );
  });

  it("allows localhost and 127.0.0.1 to redirect to each other during local development", () => {
    expect(
      resolveTrustedRedirectUrl(
        "http://127.0.0.1:3000/history",
        "http://localhost:3000",
      ),
    ).toBe("http://127.0.0.1:3000/history");

    expect(
      resolveTrustedRedirectUrl(
        "http://example.com/history",
        "http://localhost:3000",
      ),
    ).toBe("http://localhost:3000");
  });
});
