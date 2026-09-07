import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Load the actual TSX components through the project's installed transformer.
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { '@': process.cwd() } },
});
try {
  const load = (name) => server.ssrLoadModule(`/components/ui/${name}.tsx`);
  const { InputGroup, InputGroupAddon, InputGroupInput, InputGroupTextarea } =
    await load('input-group');
  for (const Control of [InputGroupInput, InputGroupTextarea]) {
    for (const id of [undefined, 'explicit-control']) {
      const html = renderToStaticMarkup(
        h(
          InputGroup,
          null,
          h(InputGroupAddon, null, 'Amount'),
          h(Control, { id }),
        ),
      );
      assert.match(html, /^<fieldset/);
      const labelId = html.match(/<label[^>]*for="([^"]+)"/)?.[1];
      const controlId = html.match(/<(?:input|textarea)[^>]*id="([^"]+)"/)?.[1];
      assert.ok(labelId);
      assert.equal(labelId, controlId);
      if (id) assert.equal(controlId, id);
    }
  }
  const { Label } = await load('label');
  assert.match(
    renderToStaticMarkup(h(Label, { htmlFor: 'amount' }, 'Amount')),
    /for="amount"[^>]*>Amount<\/label>/,
  );
  const { PaginationLink } = await load('pagination');
  const link = renderToStaticMarkup(
    h(PaginationLink, { href: '/page/2', isActive: true }, '2'),
  );
  assert.match(link, /aria-current="page"/);
  assert.match(link, /href="\/page\/2"/);
  assert.match(link, />2<\/a>/);
  const { BreadcrumbPage } = await load('breadcrumb');
  const current = renderToStaticMarkup(h(BreadcrumbPage, null, 'Current'));
  assert.match(current, /aria-current="page"/);
  assert.doesNotMatch(current, /role="link"/);
  const { ItemGroup } = await load('item');
  assert.match(
    renderToStaticMarkup(
      h(ItemGroup, null, h('div', null, 'One'), h('div', null, 'Two')),
    ),
    /^<ul[^>]*><li><div>One<\/div><\/li><li><div>Two<\/div><\/li><\/ul>$/,
  );
  const { Spinner } = await load('spinner');
  const spinner = renderToStaticMarkup(
    h(Spinner, { 'aria-label': 'Loading report' }),
  );
  assert.match(spinner, /^<output[^>]*aria-label="Loading report"/);
  assert.match(spinner, /<svg[^>]*aria-hidden="true"/);
  console.log(
    'PASS UI semantics: input/textarea label associations, explicit IDs, pagination content, breadcrumb, list and loading status.',
  );
} finally {
  await server.close();
}
