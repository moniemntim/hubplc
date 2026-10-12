import { localeFromCountry } from '../lib/locale';

interface Env {
  ASSETS: Fetcher;
}

const legacyToolRedirects: Readonly<Record<string, string>> = {
  '/tool/volts-to-watts': '/tool/amps-to-watts',
  '/tool/volts-to-watts/': '/tool/amps-to-watts',
  '/tool/volts-to-amps': '/tool/watts-to-amps',
  '/tool/volts-to-amps/': '/tool/watts-to-amps',
  '/tool/watts-to-kva': '/tool/watts-to-va',
  '/tool/watts-to-kva/': '/tool/watts-to-va',
  '/tool/kva-to-va': '/tool/va-to-kva',
  '/tool/kva-to-va/': '/tool/va-to-kva',
  '/tool/kw-to-kwh': '/tool/energy-consumption',
  '/tool/kw-to-kwh/': '/tool/energy-consumption',
  '/tool/watts-to-kwh': '/tool/energy-consumption',
  '/tool/watts-to-kwh/': '/tool/energy-consumption',
  '/tool/kwh-to-watts': '/tool/kwh-to-kw',
  '/tool/kwh-to-watts/': '/tool/kwh-to-kw',
};

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const redirectPath = legacyToolRedirects[url.pathname];
    if (redirectPath) {
      const destination = new URL(redirectPath, url);
      destination.search = url.search;
      return new Response(null, {
        status: 308,
        headers: { Location: destination.toString() },
      });
    }

    if (url.pathname !== '/api/locale') return env.ASSETS.fetch(request);
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return new Response(null, {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });

    const country = request.cf?.country ?? null;
    const locale = localeFromCountry(
      country,
      request.headers.get('accept-language'),
    );
    const body = request.method === 'HEAD' ? null : JSON.stringify({ locale });
    return new Response(body, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': 'application/json; charset=utf-8',
        Vary: 'Accept-Language',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
} satisfies ExportedHandler<Env>;
