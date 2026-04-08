export function buildLoginRedirect(callbackPath: string) {
  const normalizedPath = normalizeCallbackPath(callbackPath);
  const search = new URLSearchParams({
    callbackUrl: normalizedPath,
    reason: "auth",
  });

  return `/login?${search.toString()}`;
}

export function normalizeCallbackPath(callbackPath?: string) {
  if (!callbackPath) {
    return "/";
  }

  if (callbackPath.startsWith("//")) {
    return "/";
  }

  if (callbackPath.startsWith("http://") || callbackPath.startsWith("https://")) {
    const parsed = new URL(callbackPath);
    return `${parsed.pathname || "/"}${parsed.search}`;
  }

  return callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`;
}

export function resolveLoginCallbackUrl(
  callbackPath: string | undefined,
  origin: string,
) {
  return new URL(normalizeCallbackPath(callbackPath), origin).toString();
}

function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function resolveRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedProto = getFirstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );
  const forwardedHost = getFirstHeaderValue(
    request.headers.get("x-forwarded-host"),
  );
  const host = forwardedHost || getFirstHeaderValue(request.headers.get("host"));

  if (host) {
    return `${forwardedProto || requestUrl.protocol.replace(":", "")}://${host}`;
  }

  const origin = getFirstHeaderValue(request.headers.get("origin"));

  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // Ignore malformed headers and fall through to the request URL origin.
    }
  }

  const referer = getFirstHeaderValue(request.headers.get("referer"));

  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // Ignore malformed headers and fall through to the request URL origin.
    }
  }

  return requestUrl.origin;
}

function isLoopbackOrigin(value: URL) {
  return value.hostname === "localhost" || value.hostname === "127.0.0.1";
}

export function resolveTrustedRedirectUrl(url: string, baseUrl: string) {
  if (url.startsWith("/")) {
    return new URL(url, baseUrl).toString();
  }

  const targetUrl = new URL(url);
  const base = new URL(baseUrl);

  if (targetUrl.origin === base.origin) {
    return url;
  }

  if (
    isLoopbackOrigin(targetUrl) &&
    isLoopbackOrigin(base) &&
    targetUrl.port === base.port &&
    targetUrl.protocol === base.protocol
  ) {
    return url;
  }

  return baseUrl;
}

export function rewriteVerificationUrlToCallbackOrigin(verificationUrl: string) {
  const rewrittenUrl = new URL(verificationUrl);
  const callbackUrl = rewrittenUrl.searchParams.get("callbackUrl");

  if (!callbackUrl) {
    return verificationUrl;
  }

  const resolvedCallbackUrl = new URL(callbackUrl, rewrittenUrl.origin).toString();
  const trustedCallbackUrl = resolveTrustedRedirectUrl(
    resolvedCallbackUrl,
    rewrittenUrl.origin,
  );

  if (trustedCallbackUrl !== resolvedCallbackUrl) {
    return verificationUrl;
  }

  const callbackOrigin = new URL(resolvedCallbackUrl).origin;
  rewrittenUrl.protocol = new URL(callbackOrigin).protocol;
  rewrittenUrl.host = new URL(callbackOrigin).host;
  return rewrittenUrl.toString();
}
