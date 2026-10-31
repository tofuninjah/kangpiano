import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // `site` is unset until a domain is chosen (pianokang.com is no longer
  // hers). Canonical URLs, the sitemap and security.allowedDomains need it
  // before launch.

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
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
