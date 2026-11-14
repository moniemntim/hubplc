export type NetworkInfo = { ip: string; version: 4 | 6 };

export function ipVersion(ip: string): 4 | 6 | null {
  if (/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(ip))
    return ip.split('.').every((part) => Number(part) <= 255) ? 4 : null;
  if (!ip.includes(':') || !/^[\da-f:.]+$/i.test(ip)) return null;
  try {
    return new URL(`http://[${ip}]/`).hostname.startsWith('[') ? 6 : null;
  } catch {
    return null;
  }
}

export function networkInfoResponse(request: Request): Response {
  const headers = {
    'Cache-Control': 'private, no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  };
  if (!['GET', 'HEAD'].includes(request.method))
    return new Response(null, {
      status: 405,
      headers: { ...headers, Allow: 'GET, HEAD' },
    });
  // Cloudflare supplies these at the edge. Do not trust caller-provided X-Forwarded-For.
  // Prefer the original IPv6 when Cloudflare's Pseudo IPv4 overwrites the IPv4 header.
  const originalV6 = request.headers.get('cf-connecting-ipv6') ?? '';
  const ip =
    ipVersion(originalV6) === 6
      ? originalV6
      : (request.headers.get('cf-connecting-ip') ?? '');
  const version = ipVersion(ip);
  const body = version ? { ip, version } : { error: 'address_unavailable' };
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(body), {
    status: version ? 200 : 503,
    headers,
  });
}
