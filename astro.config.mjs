import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // `site` is unset until a domain is chosen (pianokang.com is no longer
  // hers). Canonical URLs and the sitemap need it before launch.

  // Astro 7 defaults to JSX-style whitespace stripping; keep HTML-aware
  // compression, per the September 2026 upgrade plan.
  compressHTML: true,

  vite: {
    plugins: [tailwindcss()],
  },
});
