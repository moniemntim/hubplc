import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { tools } from '../lib/tools/registry.ts';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const expected = 'google.com, pub-8014147345117745, DIRECT, f08c47fec0942fa0\n';
const paths = [
  '/',
  '/tool',
  '/articles',
  '/about',
  '/privacy',
  ...tools.map((t) => `/tool/${t.slug}`),
];
const checks = await Promise.all(
  paths.map(async (path) => {
    const r = await fetch(base + path);
    assert.equal(r.status, 200, path);
    assert.match(r.headers.get('content-type'), /text\/html/, path);
    const html = await r.text();
    assert.match(html, /<h1[ >]/, path);
    if (path.startsWith('/tool/'))
      assert.ok(
        html.includes(`href="https://hubplc.com${path}"`),
        `canonical ${path}`,
      );
    if (path === '/')
      assert.ok(html.includes('id="tools"'), 'legacy tools entry');
    return { path, status: r.status };
  }),
);
const ads = await fetch(base + '/ads.txt');
assert.equal(ads.status, 200);
assert.match(ads.headers.get('content-type'), /^text\/plain(?:;|$)/);
assert.equal(await ads.text(), expected);
const sitemap = await fetch(base + '/sitemap.xml');
assert.equal(sitemap.status, 200);
const xml = await sitemap.text();
for (const path of paths)
  assert.ok(xml.includes(`https://hubplc.com${path}</loc>`), `sitemap ${path}`);
const robots = await fetch(base + '/robots.txt');
assert.equal(robots.status, 200);
assert.match(await robots.text(), /Sitemap: https:\/\/hubplc.com\/sitemap.xml/);
const missing = await fetch(base + '/tool/nonexistent-verification-route');
assert.equal(missing.status, 404);
await mkdir('outputs', { recursive: true });
await writeFile(
  'outputs/site-verification.json',
  JSON.stringify(
    {
      base,
      checks,
      ads: {
        status: ads.status,
        contentType: ads.headers.get('content-type'),
        exact: true,
      },
      sitemap: true,
      robots: true,
      missing: 404,
    },
    null,
    2,
  ),
);
console.log(
  `PASS ${checks.length} pages; ads.txt exact UTF-8 content + final newline, 200, ${ads.headers.get('content-type')}; sitemap, robots and genuine 404.`,
);
