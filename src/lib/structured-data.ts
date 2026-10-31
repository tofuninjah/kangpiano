// schema.org data for the home page, built from the same site and schedule
// data as the visible copy. No street address: she teaches from home, so
// the business is described by the towns it serves.
import { site } from '../data/site';

export function localBusinessJsonLd(url?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.title,
    description: site.description,
    telephone: site.phone.href.replace(/^tel:/, ''),
    founder: { '@type': 'Person', name: site.name },
    areaServed: site.towns.map((town) => ({
      '@type': 'City',
      name: town,
      containedInPlace: { '@type': 'State', name: 'Hawaii' },
    })),
    ...(url ? { url } : {}),
  };
}

/**
 * JSON for a <script type="application/ld+json"> block. "<" is escaped so
 * no value can close the script element early.
 */
export function toJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
