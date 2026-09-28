import { elapsed, timeout } from './tick.mjs';
const start = 250;
const now = 14;
const gapBound = 20;
const nowBoot = 'A';
const result = elapsed({ start, now, gapBound, nowBoot });
console.log(JSON.stringify({ ...result, timeout15: timeout(result, 15) }));
