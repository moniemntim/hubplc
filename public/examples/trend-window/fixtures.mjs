import { DAY_MS } from './model.mjs';
export const tenStart = 10 * 60 * 60 * 1000;
export const tenEnd = tenStart + 10 * 60 * 1000;
export const segments = [
  {
    startMs: 0,
    endMs: tenStart + 9 * 60 * 1000,
    valueTenths: 600,
    quality: 'Good',
  },
  {
    startMs: tenStart + 9 * 60 * 1000,
    endMs: tenEnd,
    valueTenths: 750,
    quality: 'Good',
  },
  { startMs: tenEnd, endMs: DAY_MS, valueTenths: 600, quality: 'Good' },
];
export const rawSeed = { atMs: 0, valueTenths: 600 };
export const rawChanges = [
  { atMs: tenStart + 9 * 60 * 1000, valueTenths: 750 },
];
