import * as Joi from "joi";

const isDeployed = Joi.valid("production", "beta");

// Secrets that must be explicitly set (never defaulted) once deployed.
// An empty value (e.g. copied straight from .env.example) counts as unset.
const deployedSecret = (devDefault: string) =>
  Joi.string()
    .empty("")
    .min(32)
    .when("NODE_ENV", {
      is: isDeployed,
      then: Joi.required(),
      otherwise: Joi.string().empty("").min(32).default(devDefault),
    });

export const envValidationSchema = Joi.object({
  // === APP CONFIGS GERAIS ===
  NODE_ENV: Joi.string()
    .valid("development", "beta", "production", "test")
    .default("development"),
  PORT: Joi.number().default(4000),
  FRONTEND_URL: Joi.string().uri().required(),
  FRONTEND_URL_WWW: Joi.string().uri().optional(),

  // === DATABASE (Neon / Postgres) ===
  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgres", "postgresql"] })
    .required(),
  DB_SSL: Joi.boolean().truthy("true").falsy("false").default(true),
  DB_MIGRATIONS_RUN: Joi.boolean().truthy("true").falsy("false").default(true),
  TYPEORM_LOGGING: Joi.boolean().truthy("true").falsy("false").default(false),

  // === SEGURANÇA ===
  // Pepper for the HMAC that turns Google account ids and IPs into
  // irreversible hashes.
  // Rotating it invalidates the "already voted" registry — never change it
  // once the poll is live.
  VOTER_HASH_SECRET: deployedSecret(
    "dev-voter-hash-secret-change-me-golden-ball-2026",
  ),
  // Shared secret between the BFF and this API. When set, every /graphql
  // request must carry it, and only then is the forwarded client IP trusted.
  INTERNAL_API_SECRET: deployedSecret(
    "dev-internal-api-secret-change-me-golden-ball-2026",
  ),
  // Signs voter sessions (JWT kept by the BFF in an httpOnly cookie).
  // Rotating it only signs everyone out.
  SESSION_SECRET: deployedSecret(
    "dev-session-secret-change-me-golden-ball-2026",
  ),
  SESSION_TTL_SECONDS: Joi.number().integer().min(300).default(86400),

  // === CAPTCHA (Cloudflare Turnstile) ===
  TURNSTILE_SECRET_KEY: Joi.string().when("NODE_ENV", {
    is: isDeployed,
    then: Joi.required(),
    otherwise: Joi.optional().allow(""),
  }),

  // === LOGIN COM GOOGLE ===
  // Google Cloud Console → Credentials → OAuth 2.0 Client ID (Web).
  GOOGLE_CLIENT_ID: Joi.string().when("NODE_ENV", {
    is: isDeployed,
    then: Joi.required(),
    otherwise: Joi.optional().allow(""),
  }),

  // === VOTAÇÃO ===
  VOTING_OPEN: Joi.boolean().truthy("true").falsy("false").default(true),
  // Poll closing: 17h Brasília time on the Ballon d'Or ceremony day
  // (26/10/2026), a single instant for every state. Must carry an explicit
  // UTC offset: without one it would be read in the server's own zone (UTC
  // on Vercel) and close 3 hours early. (Not `.isoDate()`: it normalizes the value
  // before the offset could be checked.)
  VOTING_CLOSES_AT: Joi.string()
    .pattern(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
      "ISO 8601 com fuso (ex.: 2026-10-26T17:00:00-03:00)",
    )
    .custom((value: string, helpers) =>
      Number.isNaN(Date.parse(value)) ? helpers.error("any.invalid") : value,
    )
    .default("2026-10-26T17:00:00-03:00"),
  RESULTS_CACHE_TTL_SECONDS: Joi.number().integer().min(0).default(10),

  // === RATE LIMIT ===
  RATE_LIMIT_DEFAULT_TTL: Joi.number().integer().min(1).default(60),
  RATE_LIMIT_DEFAULT_LIMIT: Joi.number().integer().min(1).default(120),
  RATE_LIMIT_VOTE_TTL: Joi.number().integer().min(1).default(600),
  RATE_LIMIT_VOTE_LIMIT: Joi.number().integer().min(1).default(10),
});
