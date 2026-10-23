import { HttpStatus } from "@nestjs/common";

export const authErrors = {
  sessionRequired: {
    code: "AUTH_REQUIRED",
    status: HttpStatus.UNAUTHORIZED,
    message: "Entre com sua conta Google para votar.",
  },
  googleTokenInvalid: {
    code: "AUTH_GOOGLE_TOKEN_INVALID",
    status: HttpStatus.UNAUTHORIZED,
    message:
      "Não foi possível confirmar sua conta Google. Tente entrar novamente.",
  },
  googleEmailNotVerified: {
    code: "AUTH_GOOGLE_EMAIL_NOT_VERIFIED",
    status: HttpStatus.FORBIDDEN,
    message: "Sua conta Google precisa ter o e-mail verificado.",
  },
  googleNotConfigured: {
    code: "AUTH_GOOGLE_NOT_CONFIGURED",
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: "O login com Google ainda não está configurado.",
  },
} as const;
