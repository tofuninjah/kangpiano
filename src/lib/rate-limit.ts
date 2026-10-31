// Fixed-window, per-key rate limit kept in memory. Each serverless instance
// has its own counts, so this slows down a single noisy client rather than
// guaranteeing a global limit; that is enough for a low-traffic contact form
// and avoids running a separate store. Swap in Upstash if abuse appears.

export interface RateLimiter {
  /** Records a hit; returns whether it's allowed and when the window resets. */
  hit(key: string): { allowed: boolean; retryAfterSeconds: number };
}

interface Window {
  count: number;
  resetAt: number;
}

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 5000,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  /** Caps memory if many distinct clients arrive within one window. */
  maxKeys?: number;
  now?: () => number;
}): RateLimiter {
  const windows = new Map<string, Window>();

  function prune(at: number) {
    for (const [key, window] of windows) {
      if (window.resetAt <= at) windows.delete(key);
    }
    // Still full of live windows: drop the oldest entries (Map keeps
    // insertion order). Failing open here only loosens the limit.
    while (windows.size >= maxKeys) {
      const oldest = windows.keys().next().value;
      if (oldest === undefined) break;
      windows.delete(oldest);
    }
  }

  return {
    hit(key) {
      const at = now();
      let window = windows.get(key);
      if (!window || window.resetAt <= at) {
        if (windows.size >= maxKeys) prune(at);
        window = { count: 0, resetAt: at + windowMs };
        windows.set(key, window);
      }
      window.count += 1;
      return {
        allowed: window.count <= limit,
        retryAfterSeconds: Math.ceil((window.resetAt - at) / 1000),
      };
    },
  };
}
