// Contact form fields, shared by the form markup and (in step 8) the
// server-side schema, so names and limits can't drift apart.
import { allTowns } from './schedule';

export const OTHER_TOWN = 'Somewhere else';

/** Max lengths, enforced in the browser by maxlength and again on the server. */
export const CONTACT_LIMITS = {
  name: 100,
  contact: 120,
  age: 20,
  message: 2000,
} as const;

/** Honeypot field name: hidden from people, often filled in by bots. */
export const HONEYPOT_FIELD = 'website';

export function townOptions(): string[] {
  return [...allTowns(), OTHER_TOWN];
}
