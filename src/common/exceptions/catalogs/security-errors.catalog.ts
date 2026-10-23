import { HttpStatus } from "@nestjs/common";

export const securityErrors = {
  tooManyRequests: {
    code: "TOO_MANY_REQUESTS",
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: ({ retryAfterSeconds }: { retryAfterSeconds: number }) =>
      `Muitas tentativas. Tente novamente em ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minuto(s).`,
  },
  temporarilyBlocked: {
    code: "TEMPORARILY_BLOCKED",
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: ({ retryAfterSeconds }: { retryAfterSeconds: number }) =>
      `Muitas tentativas inválidas. Acesso bloqueado por ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minuto(s).`,
  },
  forbidden: {
    code: "FORBIDDEN",
    status: HttpStatus.FORBIDDEN,
    message: "Acesso negado.",
  },
} as const;
