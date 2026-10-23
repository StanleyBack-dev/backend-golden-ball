import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_KEY = "rateLimit";

export interface RateLimitOptions {
  /** Bucket name; requests are counted per (name, client IP). */
  name: string;
  /** Env var prefix holding `<PREFIX>_TTL` / `<PREFIX>_LIMIT`. */
  configPrefix: string;
  /** `database` is shared across instances; `memory` is per instance. */
  store: "database" | "memory";
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
