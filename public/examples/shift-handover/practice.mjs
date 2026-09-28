import { Handover } from './model.mjs';
import { at, items, request } from './fixtures.mjs';
const changed = structuredClone(items);
changed[0].quality = 'Bad';
const h = new Handover({ handoverId: 'PRACTICE', items: changed, at });
console.log(JSON.stringify(h.act(request('H1', 1))));
console.log(JSON.stringify(h.report(at)));
