// Prerendered to /robots.txt. Everything is crawlable, including the noindex
// form result pages: crawlers have to fetch a page to see its noindex tag.
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('Set `site` in astro.config.mjs for robots.txt.');
  return new Response(
    `User-agent: *
Allow: /

Sitemap: ${new URL('/sitemap.xml', site).href}
`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } }
  );
};
