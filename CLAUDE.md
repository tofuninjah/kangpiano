# kangpiano

One-page site for Hyejeong Kang's private piano and violin lessons on Oʻahu. Rebuilt in 2026 from a 2016 Foundation 6 template; the old page is in git history (`git show cae49c4:index.html`).

## Stack

- Astro 7.3 (static output, no adapter yet), Tailwind 4 via `@tailwindcss/vite`, TypeScript 5.9 strict.
- Node 22.x (`engines`), npm. ESLint 9 flat config, Prettier with `prettier-plugin-astro`.

## Commands

- `npm run dev`: local dev server
- `npm run build` / `npm run preview`
- `npm run check`: `astro check` (types)
- `npm run lint`, `npm run format`, `npm run format:check`

## Deploy and env

- Vercel. Security headers live in `vercel.json` (from `global-claude-config/templates/astro-vercel`). The full CSP is report-only until a clean console pass; HSTS has no `preload` because the domain isn't settled.
- No production domain yet. pianokang.com now belongs to someone else: never use it in code, links, or email addresses.
- Secrets go in Vercel env vars, with names in `.env.example`. Read server secrets through `process.env`; Astro inlines `import.meta.env` at build time.

## Design and content

- Source design: Paper file "Kang Piano — Design", page "A — Recital Program" (desktop and mobile). Take exact values with Paper `get_jsx` / `get_computed_styles`, not screenshots.
- Schedule: Tue and Thu at the student's home in ʻEwa Beach and Kapolei; Wed and Fri at her home in Mililani. Lessons by appointment.
- No rates on the site until her 2027 prices are set.
- Hawaiian spelling: ʻokina is U+02BB (Oʻahu, ʻEwa Beach); keep kahakō (Wahiawā).

## Gotchas

- Astro is held on 7.3.x: 7.4 raises the Node floor to 22.23.4. Confirm Vercel's Node 22 runtime meets it before taking a Dependabot bump.
- Astro ≥7.2.8 and sharp ≥0.35.4 are the floor for the GHSA-26w7-cxv4-gfx2 image RCE fix. `overrides.sharp` keeps Astro from loading an older nested copy.
- The contact form step adds `@astrojs/vercel`, and only that route gets `prerender = false`.
- Status lives in the main checkout's `STATUS.md`; worktree sessions update it with `status-item`.
