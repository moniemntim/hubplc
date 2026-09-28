import assert from 'node:assert/strict';
import { TeachingAuthority, request } from './model.mjs';
import { createDraft, reviewDraft } from './draft.mjs';
const s = new TeachingAuthority();
const d = createDraft({ ...s.read('S', 'A', 590000), unit: 'C' }, 95, 590000);
assert.equal(
  reviewDraft(d, s.read('S', 'A', 600000), 600000).state,
  'REAUTH_REQUIRED_UNSENT',
);
assert.equal(
  s.submit('S', request(), 600000).decision,
  'SESSION_EXPIRED_OR_UNKNOWN',
);
s.renewFixtureSession('S', 600001);
const current = { ...s.read('S', 'A', 600002), unit: 'C' };
assert.equal(
  reviewDraft(d, current, 600002).state,
  'READY_FOR_EXPLICIT_SUBMIT',
);
assert.equal(
  reviewDraft(d, { ...current, revision: 2, value: 92 }, 600002).state,
  'VERSION_CHANGED',
);
assert.equal(
  reviewDraft(d, { ...current, unit: 'F' }, 600002).state,
  'CONTEXT_CHANGED',
);
assert.equal(
  reviewDraft(d, { ...current, user: 'O' }, 600002).state,
  'OTHER_USER_HIDDEN',
);
assert.equal(reviewDraft(d, current, 890000).state, 'DRAFT_EXPIRED');
assert.equal(s.inspect().device.writes, 0);
s.submit('S', request('SENT'), 890001);
s.execute('SENT', 890002);
assert.equal(
  reviewDraft(d, current, 890003, 'SENT').state,
  'SENT_RESULT_REQUIRED',
);
assert.equal(s.lookup('S', 'SENT', 890004).appliedRevision, 2);
assert.equal(s.inspect().device.writes, 1);
console.log('draft self-test: PASS');
