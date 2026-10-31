# kangpiano

One-page site for Hyejeong Kang's private piano and violin lessons on Oʻahu. Rebuilt in 2026 from a 2016 Foundation 6 template; the old page is in git history (`git show cae49c4:index.html`).

## Stack

- Astro 7.3 with `@astrojs/vercel`: every page is prerendered; only `src/pages/api/contact.ts` (`prerender = false`) runs on demand. Tailwind 4 via `@tailwindcss/vite`, TypeScript 5.9 strict.
- Contact form: Zod schema (`src/lib/contact-schema.ts`), handler (`src/lib/contact-handler.ts`), Resend sender (`src/lib/contact-email.ts`). Length limits, the rate limit, the honeypot name, town options and visitor-facing messages live in `src/lib/contact.ts`, shared by markup, browser script and server; the accepted field names are `CONTACT_FIELDS` in the schema.
- Node 22.x (`engines`), npm. ESLint 9 flat config, Prettier with `prettier-plugin-astro`.

## Commands

- `npm run dev`: local dev server
- `npm run build`. `npm run preview` doesn't work with `@astrojs/vercel`; `node e2e/serve.mjs` serves the build on port 4327.
- `npm run check`: `astro check` (types)
- `npm test`: Vitest; renders components with Astro's Container API
- `npm run test:e2e`: Playwright on the production build, served by `e2e/serve.mjs` on port 4327 with `vercel.json` headers. Projects: Chromium at 1440, WebKit at 375, Chromium with JS off. `/api/contact` is answered in the browser by the real handler with a fake sender. Specs import `test` from `e2e/test.ts`, which fails on any CSP violation or page error. CI (`.github/workflows/ci.yml`) runs all checks on PRs and master.
- `npm run lint`, `npm run format`, `npm run format:check`

## Deploy and env

- Vercel. Security headers live in `vercel.json` (from `global-claude-config/templates/astro-vercel`); HSTS has no `preload` yet: it's hard to undo, so add it only once kangpiano.com and every subdomain are HTTPS-only for good. The enforced script/style CSP is Astro's `security.csp` `<meta>` (hashes, no `unsafe-inline`); `frame-ancestors`, `base-uri`, `object-src` and `form-action` are also sent as a header from `vercel.json`. The template's report-only policy was dropped: it was looser than the enforced one, had nowhere to report, and logged a console error on every page.
- `astro preview` doesn't work with `@astrojs/vercel`. To check the CSP, build and serve `.vercel/output/static` with any static server; the CSP isn't applied in `npm run dev`.
- Production is https://www.kangpiano.com (kangpiano.com redirects to it), Vercel project `ailuro-tech/kangpiano`. DNS is at Namecheap, which also forwards the domain's email. pianokang.com belongs to someone else: never use it in code, links, or email addresses.
- Secrets go in Vercel env vars, with names in `.env.example`. Read server secrets through `process.env`; Astro inlines `import.meta.env` at build time.

## Design and content

- Source design: Paper file "Kang Piano — Design", page "A — Recital Program" (desktop and mobile). Take exact values with Paper `get_jsx` / `get_computed_styles`, not screenshots.
- Where and when she teaches lives only in `src/data/schedule.ts`. The schedule section, hero sentence, meta description and footer render from it on both pages, and `tests/schedule.test.ts` fails if either page names a town or day the data doesn't have. Change the data, not the copy. A new town also needs its Hangul in `KOREAN_TOWN_NAMES` (`src/data/copy/ko.ts`); the test fails until it has one.
- Page copy lives in `src/data/copy/en.ts` and `ko.ts`, both typed by `PageCopy` (`types.ts`), so `npm run check` fails if one language is missing a string. Components take `locale` and read `copy[locale]`. The Korean copy is written for Korean parents, not translated line by line; Hyejeong approves changes to it. Korean sentences built from the schedule pick 은/는 and 와/과 with `src/lib/korean.ts`.
- Korean typesetting is the `:lang(ko)` block in `src/styles/global.css`: system Korean fonts after the Latin web fonts (no Hangul web font to download), taller line heights, `word-break: keep-all`, and upright emphasis instead of a faux italic. `e2e/typography.spec.ts` checks it at 1440 and 375 and checks that the English page is unchanged.
- No rates on the site until her 2027 prices are set.
- Hawaiian spelling: ʻokina is U+02BB (Oʻahu, ʻEwa Beach); keep kahakō (Wahiawā).
- Two languages: English at `/`, Korean under `/ko`, no trailing slash. `src/lib/i18n.ts` holds the locales and URL rules; pages pass `locale` to `BaseLayout` (no Astro i18n routing, so no middleware in front of `/api/contact`) and never redirect by browser language. Only paths in `TRANSLATED_PATHS` get hreflang tags; add a path there when its Korean page exists. Section links go through `homeSectionHref` so they stay on the visitor's language. `tests/locale.test.ts` checks `<html lang>`, hreflang and the language link on every page.

## Gotchas

- Astro is held on 7.3.x (`~7.3.8`, plus a Dependabot ignore for its minors): 7.4 raises the Node floor to 22.23.4. Confirm Vercel's Node 22 runtime meets it before lifting both.
- Astro ≥7.2.8 and sharp ≥0.35.4 are the floor for the GHSA-26w7-cxv4-gfx2 image RCE fix. `overrides.sharp` keeps Astro from loading an older nested copy.
- `overrides` also pins `path-to-regexp` 6.3.0 and `zod` to our own version: `@astrojs/vercel`'s dependencies pin vulnerable exact versions (ReDoS, Zod memory exhaustion). The remaining moderate glob/minimatch advisories are build-time only and need majors the adapter doesn't support.
- The contact rate limit (5 per 10 minutes per IP) lives in memory per serverless instance. Move it to Upstash if spam gets through.
- `site` drives canonical and og:url tags, the JSON-LD url, `sitemap.xml` and `robots.txt` (both generated in `src/pages`). `trailingSlash: 'never'` must match `vercel.json`, or canonical URLs point at a redirect. `security.allowedDomains` stays unset on purpose (see `astro.config.mjs`).
- Email still sends from Resend's sandbox address, which only delivers to the Resend account owner. Verify kangpiano.com in Resend, then point `CONTACT_FORM_FROM_EMAIL` at it and `CONTACT_FORM_TO_EMAIL` at Hyejeong's inbox.
- Status lives in the main checkout's `STATUS.md`; worktree sessions update it with `status-item`.
- WebKit's `<select>` reports a `style-src-attr` CSP violation from its own shadow tree; the select renders the same either way. `e2e/test.ts` ignores only that case.
