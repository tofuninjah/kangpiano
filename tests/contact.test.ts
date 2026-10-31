// Contact form markup: town options come from the schedule, every control
// is labeled, required/optional and length limits match src/lib/contact.ts,
// and the honeypot stays out of reach of people and assistive tech.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Contact from '../src/components/Contact.astro';
import {
  CONTACT_LIMITS,
  HONEYPOT_FIELD,
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

let html: string;

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Contact);
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
    const visible = controls(html).filter(
      (control) => control.name !== HONEYPOT_FIELD
    );
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
    const visible = controls(html).filter(
      (control) => control.name !== HONEYPOT_FIELD
    );
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
