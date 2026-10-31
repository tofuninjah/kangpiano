// Server-side validation for the contact form. Field names, limits, messages
// and the phone/email checks come from ./contact, so the form markup, the
// browser script and this schema can't drift apart.
import { z } from 'zod';
import {
  CONTACT_LIMITS,
  FIELD_MESSAGES,
  isEmail,
  isPhone,
  townOptions,
} from './contact';

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

const text = (max: number, clean: (value: string) => string) =>
  z.string().transform(clean).pipe(z.string().max(max, FIELD_MESSAGES.tooLong));

export const contactSchema = z.object({
  name: text(CONTACT_LIMITS.name, singleLine).pipe(
    z.string().min(1, FIELD_MESSAGES.name)
  ),
  contact: text(CONTACT_LIMITS.contact, singleLine)
    .pipe(z.string().min(1, FIELD_MESSAGES.contact))
    .refine(
      (value) => isEmail(value) || isPhone(value),
      FIELD_MESSAGES.contactFormat
    ),
  age: text(CONTACT_LIMITS.age, singleLine),
  town: text(100, singleLine).refine(
    (value) => townOptions().includes(value),
    FIELD_MESSAGES.town
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
