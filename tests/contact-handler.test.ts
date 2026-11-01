import { describe, expect, it, vi } from 'vitest';
import {
  CONTACT_LIMITS,
  CONTACT_MESSAGES,
  FIELD_MESSAGES,
} from '../src/lib/contact';
import {
  EmailNotConfiguredError,
  type OutgoingEmail,
} from '../src/lib/contact-email';
import {
  handleContact,
  MAX_BODY_BYTES,
  RESULT_PAGES,
} from '../src/lib/contact-handler';
import { createRateLimiter } from '../src/lib/rate-limit';

const ORIGIN = 'https://kangpiano.test';

const valid = {
  name: 'Test Parent',
  contact: 'parent@example.com',
  age: '7',
  town: 'Kapolei',
  message: 'Hello',
};

function post(
  fields: Record<string, string>,
  {
    origin = ORIGIN as string | null,
    accept = 'application/json',
    contentType = 'application/x-www-form-urlencoded',
    body = new URLSearchParams(fields).toString() as BodyInit,
  } = {}
) {
  const headers = new Headers({ accept, 'content-type': contentType });
  if (origin) headers.set('origin', origin);
  return new Request(`${ORIGIN}/api/contact`, {
    method: 'POST',
    headers,
    body,
    // Needed for stream bodies in Node's fetch.
    duplex: 'half',
  } as RequestInit);
}

function setup(send = vi.fn(async (_email: OutgoingEmail) => {})) {
  const log = vi.fn();
  const deps = {
    send,
    log,
    limiter: createRateLimiter({ limit: 5, windowMs: 60_000 }),
  };
  return {
    send,
    log,
    run: (request: Request, ip = '203.0.113.7') =>
      handleContact(request, ip, deps),
  };
}

describe('POST /api/contact', () => {
  it('sends one email and answers JSON for the script', async () => {
    const { send, run } = setup();
    const response = await run(post(valid));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0]).toMatchObject({
      subject: 'Lesson request from Test Parent',
      replyTo: 'parent@example.com',
    });
  });

  it('accepts multipart bodies, which the script sends', async () => {
    const { send, run } = setup();
    const body = new FormData();
    for (const [key, value] of Object.entries(valid)) body.set(key, value);
    const request = new Request(`${ORIGIN}/api/contact`, {
      method: 'POST',
      headers: { origin: ORIGIN, accept: 'application/json' },
      body,
    });
    expect((await run(request)).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('redirects no-JS posts to fixed result pages', async () => {
    const { run } = setup();
    const sent = await run(post(valid, { accept: 'text/html' }));
    expect(sent.status).toBe(303);
    expect(sent.headers.get('location')).toBe(RESULT_PAGES.en.sent);

    const notSent = await run(
      post({ ...valid, contact: 'nope' }, { accept: 'text/html' })
    );
    expect(notSent.status).toBe(303);
    expect(notSent.headers.get('location')).toBe(RESULT_PAGES.en.notSent);
  });

  it('rejects other origins and requests without one', async () => {
    const { send, run } = setup();
    expect(
      (await run(post(valid, { origin: 'https://evil.test' }))).status
    ).toBe(403);
    expect((await run(post(valid, { origin: null }))).status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it('accepts only form encodings', async () => {
    const { send, run } = setup();
    const response = await run(
      post(valid, {
        contentType: 'application/json',
        body: JSON.stringify(valid),
      })
    );
    expect(response.status).toBe(415);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses bodies over the size cap, declared or streamed', async () => {
    const { send, run } = setup();
    const big = 'x'.repeat(MAX_BODY_BYTES + 1);

    // Declared: Node's Request doesn't set Content-Length, so set it here.
    const declared = post({ ...valid, message: big });
    const withLength = new Request(declared, {
      headers: new Headers([
        ...declared.headers,
        ['content-length', String(MAX_BODY_BYTES + 100)],
      ]),
    });
    const declaredResponse = await run(withLength);
    expect(declaredResponse.status).toBe(413);
    expect((await declaredResponse.json()).message).toBe(
      CONTACT_MESSAGES.en.tooLarge
    );

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`message=${big}`));
        controller.close();
      },
    });
    expect((await run(post(valid, { body: stream }))).status).toBe(413);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends oversized no-JS posts to the not-sent page, not a bare 413', async () => {
    const { run } = setup();
    const response = await run(
      post(
        { ...valid, message: 'x'.repeat(MAX_BODY_BYTES + 1) },
        { accept: 'text/html' }
      )
    );
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(RESULT_PAGES.en.notSent);
  });

  it('fits every field at its maxlength in Hangul under the cap', async () => {
    const { send, run } = setup();
    const response = await run(
      post({
        name: '가'.repeat(CONTACT_LIMITS.name),
        contact: 'parent@example.com',
        age: '가'.repeat(CONTACT_LIMITS.age),
        town: 'Mililani',
        message: '가'.repeat(CONTACT_LIMITS.message),
        locale: 'ko',
      })
    );
    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('answers a filled honeypot like a success but sends nothing', async () => {
    const { send, run } = setup();
    const json = await run(post({ ...valid, website: 'https://spam.test' }));
    expect(json.status).toBe(200);
    expect(await json.json()).toEqual({ ok: true });

    const page = await run(
      post({ ...valid, website: 'x' }, { accept: 'text/html' })
    );
    expect(page.headers.get('location')).toBe(RESULT_PAGES.en.sent);
    expect(send).not.toHaveBeenCalled();
  });

  it('returns field errors for invalid input', async () => {
    const { send, run } = setup();
    const response = await run(
      post({ ...valid, contact: 'hello', town: 'Honolulu' })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe(CONTACT_MESSAGES.en.checkFields);
    expect(Object.keys(body.errors).sort()).toEqual(['contact', 'town']);
    expect(send).not.toHaveBeenCalled();
  });

  it('never lets extra fields reach the email', async () => {
    const { send, run } = setup();
    await run(
      post({ ...valid, to: 'evil@example.com', from: 'x@y.z', subject: 'Win' })
    );
    const email = send.mock.calls[0]![0];
    expect(JSON.stringify(email)).not.toMatch(/evil@example\.com|x@y\.z|Win/);
  });

  it('rate-limits each IP after five requests', async () => {
    const { run } = setup();
    for (let i = 0; i < 5; i += 1) {
      expect((await run(post(valid))).status).toBe(200);
    }
    const blocked = await run(post(valid));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await blocked.json()).message).toBe(CONTACT_MESSAGES.en.tooMany);

    expect((await run(post(valid), '198.51.100.9')).status).toBe(200);
  });

  it('does not count invalid attempts against the rate limit', async () => {
    const { run } = setup();
    for (let i = 0; i < 8; i += 1) {
      expect((await run(post({ ...valid, contact: 'typo' }))).status).toBe(400);
    }
    expect((await run(post(valid))).status).toBe(200);
  });

  it('trusts Sec-Fetch-Site over a rebuilt request URL', async () => {
    const { send, run } = setup();
    // Behind a proxy request.url may not match the public origin; the
    // browser's Sec-Fetch-Site still says whether the post is same-origin.
    const behindProxy = (fetchSite: string) =>
      new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: {
          origin: ORIGIN,
          'sec-fetch-site': fetchSite,
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(valid).toString(),
      });
    expect((await run(behindProxy('same-origin'))).status).toBe(200);
    expect((await run(behindProxy('cross-site'))).status).toBe(403);
    expect((await run(behindProxy('same-site'))).status).toBe(403);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('fails closed with a generic message and logs no form contents', async () => {
    const { log, run } = setup(
      vi.fn(async () => {
        throw new Error('Resend rejected the email: rate_limit_exceeded');
      })
    );
    const response = await run(post(valid));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      message: CONTACT_MESSAGES.en.sendFailed,
    });
    expect(log).toHaveBeenCalledTimes(1);
    const line = log.mock.calls[0]![0] as string;
    expect(line).toContain('rate_limit_exceeded');
    for (const value of Object.values(valid)) expect(line).not.toContain(value);
  });

  it('reports a missing email setup as such in the log only', async () => {
    const { log, run } = setup(
      vi.fn(async () => {
        throw new EmailNotConfiguredError();
      })
    );
    const response = await run(post(valid));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('configured');
    expect(log.mock.calls[0]![0]).toContain('not configured');
  });
});

describe('POST /api/contact from the Korean page', () => {
  const korean = { ...valid, locale: 'ko' };

  it('tags the email so Hyejeong replies in Korean', async () => {
    const { send, run } = setup();
    expect((await run(post(korean))).status).toBe(200);
    const email = send.mock.calls[0]![0];
    expect(email.subject).toBe('[한국어] Lesson request from Test Parent');
    expect(email.text).toContain('Reply in Korean.');
  });

  it('lands no-JS posts on the Korean result pages', async () => {
    const { run } = setup();
    const sent = await run(post(korean, { accept: 'text/html' }));
    expect(sent.headers.get('location')).toBe(RESULT_PAGES.ko.sent);
    const notSent = await run(
      post({ ...korean, contact: 'nope' }, { accept: 'text/html' })
    );
    expect(notSent.headers.get('location')).toBe(RESULT_PAGES.ko.notSent);
  });

  it('words the message and field errors in Korean', async () => {
    const { run } = setup();
    const response = await run(
      post({ ...korean, contact: 'hello', town: 'Honolulu' })
    );
    expect(await response.json()).toEqual({
      ok: false,
      message: CONTACT_MESSAGES.ko.checkFields,
      errors: {
        contact: FIELD_MESSAGES.ko.contactFormat,
        town: FIELD_MESSAGES.ko.town,
      },
    });
  });

  it('words rate-limit and send failures in Korean', async () => {
    const { run } = setup(
      vi.fn(async () => {
        throw new Error('Resend rejected the email: x');
      })
    );
    expect((await (await run(post(korean))).json()).message).toBe(
      CONTACT_MESSAGES.ko.sendFailed
    );
    for (let i = 0; i < 4; i += 1) await run(post(korean));
    expect((await (await run(post(korean))).json()).message).toBe(
      CONTACT_MESSAGES.ko.tooMany
    );
  });

  it('treats any other locale value as English and never echoes it', async () => {
    const repeated = new URLSearchParams(valid);
    repeated.append('locale', 'ko');
    repeated.append('locale', 'ko');
    const bodies = [
      ...[
        'https://evil.test/',
        '//evil.test',
        'KO',
        ' ko',
        'ko\r\nX: y',
        'fr',
        '',
      ].map((locale) => new URLSearchParams({ ...valid, locale }).toString()),
      repeated.toString(),
    ];
    for (const body of bodies) {
      const { send, run } = setup();
      const response = await run(post({}, { accept: 'text/html', body }));
      expect(response.headers.get('location'), body).toBe(RESULT_PAGES.en.sent);
      const email = send.mock.calls[0]![0];
      expect(email.subject, body).toBe('Lesson request from Test Parent');
      expect(JSON.stringify(email), body).not.toMatch(/evil|X: y/);
    }
  });
});
