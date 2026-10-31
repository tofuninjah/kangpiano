// Contact form fields and messages, shared by the form markup, its browser
// script and the server. No server-only imports here: the script bundles it,
// so the messages live here rather than in the larger copy files.
import { site } from '../data/site';
import type { Locale } from './i18n';
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

/** Why a field was rejected; each language words it in FIELD_ERRORS. */
export type FieldErrorCode =
  | 'tooLong'
  | 'nameRequired'
  | 'contactRequired'
  | 'contactInvalid'
  | 'townInvalid';

export const FIELD_ERRORS: Record<Locale, Record<FieldErrorCode, string>> = {
  en: {
    tooLong: 'That’s too long.',
    nameRequired: 'Please enter your name.',
    contactRequired: 'Please enter a phone number or email.',
    contactInvalid: 'Please enter a phone number or an email address.',
    townInvalid: 'Please choose a town.',
  },
  ko: {
    tooLong: '글자 수가 너무 많습니다. 조금 줄여 주세요.',
    nameRequired: '이름을 입력해 주세요.',
    contactRequired: '전화번호나 이메일을 입력해 주세요.',
    contactInvalid: '올바른 전화번호나 이메일 주소를 입력해 주세요.',
    townInvalid: '지역을 선택해 주세요.',
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
