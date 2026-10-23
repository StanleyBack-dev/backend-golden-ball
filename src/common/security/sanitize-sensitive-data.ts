const REDACTED_VALUE = "[REDACTED]";

const SENSITIVE_KEYWORDS = [
  "password",
  "temporarypassword",
  "token",
  "authorization",
  "cookie",
  "secret",
  "apikey",
  "api_key",
  "credentials",
  "passwd",
  "jwt",
  "idtoken",
  "captcha",
] as const;

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SENSITIVE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function sanitizeString(value: string): string {
  return (
    value
      // JWTs (Google ID tokens, session tokens) outside a "bearer" prefix.
      .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, REDACTED_VALUE)
      .replace(/(bearer\s+)[a-z0-9\-._~+/]+=*/gi, `$1${REDACTED_VALUE}`)
      .replace(
        /(password|token|authorization|cookie|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi,
        (_, key: string) => `${key}=${REDACTED_VALUE}`,
      )
  );
}

function sanitizeUnknown(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (depth > 8) {
    return "[TRUNCATED]";
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (seen.has(value)) {
    return "[CIRCULAR]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item, seen, depth + 1));
  }

  const objectValue = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(objectValue)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = REDACTED_VALUE;
      continue;
    }

    sanitized[key] = sanitizeUnknown(nestedValue, seen, depth + 1);
  }

  return sanitized;
}

export function sanitizeSensitiveData<T>(value: T): T {
  return sanitizeUnknown(value, new WeakSet<object>(), 0) as T;
}
