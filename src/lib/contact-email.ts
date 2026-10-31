// Turns a validated request into one plain-text email and sends it through
// Resend. From and To come only from server env vars, never the request;
// the visitor's address goes in Reply-To when they gave an email.
import { Resend } from 'resend';
import type { ContactRequest } from './contact-schema';
import { isEmail } from './contact';

export interface OutgoingEmail {
  subject: string;
  text: string;
  replyTo?: string;
}

export type SendEmail = (email: OutgoingEmail) => Promise<void>;

export class EmailNotConfiguredError extends Error {
  constructor() {
    super('Contact email is not configured');
  }
}

export function buildEmail(request: ContactRequest): OutgoingEmail {
  const lines = [
    `Name: ${request.name}`,
    `Phone or email: ${request.contact}`,
    `Student’s age: ${request.age || '(not given)'}`,
    `Town: ${request.town}`,
    '',
    'Message:',
    request.message || '(none)',
    '',
    '—',
    'Sent from the lesson request form on the website.',
  ];
  return {
    // The schema already removed CR/LF from name; the subject stays one line.
    subject: `Lesson request from ${request.name}`,
    text: lines.join('\n'),
    replyTo: isEmail(request.contact) ? request.contact : undefined,
  };
}

type Env = Record<string, string | undefined>;

/** Runtime process.env without pulling in @types/node for one lookup. */
function runtimeEnv(): Env {
  return (globalThis as { process?: { env?: Env } }).process?.env ?? {};
}

/**
 * Sender backed by Resend. Env is read on each send because Astro inlines
 * import.meta.env at build time; these must stay runtime-only secrets.
 */
export function resendSender(getEnv: () => Env = runtimeEnv): SendEmail {
  return async (email) => {
    const env = getEnv();
    const apiKey = env.RESEND_API_KEY;
    const to = env.CONTACT_FORM_TO_EMAIL;
    const from = env.CONTACT_FORM_FROM_EMAIL;
    if (!apiKey || !to || !from) throw new EmailNotConfiguredError();

    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      subject: email.subject,
      text: email.text,
      ...(email.replyTo ? { replyTo: email.replyTo } : {}),
    });
    // Resend's error carries only a name and message about the API call, no
    // form contents, so it's safe to rethrow for the handler to log.
    if (error) throw new Error(`Resend rejected the email: ${error.name}`);
  };
}
