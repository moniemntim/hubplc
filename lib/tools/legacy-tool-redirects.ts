/**
 * Retired, single-purpose calculator URLs.  Keep this list flat so every old
 * address reaches the maintained calculator in exactly one redirect.
 */
export const legacyToolRedirects = {
  '/tool/amps-to-watts': '/tool/ac-power-converter?task=amps-to-watts',
  '/tool/amps-to-kilowatts': '/tool/ac-power-converter?task=amps-to-kilowatts',
  '/tool/amps-to-va': '/tool/ac-power-converter?task=amps-to-va',
  '/tool/amps-to-kva': '/tool/ac-power-converter?task=amps-to-kva',
  '/tool/watts-to-amps': '/tool/ac-power-converter?task=watts-to-amps',
  '/tool/kw-to-amps': '/tool/ac-power-converter?task=kw-to-amps',
  '/tool/kva-to-amps': '/tool/ac-power-converter?task=kva-to-amps',
  '/tool/mva-to-amps': '/tool/ac-power-converter?task=mva-to-amps',
  '/tool/watts-to-volts': '/tool/ac-power-converter?task=watts-to-volts',
  '/tool/kw-to-volts': '/tool/ac-power-converter?task=kw-to-volts',
  '/tool/va-to-watts': '/tool/ac-power-converter?task=va-to-watts',
  '/tool/kva-to-kw': '/tool/ac-power-converter?task=kva-to-kw',
  '/tool/watts-to-va': '/tool/ac-power-converter?task=watts-to-va',
  '/tool/kw-to-kva': '/tool/ac-power-converter?task=kw-to-kva',
  '/tool/va-to-kva': '/tool/ac-power-converter?task=va-to-kva',
  '/tool/kwh-to-kw': '/tool/energy-cost?task=kwh-to-kw',
  '/tool/energy-consumption': '/tool/energy-cost?task=energy-consumption',
  '/tool/electricity-cost': '/tool/energy-cost?task=electricity-cost',
  '/tool/volts-to-watts': '/tool/ac-power-converter?task=amps-to-watts',
  '/tool/volts-to-amps': '/tool/ac-power-converter?task=watts-to-amps',
  '/tool/watts-to-kva': '/tool/ac-power-converter?task=watts-to-va',
  '/tool/kva-to-va': '/tool/ac-power-converter?task=va-to-kva',
  '/tool/kw-to-kwh': '/tool/energy-cost?task=energy-consumption',
  '/tool/watts-to-kwh': '/tool/energy-cost?task=energy-consumption',
  '/tool/kwh-to-watts': '/tool/energy-cost?task=kwh-to-kw',
} as const;

/**
 * Resolves only allowlisted legacy paths. Source query values survive except
 * `task`, which is always replaced by the fixed preset for that retired URL.
 */
export function resolveLegacyToolUrl(url: URL): URL | null {
  const pathname =
    url.pathname.length > 1 && url.pathname.endsWith('/')
      ? url.pathname.slice(0, -1)
      : url.pathname;
  const redirectPath =
    legacyToolRedirects[pathname as keyof typeof legacyToolRedirects];
  if (!redirectPath) return null;

  const destination = new URL(redirectPath, url);
  const task = destination.searchParams.get('task');
  if (!task) return null;

  for (const [key, value] of url.searchParams)
    if (key !== 'task') destination.searchParams.append(key, value);
  destination.searchParams.set('task', task);
  return destination;
}
