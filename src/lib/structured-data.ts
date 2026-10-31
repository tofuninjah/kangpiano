// schema.org data for the home pages, built from the same site, schedule
// and copy data as the visible text. No street address: she teaches from
// home, so the business is described by the towns it serves. Both home
// pages describe one business: they share an @id and differ only in the
// language of the name and description.
import { copy } from '../data/copy';
import { site } from '../data/site';
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_DETAILS,
  localizePath,
  type Locale,
} from './i18n';

/**
 * `siteUrl` is astro.config's `site`. Without it the absolute @id and url
 * are left out, like the canonical tags in BaseLayout.
 */
export function localBusinessJsonLd(
  locale: Locale = DEFAULT_LOCALE,
  siteUrl?: string
) {
  const text = copy[locale];
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    ...(siteUrl ? { '@id': new URL('/#business', siteUrl).href } : {}),
    name: text.meta.siteName,
    description: text.meta.description,
    telephone: site.phone.href.replace(/^tel:/, ''),
    // Lessons are taught in both of the site's languages.
    knowsLanguage: LOCALES.map((each) => LOCALE_DETAILS[each].tag),
    founder: {
      '@type': 'Person',
      name: text.name,
      ...(text.name !== site.name ? { alternateName: site.name } : {}),
    },
    // Official place names, which maps and search engines match on.
    areaServed: site.towns.map((town) => ({
      '@type': 'City',
      name: town,
      containedInPlace: { '@type': 'State', name: 'Hawaii' },
    })),
    ...(siteUrl
      ? { url: new URL(localizePath('/', locale), siteUrl).href }
      : {}),
  };
}

/**
 * JSON for a <script type="application/ld+json"> block. "<" is escaped so
 * no value can close the script element early.
 */
export function toJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
