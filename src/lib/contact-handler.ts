// POST /api/contact. Kept apart from the route so tests can drive it with a
// fake sender and limiter. Order matters: cheap rejections (origin, type,
// size) happen before the body is parsed, and the rate limit sits right
// before the send, so typo retries don't lock a visitor out.
import { CONTACT_MESSAGES, HONEYPOT_FIELD } from './contact';
import {
  buildEmail,
  EmailNotConfiguredError,
  type SendEmail,
} from './contact-email';
import {
  parseContact,
  parseLocale,
  type ContactErrors,
} from './contact-schema';
import { DEFAULT_LOCALE, type Locale } from './i18n';
import type { RateLimiter } from './rate-limit';

// Every field at its maxlength, urlencoded in a non-Latin script (Hangul is
// 9 bytes per character), comes to about 21 KB; this leaves headroom.
export const MAX_BODY_BYTES = 32 * 1024;

/**
 * No-JS posts land on one of these fixed pages. The request's locale picks
 * the row; nothing in the request becomes part of the path.
 */
export const RESULT_PAGES = {
  en: { sent: '/request-sent', notSent: '/request-not-sent' },
  ko: { sent: '/ko/request-sent', notSent: '/ko/request-not-sent' },
} as const satisfies Record<Locale, { sent: string; notSent: string }>;

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

  // Until the body is read the page's language is unknown, so these early
  // answers are English. A real form can't trigger them: the browser caps
  // every field, and it always sends a readable body.
  const early = DEFAULT_LOCALE;
  const body = await readLimited(request, MAX_BODY_BYTES);
  if (body === null) {
    return failure(wantsJson, early, 413, {
      message: CONTACT_MESSAGES[early].tooLarge,
    });
  }

  let form: FormData;
  try {
    form = await new Response(body, {
      headers: { 'content-type': contentType },
    }).formData();
  } catch {
    return failure(wantsJson, early, 400, {
      message: CONTACT_MESSAGES[early].unreadable,
    });
  }

  const locale = parseLocale(form);
  const messages = CONTACT_MESSAGES[locale];

  // Bots that fill the hidden field get the same answer as people, so the
  // honeypot isn't revealed, but nothing is sent.
  const honeypot = form.get(HONEYPOT_FIELD);
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return success(wantsJson, locale);
  }

  const parsed = parseContact(form, locale);
  if (!parsed.ok) {
    return failure(wantsJson, locale, 400, {
      message: messages.checkFields,
      errors: parsed.errors,
    });
  }

  // Counted only for requests that would send an email: that's what the
  // limit protects, and invalid input never reaches Resend.
  const limit = deps.limiter.hit(clientAddress || 'unknown');
  if (!limit.allowed) {
    return failure(
      wantsJson,
      locale,
      429,
      { message: messages.tooMany },
      { 'retry-after': String(limit.retryAfterSeconds) }
    );
  }

  try {
    await deps.send(buildEmail(parsed.data, locale));
  } catch (error) {
    const reason =
      error instanceof EmailNotConfiguredError
        ? 'not configured'
        : error instanceof Error
          ? error.message
          : 'unknown error';
    deps.log?.(`contact: email not sent (${reason})`);
    return failure(wantsJson, locale, 500, { message: messages.sendFailed });
  }

  return success(wantsJson, locale);
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

function success(wantsJson: boolean, locale: Locale): Response {
  return wantsJson
    ? json(200, { ok: true })
    : redirect(RESULT_PAGES[locale].sent);
}

function failure(
  wantsJson: boolean,
  locale: Locale,
  status: number,
  body: { message: string; errors?: ContactErrors },
  headers: Record<string, string> = {}
): Response {
  return wantsJson
    ? json(status, { ok: false, ...body }, headers)
    : redirect(RESULT_PAGES[locale].notSent);
}
