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

- Vercel. Security headers live in `vercel.json` (from `global-claude-config/templates/astro-vercel`); HSTS has no `preload` because the domain isn't settled. The enforced script/style CSP is Astro's `security.csp` `<meta>` (hashes, no `unsafe-inline`); `frame-ancestors`, `base-uri`, `object-src` and `form-action` are also sent as a header from `vercel.json`. The template's report-only policy was dropped: it was looser than the enforced one, had nowhere to report, and logged a console error on every page.
- `astro preview` doesn't work with `@astrojs/vercel`. To check the CSP, build and serve `.vercel/output/static` with any static server; the CSP isn't applied in `npm run dev`.
- No production domain yet. pianokang.com now belongs to someone else: never use it in code, links, or email addresses.
- Secrets go in Vercel env vars, with names in `.env.example`. Read server secrets through `process.env`; Astro inlines `import.meta.env` at build time.

## Design and content

- Source design: Paper file "Kang Piano — Design", page "A — Recital Program" (desktop and mobile). Take exact values with Paper `get_jsx` / `get_computed_styles`, not screenshots.
- Where and when she teaches lives only in `src/data/schedule.ts`. The schedule section, hero sentence, meta description and footer render from it, and `tests/schedule.test.ts` fails if any page copy names a town or day the data doesn't have. Change the data, not the copy.
- No rates on the site until her 2027 prices are set.
- Hawaiian spelling: ʻokina is U+02BB (Oʻahu, ʻEwa Beach); keep kahakō (Wahiawā).

## Gotchas

- Astro is held on 7.3.x (`~7.3.8`, plus a Dependabot ignore for its minors): 7.4 raises the Node floor to 22.23.4. Confirm Vercel's Node 22 runtime meets it before lifting both.
- Astro ≥7.2.8 and sharp ≥0.35.4 are the floor for the GHSA-26w7-cxv4-gfx2 image RCE fix. `overrides.sharp` keeps Astro from loading an older nested copy.
- `overrides` also pins `path-to-regexp` 6.3.0 and `zod` to our own version: `@astrojs/vercel`'s dependencies pin vulnerable exact versions (ReDoS, Zod memory exhaustion). The remaining moderate glob/minimatch advisories are build-time only and need majors the adapter doesn't support.
- The contact rate limit (5 per 10 minutes per IP) lives in memory per serverless instance. Move it to Upstash if spam gets through.
- When the domain is chosen: set `site` and `security.allowedDomains` in `astro.config.mjs`, verify the domain in Resend, and point `CONTACT_FORM_FROM_EMAIL` at it.
- Status lives in the main checkout's `STATUS.md`; worktree sessions update it with `status-item`.
- WebKit's `<select>` reports a `style-src-attr` CSP violation from its own shadow tree; the select renders the same either way. `e2e/test.ts` ignores only that case.
