// Serves the production build for end-to-end tests. `astro preview` doesn't
// run with the Vercel adapter, so this stands in for Vercel's static hosting:
// clean URLs, the headers from vercel.json, and 404 for anything else.
// /api/contact isn't served here; specs answer it with the real handler.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve('.vercel/output/static');
// playwright.config.ts passes the port; 4327 when run by hand.
const PORT = Number(process.argv[2] ?? 4327);
const HOST = '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
};

// vercel.json sources here are plain regexes ("/(.*)", "/_astro/(.*)").
// Named path-to-regexp params (":slug") would need translating first.
const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
const headerRules = (vercel.headers ?? []).map((rule) => ({
  pattern: new RegExp(`^${rule.source}$`),
  headers: rule.headers,
}));

try {
  await stat(join(ROOT, 'index.html'));
} catch {
  console.error(`No build at ${ROOT}. Run \`npm run build\` first.`);
  process.exit(1);
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** The file a clean URL maps to, or null. Never resolves outside ROOT. */
async function locate(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const base = resolve(ROOT, `.${normalize(`/${decoded}`)}`);
  if (base !== ROOT && !base.startsWith(ROOT + sep)) return null;
  for (const candidate of [base, `${base}.html`, join(base, 'index.html')]) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', `http://${HOST}`);
  for (const rule of headerRules) {
    if (!rule.pattern.test(pathname)) continue;
    for (const { key, value } of rule.headers) response.setHeader(key, value);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' }).end();
    return;
  }

  const file = await locate(pathname);
  if (!file) {
    response
      .writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      .end('Not found');
    return;
  }

  const body = await readFile(file);
  response.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'content-length': body.byteLength,
  });
  response.end(request.method === 'HEAD' ? undefined : body);
});

server.listen(PORT, HOST, () => {
  console.log(`Serving ${ROOT} at http://${HOST}:${PORT}`);
});
