import { describe, expect, it } from "vitest";

import {
  buildLoginRedirect,
  normalizeCallbackPath,
  resolveRequestOrigin,
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
    expect(buildLoginRedirect("/history/export?status=completed&railKey=warehouse-receiving")).toBe(
      "/login?callbackUrl=%2Fhistory%2Fexport%3Fstatus%3Dcompleted%26railKey%3Dwarehouse-receiving&reason=auth",
    );
  });

  it("normalizes absolute and relative callback paths", () => {
    expect(normalizeCallbackPath("/history")).toBe("/history");
    expect(normalizeCallbackPath("history")).toBe("/history");
    expect(normalizeCallbackPath("http://localhost:3000/history")).toBe("/history");
    expect(normalizeCallbackPath("http://localhost:3000/history/export?status=completed")).toBe(
      "/history/export?status=completed",
    );
    expect(normalizeCallbackPath("//evil.com/path")).toBe("/");
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

  it("prefers forwarded or host headers when reconstructing the request origin", () => {
    expect(
      resolveRequestOrigin(
        new Request("http://localhost:3000/api/dev-login", {
          headers: {
            host: "127.0.0.1:3000",
          },
        }),
      ),
    ).toBe("http://127.0.0.1:3000");

    expect(
      resolveRequestOrigin(
        new Request("http://localhost:3000/api/dev-login", {
          headers: {
            "x-forwarded-proto": "https",
            "x-forwarded-host": "demo.example.com",
          },
        }),
      ),
    ).toBe("https://demo.example.com");
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

  it("refuses to rewrite verification links to untrusted callback origins", () => {
    expect(
      rewriteVerificationUrlToCallbackOrigin(
        "http://localhost:3000/api/auth/callback/email?callbackUrl=https%3A%2F%2Fevil.example%2Fhistory&token=abc&email=test%40store.com",
      ),
    ).toBe(
      "http://localhost:3000/api/auth/callback/email?callbackUrl=https%3A%2F%2Fevil.example%2Fhistory&token=abc&email=test%40store.com",
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
