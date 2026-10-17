import fs from 'node:fs/promises';
import { tools } from '../lib/tools/registry.ts';
const articles = JSON.parse(
  await fs.readFile('lib/articles.generated.json', 'utf8'),
);
const entries = [
  ...['/', '/tool', '/articles', '/excel-formulas', '/about', '/privacy'].map(
    (path) => ({
      path,
    }),
  ),
  ...tools.map((tool) => ({ path: '/tool/' + tool.slug })),
  ...articles.map((article) => ({
    path: '/articles/' + article.slug,
    lastmod: article.updatedDate,
  })),
];
const escape = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
await fs.writeFile(
  'public/sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries
      .map(
        ({ path, lastmod }) =>
          '<url><loc>' +
          escape('https://hubplc.com' + path) +
          '</loc>' +
          (lastmod ? '<lastmod>' + escape(lastmod) + '</lastmod>' : '') +
          '</url>',
      )
      .join('\n') +
    '\n</urlset>\n',
);
console.log('Prepared sitemap with ' + entries.length + ' URLs.');
