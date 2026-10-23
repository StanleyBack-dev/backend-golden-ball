import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppException } from "../exceptions/app-exception";
import { APP_ERRORS } from "../exceptions/app-errors.catalog";
import { hmacSha256 } from "../security/hmac.util";
import { resolveClientIp } from "../request/client-ip.util";
import { getRequest, RequestWithClient } from "../request/get-request.util";
import { RATE_LIMIT_KEY, RateLimitOptions } from "./rate-limit.decorator";
import { RateLimitService } from "./rate-limit.service";

const DEFAULT_OPTIONS: RateLimitOptions = {
  name: "default",
  configPrefix: "RATE_LIMIT_DEFAULT",
  store: "memory",
};

/**
 * Global guard: every resolver/controller is limited per client IP. Handlers
 * opt into a stricter, database-backed bucket with `@RateLimit()`. Client IPs
 * are only ever stored as HMACs.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = getRequest(context);
    if (!request) {
      return true;
    }

    const options =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_OPTIONS;

    const ipHash = this.attachClientIdentity(request);
    const ttl = this.configService.get<number>(`${options.configPrefix}_TTL`)!;
    const limit = this.configService.get<number>(
      `${options.configPrefix}_LIMIT`,
    )!;
    const key = `rl:${options.name}:${ipHash}`;

    const result =
      options.store === "database"
        ? await this.rateLimitService.hit(key, limit, ttl)
        : this.rateLimitService.hitMemory(key, limit, ttl);

    if (!result.allowed) {
      throw AppException.from(APP_ERRORS.security.tooManyRequests, {
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    return true;
  }

  private attachClientIdentity(request: RequestWithClient): string {
    if (request.clientIpHash) {
      return request.clientIpHash;
    }

    const clientIp = resolveClientIp(
      request,
      this.configService.get<string>("INTERNAL_API_SECRET"),
    );
    request.clientIp = clientIp;
    request.clientIpHash = hmacSha256(
      this.configService.get<string>("VOTER_HASH_SECRET")!,
      `ip:${clientIp}`,
    ).slice(0, 40);

    return request.clientIpHash;
  }
}
