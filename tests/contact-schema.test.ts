import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CONTACT_LIMITS,
  fieldError,
  isEmail,
  isPhone,
  OTHER_TOWN,
} from '../src/lib/contact';
import { CONTACT_FIELDS, parseContact } from '../src/lib/contact-schema';

const valid = {
  name: 'Test Parent',
  contact: 'parent@example.com',
  age: '7',
  town: 'Kapolei',
  message: 'Hello',
};

const form = (fields: Record<string, string>) => new URLSearchParams(fields);

describe('parseContact', () => {
  it('accepts a complete request', () => {
    const result = parseContact(form(valid));
    expect(result).toEqual({ ok: true, data: valid });
  });

  it('accepts phone numbers in common formats', () => {
    for (const contact of [
      '(808) 371-0708',
      '808.371.0708',
      '+1 808 371 0708',
      '8083710708',
    ]) {
      expect(parseContact(form({ ...valid, contact })).ok, contact).toBe(true);
    }
  });

  it('rejects contact details that are neither phone nor email', () => {
    for (const contact of [
      'hello',
      '123',
      'call me maybe',
      'a@b',
      '1'.repeat(16),
    ]) {
      const result = parseContact(form({ ...valid, contact }));
      expect(result.ok, contact).toBe(false);
      if (!result.ok)
        expect(result.errors.contact).toMatch(/phone number or an email/);
    }
  });

  it('requires name, contact and town, and says which', () => {
    const result = parseContact(form({}));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual({
      name: 'Please enter your name.',
      contact: 'Please enter a phone number or email.',
      town: 'Please choose a town.',
    });
  });

  it('allows only the listed towns', () => {
    expect(parseContact(form({ ...valid, town: OTHER_TOWN })).ok).toBe(true);
    const result = parseContact(form({ ...valid, town: 'Honolulu' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(['town']);
  });

  it('enforces the shared length limits', () => {
    for (const [field, limit] of Object.entries(CONTACT_LIMITS)) {
      const atLimit =
        field === 'contact' ? 'a@b.co'.padStart(limit, 'x') : 'x'.repeat(limit);
      expect(parseContact(form({ ...valid, [field]: atLimit })).ok, field).toBe(
        true
      );
      // Over by one, but otherwise valid, so only the length cap can fail it.
      const overLimit =
        field === 'contact'
          ? 'a@b.co'.padStart(limit + 1, 'x')
          : 'x'.repeat(limit + 1);
      const over = parseContact(form({ ...valid, [field]: overLimit }));
      expect(over.ok, field).toBe(false);
      if (!over.ok)
        expect(over.errors[field as 'name'], field).toBe('That’s too long.');
    }
  });

  it('treats Unicode line and paragraph separators and NEL as line breaks', () => {
    const [nel, lineSep, paraSep] = [0x85, 0x2028, 0x2029].map((code) =>
      String.fromCharCode(code)
    );
    const name = parseContact(
      form({ ...valid, name: `A${lineSep}Bcc: x${paraSep}y${nel}z` })
    );
    expect(name.ok).toBe(true);
    if (name.ok) expect(name.data.name).toBe('A Bcc: x y z');

    const message = parseContact(
      form({ ...valid, message: `one${lineSep}two${paraSep}three` })
    );
    expect(message.ok).toBe(true);
    if (message.ok) expect(message.data.message).toBe('one\ntwo\nthree');
  });

  it('flattens line breaks and strips control characters from one-line fields', () => {
    const result = parseContact(
      form({ ...valid, name: ' Test\r\nBcc: x@evil.test\u0007 ' })
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe('Test Bcc: x@evil.test');
  });

  it('keeps line breaks in the message but drops other control characters', () => {
    const result = parseContact(
      form({ ...valid, message: 'Line one\r\nLine two\u0000' })
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.message).toBe('Line one\nLine two');
  });

  it('ignores fields it does not know about', () => {
    const result = parseContact(
      form({ ...valid, to: 'evil@example.com', subject: 'x' })
    );
    expect(result).toEqual({ ok: true, data: valid });
  });
});

describe('isPhone', () => {
  it('needs 7 to 15 digits and only phone punctuation', () => {
    expect(isPhone('371-0708')).toBe(true);
    expect(isPhone('371-070')).toBe(false);
    expect(isPhone('808-371-0708 ext 2')).toBe(false);
  });
});

describe('isEmail', () => {
  it('is Zod’s own email check, so the browser and server agree', () => {
    // The boundaries the pattern encodes, so a change to Zod's default
    // pattern in either direction shows up here.
    for (const value of [
      'parent@example.com',
      "o'neil+piano@example.co.uk",
      'A.B_C-d@Sub-domain.Example.COM',
      'a@b',
      'a@b.c',
      'a@b.12',
      '.lead@example.com',
      'trail.@example.com',
      'x..y@example.com',
      'a@-example.com',
      'a@example-.com',
      'a@example..com',
      'ana silva@example.com',
      ' parent@example.com',
      'parent@example.com ',
      'parent@exämple.com',
      'pärent@example.com',
      'parent@',
      '@example.com',
      '',
    ]) {
      expect(isEmail(value), JSON.stringify(value)).toBe(
        z.email().safeParse(value).success
      );
    }
  });
});

describe('fieldError', () => {
  // Every case the browser can judge must get the same answer the server
  // gives, in both directions: a value the browser lets through that the
  // server rejects would send the visitor on a pointless round trip, and
  // one the browser rejects that the server accepts would block a real
  // request.
  const cases: Record<string, string[]> = {
    name: ['', '   ', '\t', 'Test Parent'],
    contact: [
      '',
      ' ',
      'hello',
      'a@b',
      '1'.repeat(16),
      'parent@example.com',
      ' (808) 371-0708 ',
    ],
    town: ['', 'Kapolei', OTHER_TOWN],
    age: ['', '7'],
    message: ['', 'Hello'],
  };

  it('matches the server’s answer for every field it checks', () => {
    for (const field of CONTACT_FIELDS) {
      for (const value of cases[field]!) {
        const result = parseContact(form({ ...valid, [field]: value }));
        const server = result.ok ? undefined : result.errors[field];
        expect(
          fieldError(field, value),
          `${field}: ${JSON.stringify(value)}`
        ).toBe(server);
      }
    }
  });

  it('ignores fields it does not know about', () => {
    expect(fieldError('website', '')).toBeUndefined();
  });
});
