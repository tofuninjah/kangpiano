import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // Canonical and og:url tags, JSON-LD, sitemap.xml and robots.txt all build
  // their absolute URLs from this. kangpiano.com redirects here (Vercel).
  site: 'https://www.kangpiano.com',
  // Matches vercel.json's "trailingSlash": false. Without it, Astro.url on
  // /request-sent ends in "/", so canonical URLs pointed at a redirect.
  trailingSlash: 'never',

  // Astro 7 defaults to JSX-style whitespace stripping; keep HTML-aware
  // compression, per the September 2026 upgrade plan.
  compressHTML: true,

  // Pages stay static. Only /api/contact opts out with `prerender = false`,
  // which is what the adapter is for.
  adapter: vercel(),

  security: {
    // Default in Astro 7, stated so it isn't turned off by accident: rejects
    // cross-site form posts to on-demand routes (the contact endpoint).
    checkOrigin: true,
    // allowedDomains stays unset on purpose: it lists X-Forwarded-Host values
    // to trust, and unset means none are. The form works on Vercel without
    // it (request.url already carries the public host).
    // Each built page gets a CSP <meta> whose script-src and style-src are
    // 'self' plus hashes of Astro's inline scripts and styles, so neither
    // needs 'unsafe-inline'. frame-ancestors can't live in a meta tag; it's
    // sent as a header from vercel.json.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        // Vite inlines font files under 4 KB as data: URIs.
        "font-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },

  // No Markdown here; Shiki's inline styles would also clash with the CSP.
  markdown: { syntaxHighlight: false },

  vite: {
    plugins: [tailwindcss()],
  },
});
