import fs from 'node:fs/promises';
import { tools } from '../lib/tools/registry.ts';
const articles = JSON.parse(
  await fs.readFile('lib/articles.generated.json', 'utf8'),
);
const paths = [
  '/',
  '/tool',
  '/articles',
  '/about',
  '/privacy',
  ...tools.map((tool) => '/tool/' + tool.slug),
  ...articles.map((article) => '/articles/' + article.slug),
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
    paths
      .map(
        (path) =>
          '<url><loc>' + escape('https://hubplc.com' + path) + '</loc></url>',
      )
      .join('\n') +
    '\n</urlset>\n',
);
console.log('Prepared sitemap with ' + paths.length + ' URLs.');
