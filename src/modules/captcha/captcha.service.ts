import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Cloudflare Turnstile (free) bot check. Required when deployed (enforced by
 * env validation); skipped locally when TURNSTILE_SECRET_KEY is empty.
 */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  constructor(private readonly configService: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.configService.get<string>("TURNSTILE_SECRET_KEY"));
  }

  async verify(token: string | undefined, remoteIp?: string): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    if (!token) {
      return false;
    }

    const body = new URLSearchParams({
      secret: this.configService.get<string>("TURNSTILE_SECRET_KEY")!,
      response: token,
      ...(remoteIp && remoteIp !== "unknown" ? { remoteip: remoteIp } : {}),
    });

    try {
      const response = await fetch(TURNSTILE_VERIFY_URL, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(5000),
      });
      const result = (await response.json()) as { success?: boolean };
      return result.success === true;
    } catch (error) {
      this.logger.error(
        `Turnstile verification failed: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
