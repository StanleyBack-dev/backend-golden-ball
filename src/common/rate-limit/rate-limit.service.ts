import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";

export interface RateLimitResult {
  allowed: boolean;
  hits: number;
  retryAfterSeconds: number;
}

interface MemoryBucket {
  hits: number;
  expiresAt: number;
}

const MEMORY_MAX_KEYS = 50_000;
const CLEANUP_PROBABILITY = 0.01;

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly memory = new Map<string, MemoryBucket>();

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Fixed-window counter stored in Postgres, so the limit holds across every
   * serverless instance. One atomic upsert per call — no read-modify-write
   * race between concurrent requests.
   */
  async hit(
    key: string,
    limit: number,
    ttlSeconds: number,
  ): Promise<RateLimitResult> {
    const rows: Array<{ hits: number; retry_after: string }> =
      await this.dataSource.query(
        `
        INSERT INTO "tb_rate_limits" ("key", "hits", "expires_at")
        VALUES ($1, 1, now() + make_interval(secs => $2))
        ON CONFLICT ("key") DO UPDATE SET
          "hits" = CASE WHEN "tb_rate_limits"."expires_at" <= now()
            THEN 1 ELSE "tb_rate_limits"."hits" + 1 END,
          "expires_at" = CASE WHEN "tb_rate_limits"."expires_at" <= now()
            THEN now() + make_interval(secs => $2)
            ELSE "tb_rate_limits"."expires_at" END
        RETURNING "hits",
          CEIL(EXTRACT(EPOCH FROM ("expires_at" - now()))) AS retry_after
        `,
        [key, ttlSeconds],
      );

    this.maybeCleanup();

    const { hits, retry_after } = rows[0];
    return {
      allowed: hits <= limit,
      hits,
      retryAfterSeconds: Math.max(1, Number(retry_after)),
    };
  }

  /** Seconds left on a lockout, or null when the key is not locked. */
  async blockedFor(key: string, limit: number): Promise<number | null> {
    const rows: Array<{ retry_after: string }> = await this.dataSource.query(
      `
      SELECT CEIL(EXTRACT(EPOCH FROM ("expires_at" - now()))) AS retry_after
      FROM "tb_rate_limits"
      WHERE "key" = $1 AND "expires_at" > now() AND "hits" >= $2
      `,
      [key, limit],
    );

    return rows.length ? Math.max(1, Number(rows[0].retry_after)) : null;
  }

  async reset(key: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM "tb_rate_limits" WHERE "key" = $1`,
      [key],
    );
  }

  /**
   * Per-instance counter for cheap, high-frequency reads (results polling).
   * Not shared across instances, which is acceptable for read-only traffic.
   */
  hitMemory(key: string, limit: number, ttlSeconds: number): RateLimitResult {
    const now = Date.now();
    const bucket = this.memory.get(key);

    if (!bucket || bucket.expiresAt <= now) {
      if (this.memory.size >= MEMORY_MAX_KEYS) {
        this.evictExpiredMemory(now);
      }
      this.memory.set(key, { hits: 1, expiresAt: now + ttlSeconds * 1000 });
      return { allowed: true, hits: 1, retryAfterSeconds: ttlSeconds };
    }

    bucket.hits += 1;
    return {
      allowed: bucket.hits <= limit,
      hits: bucket.hits,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((bucket.expiresAt - now) / 1000),
      ),
    };
  }

  private evictExpiredMemory(now: number) {
    for (const [key, bucket] of this.memory) {
      if (bucket.expiresAt <= now) {
        this.memory.delete(key);
      }
    }

    // Still full (flood of distinct keys): drop everything rather than grow
    // without bound.
    if (this.memory.size >= MEMORY_MAX_KEYS) {
      this.memory.clear();
    }
  }

  private maybeCleanup() {
    if (Math.random() >= CLEANUP_PROBABILITY) {
      return;
    }

    this.dataSource
      .query(
        `DELETE FROM "tb_rate_limits" WHERE "expires_at" < now() - interval '1 hour'`,
      )
      .catch((error: Error) =>
        this.logger.warn(`Rate limit cleanup failed: ${error.message}`),
      );
  }
}
