import assert from 'node:assert/strict';
import test from 'node:test';
import { ipVersion, networkInfoResponse } from '../lib/tools/network-info.ts';

void test('network lookup validates IPv4 and IPv6 and rejects lists, zones, URLs and malformed addresses', () => {
  for (const ip of ['203.0.113.10', '127.0.0.1', '0.0.0.0'])
    assert.equal(ipVersion(ip), 4);
  for (const ip of ['2001:db8::1', '::1', '::ffff:192.0.2.1'])
    assert.equal(ipVersion(ip), 6);
  for (const ip of [
    '',
    '999.0.0.1',
    '01.2.3.4',
    '1.2.3',
    'a:b:c',
    '203.0.113.1, 203.0.113.2',
    'fe80::1%1',
    'https://example.com',
  ])
    assert.equal(ipVersion(ip), null, ip);
});
void test('lookup uses Cloudflare edge headers, prefers original IPv6 and disables shared caching', async () => {
  const response = networkInfoResponse(
    new Request('https://hubplc.com/api/network-info', {
      headers: {
        'cf-connecting-ip': '203.0.113.10',
        'x-forwarded-for': '192.0.2.5',
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(await response.json(), { ip: '203.0.113.10', version: 4 });
  const v6 = networkInfoResponse(
    new Request('https://hubplc.com/api/network-info', {
      headers: {
        'cf-connecting-ip': '240.1.2.3',
        'cf-connecting-ipv6': '2001:db8::1',
      },
    }),
  );
  assert.deepEqual(await v6.json(), { ip: '2001:db8::1', version: 6 });
});
void test('lookup fails closed without an edge address, accepts HEAD and refuses mutations', async () => {
  const missing = networkInfoResponse(
    new Request('https://hubplc.com/api/network-info', {
      headers: { 'x-forwarded-for': '203.0.113.5' },
    }),
  );
  assert.equal(missing.status, 503);
  assert.deepEqual(await missing.json(), { error: 'address_unavailable' });
  const head = networkInfoResponse(
    new Request('https://hubplc.com/api/network-info', {
      method: 'HEAD',
      headers: { 'cf-connecting-ip': '203.0.113.10' },
    }),
  );
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(
    networkInfoResponse(
      new Request('https://hubplc.com/api/network-info', { method: 'POST' }),
    ).status,
    405,
  );
});
