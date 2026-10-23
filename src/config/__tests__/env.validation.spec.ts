import { envValidationSchema } from "../env.validation";

const SECRET = "x".repeat(40);
const BASE = {
  FRONTEND_URL: "http://localhost:5173",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
};
const DEPLOYED = {
  ...BASE,
  NODE_ENV: "production",
  VOTER_HASH_SECRET: SECRET,
  INTERNAL_API_SECRET: SECRET,
  SESSION_SECRET: SECRET,
  TURNSTILE_SECRET_KEY: "turnstile",
  GOOGLE_CLIENT_ID: "123.apps.googleusercontent.com",
};

describe("envValidationSchema", () => {
  it("runs locally with only the database and frontend URLs", () => {
    const { error, value } = envValidationSchema.validate(BASE);
    expect(error).toBeUndefined();
    expect(value.SESSION_SECRET).toHaveLength(
      "dev-session-secret-change-me-golden-ball-2026".length,
    );
  });

  it("accepts a complete deployed configuration", () => {
    expect(envValidationSchema.validate(DEPLOYED).error).toBeUndefined();
  });

  it.each(["GOOGLE_CLIENT_ID", "SESSION_SECRET", "VOTER_HASH_SECRET"])(
    "requires %s when deployed",
    (key) => {
      const config: Record<string, string> = { ...DEPLOYED };
      delete config[key];
      expect(envValidationSchema.validate(config).error).toBeDefined();
    },
  );

  it("never accepts a short session secret", () => {
    expect(
      envValidationSchema.validate({ ...DEPLOYED, SESSION_SECRET: "short" })
        .error,
    ).toBeDefined();
  });
});
