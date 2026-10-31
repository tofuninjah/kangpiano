// Settings around the handler that its unit tests can't see: the route stays
// on-demand with the agreed limit, Astro's own origin check stays on, and the
// no-JS result pages render and stay out of search results.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import config from '../astro.config.mjs';
import { copy } from '../src/data/copy';
import { CONTACT_RATE_LIMIT } from '../src/lib/contact';
import { RESULT_PAGES } from '../src/lib/contact-handler';
import { LOCALES, localizePath } from '../src/lib/i18n';
import IndexPage from '../src/pages/index.astro';
import KoreanRequestNotSent from '../src/pages/ko/request-not-sent.astro';
import KoreanRequestSent from '../src/pages/ko/request-sent.astro';
import RequestNotSent from '../src/pages/request-not-sent.astro';
import RequestSent from '../src/pages/request-sent.astro';
import * as route from '../src/pages/api/contact';

const NOINDEX = '<meta name="robots" content="noindex">';

describe('contact route settings', () => {
  it('is the on-demand route and accepts only POST', () => {
    expect(route.prerender).toBe(false);
    expect(Object.keys(route).sort()).toEqual(['POST', 'prerender']);
  });

  it('limits sends to 5 per 10 minutes per IP', () => {
    expect(CONTACT_RATE_LIMIT).toEqual({ limit: 5, windowMs: 600_000 });
  });

  it('keeps Astro’s cross-site form check on', () => {
    expect(config.security?.checkOrigin).toBe(true);
  });
});

describe('result pages', () => {
  it('render their messages and are noindex', async () => {
    const container = await AstroContainer.create();
    const sent = await container.renderToString(RequestSent);
    const notSent = await container.renderToString(RequestNotSent);
    expect(sent).toContain('Your request is on its way.');
    expect(notSent).toContain('didn’t go through');
    expect(sent).toContain(NOINDEX);
    expect(notSent).toContain(NOINDEX);
  });

  it('render in Korean at the Korean paths, noindex', async () => {
    const container = await AstroContainer.create();
    const sent = await container.renderToString(KoreanRequestSent);
    const notSent = await container.renderToString(KoreanRequestNotSent);
    expect(sent).toContain(copy.ko.formResult.sent.heading);
    expect(notSent).toContain(copy.ko.formResult.notSent.heading);
    expect(sent).toContain(NOINDEX);
    expect(notSent).toContain(NOINDEX);
  });

  it('are the pages the handler redirects to, in every language', () => {
    for (const locale of LOCALES) {
      expect(RESULT_PAGES[locale]).toEqual({
        sent: localizePath('/request-sent', locale),
        notSent: localizePath('/request-not-sent', locale),
      });
    }
  });

  it('leave the home page indexable', async () => {
    const container = await AstroContainer.create();
    expect(await container.renderToString(IndexPage)).not.toContain(NOINDEX);
  });
});
