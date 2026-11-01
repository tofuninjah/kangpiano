// Prerendered to /sitemap.xml from `site`, so the domain lives only in
// astro.config.mjs. The form result pages are noindex and stay out;
// tests/seo.test.ts fails if this list and the pages' noindex tags disagree.
import type { APIRoute } from 'astro';

export const INDEXED_PATHS = ['/', '/ko'];

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('Set `site` in astro.config.mjs for the sitemap.');
  const urls = INDEXED_PATHS.map(
    (path) => `  <url><loc>${new URL(path, site).href}</loc></url>`
  ).join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    { headers: { 'content-type': 'application/xml; charset=utf-8' } }
  );
};
