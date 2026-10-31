// Contact form fields and messages, shared by the form markup, its browser
// script and the server. No server-only imports here: the script bundles it.
import { site } from '../data/site';
import { allTowns } from './schedule';

/** Every message a visitor can see about their request. */
export const CONTACT_MESSAGES = {
  success: `Thank you! Your request is on its way, and I’ll get back to you soon. If it’s urgent, call ${site.phone.display}.`,
  checkFields: 'Please check the highlighted fields.',
  tooLarge: `That message is too long to send. Please shorten it, or call ${site.phone.display}.`,
  unreadable: `That request couldn’t be read. Please try again, or call ${site.phone.display}.`,
  tooMany: `Too many requests from this device. Please wait a few minutes, or call ${site.phone.display}.`,
  sendFailed: `Sorry, your request didn’t go through. Please call ${site.phone.display}.`,
  offline: `Couldn’t reach the server. Check your connection, or call ${site.phone.display}.`,
} as const;

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
