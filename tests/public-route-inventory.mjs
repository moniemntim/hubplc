import assert from 'node:assert/strict';

const base = new URL(process.env.TEST_BASE_URL ?? 'http://[::1]:4173');
const concurrency = 6;
const timeoutMs = 20_000;

function text(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&nbsp;/giu, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39);/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function match(html, expression) {
  return expression.exec(html)?.[1]?.trim() ?? '';
}

function normalize(url) {
  const next = new URL(url);
  next.hash = '';
  if (next.pathname !== '/' && next.pathname.endsWith('/'))
    next.pathname = next.pathname.slice(0, -1);
  return next.href;
}

function pathForBase(url) {
  const next = new URL(url);
  return `${next.pathname}${next.search}`;
}

async function request(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function bounded(items, fn) {
  const results = Array.from({ length: items.length });
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await fn(items[index]);
      }
    }),
  );
  return results;
}

function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/giu)].map((item) =>
    item[1].trim(),
  );
}

function firstPartyHrefs(html, sitemapOrigin) {
  const values = new Set();
  for (const item of html.matchAll(
    /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/giu,
  )) {
    const href = item[1].trim();
    if (
      href === '' ||
      href.startsWith('#') ||
      /^(?:mailto:|tel:|javascript:|data:)/iu.test(href)
    )
      continue;
    try {
      const resolved = new URL(href, sitemapOrigin);
      if (resolved.origin === sitemapOrigin.origin)
        values.add(pathForBase(resolved));
    } catch {
      // A malformed href is reported by the caller as an unusable first-party link.
      values.add(`__invalid__:${href}`);
    }
  }
  return values;
}

const sitemapResponse = await request(new URL('/sitemap.xml', base));
assert.equal(sitemapResponse.status, 200, 'sitemap must return HTTP 200');
const sitemap = await sitemapResponse.text();
const listed = sitemapUrls(sitemap);
assert.ok(listed.length > 0, 'sitemap must contain at least one <loc>');
const sitemapOrigin = new URL(listed[0]).origin;
const failures = [];
const discoveredHrefs = new Set();

await bounded(listed, async (sitemapUrl) => {
  let source;
  try {
    source = new URL(sitemapUrl);
  } catch {
    failures.push({ route: sitemapUrl, reason: 'invalid sitemap URL' });
    return;
  }
  if (source.origin !== sitemapOrigin) {
    failures.push({
      route: sitemapUrl,
      reason: 'sitemap URL has another origin',
    });
    return;
  }
  const route = pathForBase(source);
  try {
    const response = await request(new URL(route, base));
    if (response.status !== 200) {
      failures.push({ route, reason: `HTTP ${response.status}` });
      return;
    }
    const html = await response.text();
    const title = text(match(html, /<title[^>]*>([\s\S]*?)<\/title>/iu));
    const h1 = text(match(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/iu));
    const canonical = match(
      html,
      /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/iu,
    );
    const robots = match(
      html,
      /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*\bcontent=["']([^"']+)["'][^>]*>/iu,
    );
    if (!title) failures.push({ route, reason: 'empty title' });
    if (!h1) failures.push({ route, reason: 'empty h1' });
    if (
      /\bnoindex\b/iu.test(robots) ||
      /\bnoindex\b/iu.test(response.headers.get('x-robots-tag') ?? '')
    )
      failures.push({ route, reason: 'sitemap URL declares noindex' });
    if (!canonical) failures.push({ route, reason: 'missing self canonical' });
    else {
      try {
        const canonicalUrl = new URL(canonical, sitemapOrigin);
        if (normalize(canonicalUrl) !== normalize(source))
          failures.push({ route, reason: `canonical mismatch: ${canonical}` });
      } catch {
        failures.push({ route, reason: `invalid canonical: ${canonical}` });
      }
    }
    if (route.startsWith('/articles/') || route.startsWith('/tool/')) {
      const main = match(html, /<main\b[^>]*>([\s\S]*?)<\/main>/iu);
      if (text(main).length < 40)
        failures.push({ route, reason: 'main content is blank or too short' });
    }
    for (const href of firstPartyHrefs(html, new URL(sitemapOrigin)))
      discoveredHrefs.add(href);
  } catch (error) {
    failures.push({
      route,
      reason: error.name === 'AbortError' ? 'request timeout' : error.message,
    });
  }
});

const hrefs = [...discoveredHrefs];
await bounded(hrefs, async (href) => {
  if (href.startsWith('__invalid__:')) {
    failures.push({
      route: href.slice('__invalid__:'.length),
      reason: 'invalid first-party href',
    });
    return;
  }
  try {
    const response = await request(new URL(href, base));
    if (response.status >= 400)
      failures.push({
        route: href,
        reason: `broken first-party href: HTTP ${response.status}`,
      });
  } catch (error) {
    failures.push({
      route: href,
      reason: `broken first-party href: ${error.name}`,
    });
  }
});

if (failures.length) {
  console.error(
    JSON.stringify(
      {
        status: 'FAIL',
        base: base.href,
        failures: failures.slice(0, 40),
        totalFailures: failures.length,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        base: base.href,
        routes: listed.length,
        firstPartyHrefs: hrefs.length,
        concurrency,
      },
      null,
      2,
    ),
  );
}
