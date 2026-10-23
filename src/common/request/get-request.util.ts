import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { HttpRequestLike } from "./client-ip.util";

export type RequestWithClient = HttpRequestLike & {
  clientIp?: string;
  clientIpHash?: string;
};

export function getRequest(
  context: ExecutionContext,
): RequestWithClient | null {
  if (context.getType<string>() === "graphql") {
    return GqlExecutionContext.create(context).getContext()?.req ?? null;
  }

  return context.switchToHttp().getRequest<RequestWithClient>() ?? null;
}

/** Caller identity resolved by RateLimitGuard (which always runs first). */
export interface ClientInfo {
  /** Raw IP — only forwarded to the captcha provider, never stored. */
  ip?: string;
  /** HMAC of the IP — safe to use as a storage key. */
  ipHash?: string;
}

export const Client = createParamDecorator(
  (_: unknown, context: ExecutionContext): ClientInfo => {
    const request = getRequest(context);
    return { ip: request?.clientIp, ipHash: request?.clientIpHash };
  },
);
