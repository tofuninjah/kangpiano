/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig gives tests Astro's Vite setup, so .astro components can be
// rendered with the Container API.
export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
