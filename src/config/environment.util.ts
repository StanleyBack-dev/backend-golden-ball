/**
 * Environments that run on a hosted platform (Vercel) rather than a
 * developer machine. `beta` mirrors `production` for every runtime concern —
 * schema generation, introspection, env-file loading — and differs only in the
 * data it points at (database).
 */
export function isDeployedEnv(env = process.env.NODE_ENV): boolean {
  return env === "production" || env === "beta";
}
