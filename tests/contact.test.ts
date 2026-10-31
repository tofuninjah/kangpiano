// Contact form markup: town options come from the schedule, every control
// is labeled, required/optional and length limits match src/lib/contact.ts,
// the honeypot stays out of reach of people and assistive tech, and the
// Korean form labels everything in Korean while sending the same values.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Contact from '../src/components/Contact.astro';
import { copy } from '../src/data/copy';
import {
  CONTACT_LIMITS,
  HONEYPOT_FIELD,
  LOCALE_FIELD,
  OTHER_TOWN,
  townOptions,
} from '../src/lib/contact';
import { allTowns } from '../src/lib/schedule';

type Attrs = Record<string, string>;

function attrsOf(tag: string): Attrs {
  const attrs: Attrs = {};
  for (const [, name, value] of tag.matchAll(/\s([a-z-]+)(?:="([^"]*)")?/g)) {
    attrs[name!] = value ?? '';
  }
  return attrs;
}

function controls(html: string): Attrs[] {
  return [...html.matchAll(/<(?:input|select|textarea)\b[^>]*>/g)].map(
    ([tag]) => attrsOf(tag)
  );
}

/** Controls a visitor sees: not the honeypot or the hidden locale field. */
const visibleControls = (page: string) =>
  controls(page).filter(
    (control) => control.name !== HONEYPOT_FIELD && control.type !== 'hidden'
  );

let html: string;
let korean: string;

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Contact, {
    props: { locale: 'en' },
  });
  korean = await container.renderToString(Contact, {
    props: { locale: 'ko' },
  });
});

describe('contact form', () => {
  it('posts to the contact endpoint', () => {
    const form = attrsOf(html.match(/<form\b[^>]*>/)![0]);
    expect(form.method).toBe('post');
    expect(form.action).toBe('/api/contact');
  });

  it('leaves the browser’s own checks on for the no-JavaScript post', () => {
    // The script turns them off at runtime; the markup must not.
    const form = attrsOf(html.match(/<form\b[^>]*>/)![0]);
    expect('novalidate' in form).toBe(false);
  });

  it('offers exactly the schedule’s towns plus “Somewhere else”', () => {
    expect(townOptions()).toEqual([...allTowns(), OTHER_TOWN]);
    const select = html.match(/<select\b[\s\S]*?<\/select>/)![0];
    const values = [...select.matchAll(/<option value="([^"]*)"/g)].map(
      (match) => match[1]
    );
    expect(values).toEqual(['', ...townOptions()]);
  });

  it('labels every visible control', () => {
    const labelled = new Set(
      [...html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)].map((m) => m[1])
    );
    const visible = visibleControls(html);
    expect(visible.length).toBe(5);
    for (const control of visible) {
      expect(control.id, control.name).toBeTruthy();
      expect(labelled.has(control.id!), control.name).toBe(true);
    }
  });

  it('requires name, contact and town only', () => {
    const required = controls(html)
      .filter((control) => 'required' in control)
      .map((control) => control.name);
    expect(required).toEqual(['name', 'contact', 'town']);
  });

  it('caps lengths at the shared limits', () => {
    const byName = Object.fromEntries(
      controls(html).map((control) => [control.name, control])
    );
    for (const [field, limit] of Object.entries(CONTACT_LIMITS)) {
      expect(byName[field]?.maxlength, field).toBe(String(limit));
    }
  });

  it('ties every visible control to its error slot, and the age field to its hint', () => {
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const visible = visibleControls(html);
    for (const control of visible) {
      const refs = (control['aria-describedby'] ?? '').split(' ');
      expect(refs, control.name).toContain(`${control.id}-error`);
      for (const ref of refs) expect(ids.has(ref), ref).toBe(true);
    }
    const age = visible.find((control) => control.name === 'age')!;
    expect(age['aria-describedby']).toContain('contact-age-hint');
  });

  it('keeps the honeypot hidden and out of the tab order', () => {
    const wrapper = html.match(
      new RegExp(
        `<div aria-hidden="true"[^>]*>[\\s\\S]*?name="${HONEYPOT_FIELD}"[^>]*>`
      )
    );
    expect(wrapper, 'honeypot inside an aria-hidden wrapper').not.toBeNull();
    const honeypot = controls(html).find(
      (control) => control.name === HONEYPOT_FIELD
    )!;
    expect(honeypot.tabindex).toBe('-1');
    expect(honeypot.autocomplete).toBe('off');
    expect('required' in honeypot).toBe(false);
  });
});

describe('the page language field', () => {
  it('carries each form’s own language', () => {
    for (const [page, locale] of [
      [html, 'en'],
      [korean, 'ko'],
    ] as const) {
      const field = controls(page).find((c) => c.name === LOCALE_FIELD)!;
      expect(field, locale).toBeDefined();
      expect(field.type).toBe('hidden');
      expect(field.value).toBe(locale);
    }
  });
});

describe('Korean contact form', () => {
  const text = copy.ko.contact;

  it('sends the same town values, labeled in Hangul', () => {
    const select = korean.match(/<select\b[\s\S]*?<\/select>/)![0];
    const options = [
      ...select.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g),
    ].map((m) => ({ value: m[1], label: m[2]!.trim() }));
    expect(options).toEqual([
      { value: '', label: text.townPlaceholder },
      ...allTowns().map((town) => ({
        value: town,
        label: copy.ko.townName(town),
      })),
      { value: OTHER_TOWN, label: text.otherTown },
    ]);
  });

  it('labels every field in Korean, with the same controls as English', () => {
    const labels = [
      ...korean.matchAll(
        /<label\b[^>]*\bfor="([^"]+)"[^>]*>([\s\S]*?)<\/label>/g
      ),
    ].map((m) =>
      m[2]!
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    );
    expect(labels).toEqual([
      text.name,
      text.contact,
      `${text.age} (${text.optional})`,
      text.town,
      `${text.message} (${text.optional})`,
      text.honeypot,
    ]);
    expect(visibleControls(korean).map((c) => c.name)).toEqual(
      visibleControls(html).map((c) => c.name)
    );
  });
});
