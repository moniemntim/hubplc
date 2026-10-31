import { localeFromCountry } from '../lib/locale';
import { resolveLegacyToolUrl } from '../lib/tools/legacy-tool-redirects';

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const destination = resolveLegacyToolUrl(url);
    if (destination) {
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
