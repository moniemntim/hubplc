import { TeachingAuthority } from './model.mjs';
import { createDraft, reviewDraft } from './draft.mjs';
const user = 'S';
const now = 600002;
const source = new TeachingAuthority();
const first = { ...source.read('S', 'A', 590000), unit: 'C' };
const draft = createDraft(first, 95, 590000);
source.renewFixtureSession(user, now);
console.log(
  JSON.stringify(
    reviewDraft(draft, { ...source.read(user, 'A', now), unit: 'C' }, now),
  ),
);
console.log(JSON.stringify(source.inspect().device));
