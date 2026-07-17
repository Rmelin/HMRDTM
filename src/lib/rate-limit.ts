type Entry = { count: number; resetAt: number };

const attempts = new Map<string, Entry>();

export function requestIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function consumeLoginAttempt(key: string, now = Date.now()) {
  const windowMs = 15 * 60 * 1000;
  const limit = 8;
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  attempts.set(key, current);
  return {
    allowed: current.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}
