import { AppErrorDefinition } from "./app-error-definition.type";
import { authErrors } from "./catalogs/auth-errors.catalog";
import { securityErrors } from "./catalogs/security-errors.catalog";
import { votesErrors } from "./catalogs/votes-errors.catalog";

export const APP_ERRORS = {
  auth: authErrors,
  security: securityErrors,
  votes: votesErrors,
} as const satisfies Record<string, Record<string, AppErrorDefinition<never>>>;
