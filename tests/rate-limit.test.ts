import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../src/lib/rate-limit';

describe('createRateLimiter', () => {
  it('allows up to the limit per key, then blocks until the window resets', () => {
    let now = 0;
    const limiter = createRateLimiter({
      limit: 2,
      windowMs: 1000,
      now: () => now,
    });

    expect(limiter.hit('a').allowed).toBe(true);
    expect(limiter.hit('a').allowed).toBe(true);
    const blocked = limiter.hit('a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);

    expect(limiter.hit('b').allowed).toBe(true);

    now = 1000;
    expect(limiter.hit('a').allowed).toBe(true);
  });

  it('keeps memory bounded when many keys arrive', () => {
    let now = 0;
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      maxKeys: 3,
      now: () => now,
    });
    for (const key of ['a', 'b', 'c', 'd']) limiter.hit(key);
    // 'a' was evicted to make room, so it gets a fresh window.
    expect(limiter.hit('a').allowed).toBe(true);
    // 'd' is still tracked and over its limit.
    expect(limiter.hit('d').allowed).toBe(false);
    now = 60_000;
    expect(limiter.hit('d').allowed).toBe(true);
  });
});
