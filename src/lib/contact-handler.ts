// POST /api/contact. Kept apart from the route so tests can drive it with a
// fake sender and limiter. Order matters: cheap rejections (origin, type,
// size) happen before the body is parsed, and the rate limit sits right
// before the send, so typo retries don't lock a visitor out.
import { CONTACT_MESSAGES as MESSAGES, HONEYPOT_FIELD } from './contact';
import {
  buildEmail,
  EmailNotConfiguredError,
  type SendEmail,
} from './contact-email';
import { parseContact, type ContactErrors } from './contact-schema';
import type { RateLimiter } from './rate-limit';

// Every field at its maxlength, urlencoded in a non-Latin script (Hangul is
// 9 bytes per character), comes to about 21 KB; this leaves headroom.
export const MAX_BODY_BYTES = 32 * 1024;

/** No-JS posts land on one of these fixed pages; nothing in the request picks them. */
export const RESULT_PAGES = {
  sent: '/request-sent',
  notSent: '/request-not-sent',
} as const;

const FORM_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data'];

export interface ContactDeps {
  send: SendEmail;
  limiter: RateLimiter;
  /** Server-side log line. Never passed form contents. */
  log?: (message: string) => void;
}

export async function handleContact(
  request: Request,
  clientAddress: string,
  deps: ContactDeps
): Promise<Response> {
  const wantsJson = (request.headers.get('accept') ?? '').includes(
    'application/json'
  );

  // Astro's security.checkOrigin runs first; this is the second layer, and
  // it also refuses requests that send no Origin at all.
  if (!isSameOrigin(request)) return plain(403, 'Forbidden');

  const contentType = request.headers.get('content-type') ?? '';
  const mediaType = contentType.split(';')[0]!.trim().toLowerCase();
  if (!FORM_TYPES.includes(mediaType)) {
    return plain(415, 'Unsupported Media Type');
  }

  const body = await readLimited(request, MAX_BODY_BYTES);
  if (body === null) {
    return failure(wantsJson, 413, { message: MESSAGES.tooLarge });
  }

  let form: FormData;
  try {
    form = await new Response(body, {
      headers: { 'content-type': contentType },
    }).formData();
  } catch {
    return failure(wantsJson, 400, { message: MESSAGES.unreadable });
  }

  // Bots that fill the hidden field get the same answer as people, so the
  // honeypot isn't revealed, but nothing is sent.
  const honeypot = form.get(HONEYPOT_FIELD);
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return success(wantsJson);
  }

  const parsed = parseContact(form);
  if (!parsed.ok) {
    return failure(wantsJson, 400, {
      message: MESSAGES.checkFields,
      errors: parsed.errors,
    });
  }

  // Counted only for requests that would send an email: that's what the
  // limit protects, and invalid input never reaches Resend.
  const limit = deps.limiter.hit(clientAddress || 'unknown');
  if (!limit.allowed) {
    return failure(
      wantsJson,
      429,
      { message: MESSAGES.tooMany },
      { 'retry-after': String(limit.retryAfterSeconds) }
    );
  }

  try {
    await deps.send(buildEmail(parsed.data));
  } catch (error) {
    const reason =
      error instanceof EmailNotConfiguredError
        ? 'not configured'
        : error instanceof Error
          ? error.message
          : 'unknown error';
    deps.log?.(`contact: email not sent (${reason})`);
    return failure(wantsJson, 500, { message: MESSAGES.sendFailed });
  }

  return success(wantsJson);
}

// Same approach as Astro's checkOrigin: browsers send Sec-Fetch-Site, which
// pages can't forge, so trust it when present and it doesn't depend on how a
// proxy rebuilt request.url. Older browsers fall back to Origin.
function isSameOrigin(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite !== null) return fetchSite === 'same-origin';
  const origin = request.headers.get('origin');
  return origin !== null && origin === new URL(request.url).origin;
}

/** Reads the body up to `max` bytes; null if it's larger. */
async function readLimited(
  request: Request,
  max: number
): Promise<Uint8Array<ArrayBuffer> | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > max) return null;
  if (!request.body) return new Uint8Array(new ArrayBuffer(0));

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(new ArrayBuffer(size));
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

const NO_STORE = { 'cache-control': 'no-store' };

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...NO_STORE },
  });
}

function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...NO_STORE,
      ...headers,
    },
  });
}

function redirect(path: string): Response {
  return new Response(null, {
    status: 303,
    headers: { location: path, ...NO_STORE },
  });
}

function success(wantsJson: boolean): Response {
  return wantsJson ? json(200, { ok: true }) : redirect(RESULT_PAGES.sent);
}

function failure(
  wantsJson: boolean,
  status: number,
  body: { message: string; errors?: ContactErrors },
  headers: Record<string, string> = {}
): Response {
  return wantsJson
    ? json(status, { ok: false, ...body }, headers)
    : redirect(RESULT_PAGES.notSent);
}
