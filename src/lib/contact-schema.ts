// Server-side validation for the contact form. Field names, limits, messages
// and the phone/email checks come from ./contact, so the form markup, the
// browser script and this schema can't drift apart. Errors are codes
// (FieldErrorCode), worded per language in FIELD_MESSAGES.
import { z } from 'zod';
import {
  CONTACT_LIMITS,
  FIELD_MESSAGES,
  LOCALE_FIELD,
  isEmail,
  isPhone,
  townOptions,
  type FieldErrorCode,
} from './contact';
import { DEFAULT_LOCALE, isLocale, type Locale } from './i18n';

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

const code = (value: FieldErrorCode) => value;

const text = (max: number, clean: (value: string) => string) =>
  z
    .string()
    .transform(clean)
    .pipe(z.string().max(max, code('tooLong')));

export const contactSchema = z.object({
  name: text(CONTACT_LIMITS.name, singleLine).pipe(
    z.string().min(1, code('name'))
  ),
  contact: text(CONTACT_LIMITS.contact, singleLine)
    .pipe(z.string().min(1, code('contact')))
    .refine((value) => isEmail(value) || isPhone(value), code('contactFormat')),
  age: text(CONTACT_LIMITS.age, singleLine),
  town: text(100, singleLine).refine(
    (value) => townOptions().includes(value),
    code('town')
  ),
  message: text(CONTACT_LIMITS.message, multiLine),
});

export type ContactRequest = z.infer<typeof contactSchema>;

export type ContactErrors = Partial<Record<ContactField, string>>;

interface FormValues {
  get(name: string): FormDataEntryValue | null;
  getAll(name: string): FormDataEntryValue[];
}

/**
 * The page's language from the hidden locale field: exactly one value, and
 * one of the known locales. Anything else is English rather than an error,
 * so a mangled field never costs Hyejeong a real request. The value only
 * ever picks from fixed lists; it's never echoed into a URL, page or email.
 */
export function parseLocale(form: FormValues): Locale {
  const values = form.getAll(LOCALE_FIELD);
  const [value] = values;
  return values.length === 1 && typeof value === 'string' && isLocale(value)
    ? value
    : DEFAULT_LOCALE;
}

/**
 * The visitor-facing wording for a schema issue. Every rule reports a
 * FieldErrorCode; anything else (a rule written with a plain message)
 * still gets a generic message, so its field is highlighted rather than
 * dropped, and no raw rule text reaches the visitor.
 */
export function fieldMessage(issue: string, locale: Locale): string {
  const messages = FIELD_MESSAGES[locale];
  return Object.hasOwn(messages, issue)
    ? messages[issue as FieldErrorCode]
    : messages.invalid;
}

/**
 * Validates the allowlisted fields only. Missing fields count as empty, so
 * the required-field messages apply. Errors are worded in `locale`.
 */
export function parseContact(
  form: FormValues,
  locale: Locale = DEFAULT_LOCALE
): { ok: true; data: ContactRequest } | { ok: false; errors: ContactErrors } {
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
    errors[field] ??= fieldMessage(issue.message, locale);
  }
  return { ok: false, errors };
}
