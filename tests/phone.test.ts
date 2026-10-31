// The phone number lives in src/data/site.ts. Every call link dials it, the
// number shown is the number dialed, and no page shows any other number.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import { site } from '../src/data/site';
import IndexPage from '../src/pages/index.astro';
import RequestNotSent from '../src/pages/request-not-sent.astro';
import RequestSent from '../src/pages/request-sent.astro';

const pages = [IndexPage, RequestSent, RequestNotSent];
let html: string[];

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await Promise.all(pages.map((page) => container.renderToString(page)));
});

describe('phone number', () => {
  it('dials the number it shows', () => {
    const digits = site.phone.display.replace(/\D/g, '');
    expect(site.phone.href).toBe(`tel:+1${digits}`);
  });

  it('is the only number linked or shown on every page', () => {
    for (const page of html) {
      const tels = [...page.matchAll(/href="(tel:[^"]*)"/g)].map((m) => m[1]);
      expect(tels.length).toBeGreaterThan(0);
      expect(new Set(tels)).toEqual(new Set([site.phone.href]));

      const shown = [...page.matchAll(/\(\d{3}\)\s?\d{3}-\d{4}/g)].map(
        (m) => m[0]
      );
      expect(new Set(shown)).toEqual(new Set([site.phone.display]));
    }
  });
});
