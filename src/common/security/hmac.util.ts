import { createHmac, timingSafeEqual } from "crypto";

/**
 * Keyed, irreversible fingerprint (Google account ids, IPs). Both live in
 * small or guessable spaces, so a plain SHA-256 could be brute-forced back;
 * the secret
 * key makes that impossible without also stealing the server config.
 */
export function hmacSha256(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}
