import { isIP } from "net";
import { safeEqual } from "../security/hmac.util";

export const INTERNAL_SECRET_HEADER = "x-internal-secret";
export const CLIENT_IP_HEADER = "x-client-ip";

export interface HttpRequestLike {
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  ip?: string;
}

function firstHeader(
  request: HttpRequestLike,
  name: string,
): string | undefined {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function hasValidInternalSecret(
  request: HttpRequestLike,
  secret: string | undefined,
): boolean {
  const provided = firstHeader(request, INTERNAL_SECRET_HEADER);
  return Boolean(secret && provided && safeEqual(provided, secret));
}

/**
 * Resolves the real end-user IP. The BFF calls this API server-to-server, so
 * the socket/x-forwarded-for IP is the BFF's own; the BFF forwards the
 * browser's IP in `x-client-ip`, which is only trusted when the request also
 * carries the shared internal secret (otherwise anyone could spoof it to dodge
 * rate limits).
 */
export function resolveClientIp(
  request: HttpRequestLike,
  internalSecret: string | undefined,
): string {
  if (hasValidInternalSecret(request, internalSecret)) {
    const forwarded = firstHeader(request, CLIENT_IP_HEADER)?.trim();
    if (forwarded && isIP(forwarded)) {
      return forwarded;
    }
  }

  // Vercel overwrites x-forwarded-for with the connecting client's IP, so the
  // first entry is trustworthy there; locally it falls back to the socket.
  const xff = firstHeader(request, "x-forwarded-for")?.split(",")[0]?.trim();
  if (xff && isIP(xff)) {
    return xff;
  }

  return request.ip || request.socket?.remoteAddress || "unknown";
}
