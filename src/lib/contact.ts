// Contact form fields and messages, shared by the form markup, its browser
// script and the server. No server-only imports here: the script bundles it,
// so the messages live here rather than in the larger copy files.
import { site } from '../data/site';
import { DEFAULT_LOCALE, type Locale } from './i18n';
import { allTowns } from './schedule';

/** Every message a visitor can see about their request. */
export interface ContactMessages {
  success: string;
  checkFields: string;
  tooLarge: string;
  unreadable: string;
  tooMany: string;
  sendFailed: string;
  offline: string;
  /** The submit button's label while a request is in flight. */
  sending: string;
}

const phone = site.phone.display;
// Korean "to/by" is 로 after a vowel or ㄹ and 으로 after other consonants;
// read aloud, numbers ending in 0, 3 or 6 (영, 삼, 육) take 으로.
const phoneRo = `${phone}${/[036]$/.test(phone) ? '으로' : '로'}`;

export const CONTACT_MESSAGES: Record<Locale, ContactMessages> = {
  en: {
    success: `Thank you! Your request is on its way, and I’ll get back to you soon. If it’s urgent, call ${phone}.`,
    checkFields: 'Please check the highlighted fields.',
    tooLarge: `That message is too long to send. Please shorten it, or call ${phone}.`,
    unreadable: `That request couldn’t be read. Please try again, or call ${phone}.`,
    tooMany: `Too many requests from this device. Please wait a few minutes, or call ${phone}.`,
    sendFailed: `Sorry, your request didn’t go through. Please call ${phone}.`,
    offline: `Couldn’t reach the server. Check your connection, or call ${phone}.`,
    sending: 'Sending…',
  },
  ko: {
    success: `감사합니다! 신청이 접수되었습니다. 곧 연락드리겠습니다. 급하시면 ${phoneRo} 전화 주세요.`,
    checkFields: '표시된 항목을 확인해 주세요.',
    tooLarge: `내용이 너무 길어 보낼 수 없습니다. 줄여 주시거나 ${phoneRo} 전화 주세요.`,
    unreadable: `신청을 처리하지 못했습니다. 다시 시도하시거나 ${phoneRo} 전화 주세요.`,
    tooMany: `짧은 시간에 신청이 너무 많았습니다. 몇 분 뒤에 다시 시도하시거나 ${phoneRo} 전화 주세요.`,
    sendFailed: `죄송합니다. 신청이 전송되지 않았습니다. ${phoneRo} 전화 주세요.`,
    offline: `서버에 연결할 수 없습니다. 인터넷 연결을 확인하시거나 ${phoneRo} 전화 주세요.`,
    sending: '보내는 중…',
  },
};

/**
 * Why a field was rejected. The schema reports these codes and fieldError
 * returns their wording; each language words them in FIELD_MESSAGES.
 */
export type FieldErrorCode =
  'name' | 'contact' | 'contactFormat' | 'town' | 'tooLong';

/** What a visitor reads under a field they got wrong, per language. */
export const FIELD_MESSAGES: Record<Locale, Record<FieldErrorCode, string>> = {
  en: {
    name: 'Please enter your name.',
    contact: 'Please enter a phone number or email.',
    contactFormat: 'Please enter a phone number or an email address.',
    town: 'Please choose a town.',
    tooLong: 'That’s too long.',
  },
  ko: {
    name: '이름을 입력해 주세요.',
    contact: '전화번호나 이메일을 입력해 주세요.',
    contactFormat: '올바른 전화번호나 이메일 주소를 입력해 주세요.',
    town: '지역을 선택해 주세요.',
    tooLong: '글자 수가 너무 많습니다. 조금 줄여 주세요.',
  },
};

/**
 * Hidden field naming the page's language. It only picks the language of
 * the reply, the result page and the email tag, from fixed lists.
 */
export const LOCALE_FIELD = 'locale';

export const OTHER_TOWN = 'Somewhere else';

/** Max lengths, enforced in the browser by maxlength and again on the server. */
export const CONTACT_LIMITS = {
  name: 100,
  contact: 120,
  age: 20,
  message: 2000,
} as const;

/** Emails sent per IP per window, per server instance (see rate-limit.ts). */
export const CONTACT_RATE_LIMIT = {
  limit: 5,
  windowMs: 10 * 60 * 1000,
} as const;

/** Honeypot field name: hidden from people, often filled in by bots. */
export const HONEYPOT_FIELD = 'website';

export function townOptions(): string[] {
  return [...allTowns(), OTHER_TOWN];
}

// Zod 4's default email pattern (z.regexes.email), so the browser bundle
// doesn't need Zod; tests/contact-schema.test.ts fails if the two disagree.
const EMAIL =
  /^(?:[A-Za-z0-9_'+-]+\.)*[A-Za-z0-9_'+-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value);
}

/** US or international numbers: digits plus common punctuation, 7–15 digits. */
export function isPhone(value: string): boolean {
  if (!/^[0-9+().\s-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}

/** The code for a check a visitor can fix before sending, if it fails. */
function fieldErrorCode(
  field: string,
  value: string
): FieldErrorCode | undefined {
  const trimmed = value.trim();
  switch (field) {
    case 'name':
      return trimmed ? undefined : 'name';
    case 'contact':
      if (!trimmed) return 'contact';
      if (isEmail(trimmed) || isPhone(trimmed)) return undefined;
      return 'contactFormat';
    case 'town':
      return trimmed ? undefined : 'town';
    default:
      return undefined;
  }
}

/**
 * The checks a visitor can fix before sending: required fields and the
 * shape of the contact field, worded in the form's language. The browser
 * runs them on submit; the server schema runs the same ones (plus lengths
 * and the town list) on every post.
 */
export function fieldError(
  field: string,
  value: string,
  locale: Locale = DEFAULT_LOCALE
): string | undefined {
  const code = fieldErrorCode(field, value);
  return code && FIELD_MESSAGES[locale][code];
}
