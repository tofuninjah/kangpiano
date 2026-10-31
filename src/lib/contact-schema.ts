// Server-side validation for the contact form. Field names and limits come
// from ./contact so the form markup and this schema can't drift apart.
import { z } from 'zod';
import { CONTACT_LIMITS, townOptions } from './contact';

/** The fields the endpoint accepts. Anything else in the body is ignored. */
export const CONTACT_FIELDS = [
  'name',
  'contact',
  'age',
  'town',
  'message',
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

// Control characters never belong in these fields (the message keeps its
// newlines and tabs), and line breaks in single-line fields could leak into
// email headers such as the subject. Line breaks include Unicode's line and
// paragraph separators and NEL, not just CR/LF.
const LINE_BREAKS = /\r\n|[\r\n\u0085\u2028\u2029]/g;
const CONTROL = /\p{Cc}/gu;
const CONTROL_EXCEPT_NEWLINE_TAB = /[^\P{Cc}\n\t]/gu;

const singleLine = (value: string) =>
  value
    .replace(LINE_BREAKS, ' ')
    .replace(/\t/g, ' ')
    .replace(CONTROL, '')
    .trim();
const multiLine = (value: string) =>
  value
    .replace(LINE_BREAKS, '\n')
    .replace(CONTROL_EXCEPT_NEWLINE_TAB, '')
    .trim();

const emailCheck = z.email();

export function isEmail(value: string): boolean {
  return emailCheck.safeParse(value).success;
}

/** US or international numbers: digits plus common punctuation, 7–15 digits. */
export function isPhone(value: string): boolean {
  if (!/^[0-9+().\-\s]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}

const text = (max: number, clean: (value: string) => string) =>
  z.string().transform(clean).pipe(z.string().max(max, 'That’s too long.'));

export const contactSchema = z.object({
  name: text(CONTACT_LIMITS.name, singleLine).pipe(
    z.string().min(1, 'Please enter your name.')
  ),
  contact: text(CONTACT_LIMITS.contact, singleLine)
    .pipe(z.string().min(1, 'Please enter a phone number or email.'))
    .refine(
      (value) => isEmail(value) || isPhone(value),
      'Please enter a phone number or an email address.'
    ),
  age: text(CONTACT_LIMITS.age, singleLine),
  town: text(100, singleLine).refine(
    (value) => townOptions().includes(value),
    'Please choose a town.'
  ),
  message: text(CONTACT_LIMITS.message, multiLine),
});

export type ContactRequest = z.infer<typeof contactSchema>;

export type ContactErrors = Partial<Record<ContactField, string>>;

/**
 * Validates the allowlisted fields only. Missing fields count as empty, so
 * the required-field messages apply.
 */
export function parseContact(form: {
  get(name: string): FormDataEntryValue | null;
}): { ok: true; data: ContactRequest } | { ok: false; errors: ContactErrors } {
  const input = Object.fromEntries(
    CONTACT_FIELDS.map((field) => {
      const value = form.get(field);
      return [field, typeof value === 'string' ? value : ''];
    })
  );
  const result = contactSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };

  const errors: ContactErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ContactField;
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}
