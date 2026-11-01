// Every page component in src/pages, keyed by the path it's served at, for
// tests that check something on every page. Not a test file itself
// (vitest.config.ts includes only *.test.ts).
export const pages = Object.entries(
  import.meta.glob('../src/pages/**/*.astro', {
    eager: true,
    import: 'default',
  })
).map(([file, page]) => {
  const name = file.replace('../src/pages/', '').replace(/\.astro$/, '');
  return { path: `/${name.replace(/(^|\/)index$/, '')}`, page };
});
