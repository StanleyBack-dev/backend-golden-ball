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

const NODE_ENV = Joi.string()
  .valid("development", "beta", "production", "test")
  .default("development");

// === DATABASE (Neon / Postgres) ===
const databaseEnv = {
  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgres", "postgresql"] })
    .required(),
  DB_SSL: Joi.boolean().truthy("true").falsy("false").default(true),
  DB_MIGRATIONS_RUN: Joi.boolean().truthy("true").falsy("false").default(true),
  TYPEORM_LOGGING: Joi.boolean().truthy("true").falsy("false").default(false),
};

// === ESTATÍSTICAS DOS INDICADOS (Highlightly via RapidAPI) ===
const playerStatsEnv = {
  // Club season the Ballon d'Or covers, as the provider names it.
  PLAYER_STATS_CLUB_SEASON: Joi.string().max(10).default("25/26"),
  // National-team tournament of the same cycle (2026 World Cup).
  PLAYER_STATS_NATIONAL_LEAGUE_ID: Joi.number().integer().min(0).default(1635),
  PLAYER_STATS_NATIONAL_SEASON: Joi.string().max(10).default("2026"),
  // The Ballon d'Or window (club season + World Cup) is over: once fully
  // synced, the stats are final and the daily job stops calling the API.
  PLAYER_STATS_WINDOW_CLOSED: Joi.boolean()
    .truthy("true")
    .falsy("false")
    .default(true),
  // Requests one sync run may spend (free plan: 100 a day).
  PLAYER_STATS_REQUEST_BUDGET: Joi.number().integer().min(1).default(90),
};

export const envValidationSchema = Joi.object({
  // === APP CONFIGS GERAIS ===
  NODE_ENV,
  PORT: Joi.number().default(4000),
  FRONTEND_URL: Joi.string().uri().required(),
  FRONTEND_URL_WWW: Joi.string().uri().optional(),

  ...databaseEnv,
  ...playerStatsEnv,

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
  // (26/10/2026), a single instant nationwide. Must carry an explicit
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

/**
 * The daily stats sync job (GitHub Actions) only touches the database and
 * the stats provider, so it needs none of the API's secrets.
 */
export const statsSyncEnvValidationSchema = Joi.object({
  NODE_ENV,
  ...databaseEnv,
  ...playerStatsEnv,
  HIGHLIGHTLY_API_KEY: Joi.string().min(20).required(),
});
