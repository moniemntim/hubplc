import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TeachingAuthority,
  request,
} from '../public/examples/authorization/model.mjs';
import {
  createDraft,
  reviewDraft,
} from '../public/examples/authorization/draft.mjs';
void test('unsent expiry, same-person review, context/version conflicts and other-person hiding do not write', () => {
  const s = new TeachingAuthority();
  const initial = { ...s.read('S', 'A', 590000), unit: 'C' };
  const d = createDraft(initial, 95, 590000);
  assert.equal(
    reviewDraft(d, s.read('S', 'A', 600000), 600000).state,
    'REAUTH_REQUIRED_UNSENT',
  );
  assert.equal(
    s.submit('S', request(), 600000).decision,
    'SESSION_EXPIRED_OR_UNKNOWN',
  );
  s.renewFixtureSession('S', 600001);
  const read = { ...s.read('S', 'A', 600002), unit: 'C' };
  assert.equal(reviewDraft(d, read, 600002).state, 'READY_FOR_EXPLICIT_SUBMIT');
  assert.equal(
    reviewDraft(d, { ...read, unit: 'F' }, 600002).state,
    'CONTEXT_CHANGED',
  );
  assert.equal(
    reviewDraft(d, { ...read, revision: 2, value: 92 }, 600002).state,
    'VERSION_CHANGED',
  );
  s.renewFixtureSession('O', 600003);
  assert.deepEqual(
    reviewDraft(d, { ...s.read('O', 'A', 600004), unit: 'C' }, 600004),
    { state: 'OTHER_USER_HIDDEN' },
  );
  assert.equal(reviewDraft(d, read, 890000).state, 'DRAFT_EXPIRED');
  assert.equal(s.inspect().device.writes, 0);
});
void test('submitted operation survives UI expiry and matched lookup is scoped to current identity', () => {
  const s = new TeachingAuthority();
  const d = createDraft({ ...s.read('S', 'A', 0), unit: 'C' }, 95, 0);
  s.submit('S', request('SENT'), 1);
  s.execute('SENT', 2);
  assert.equal(
    reviewDraft(d, s.read('S', 'A', 600000), 600000, 'SENT').state,
    'SENT_RESULT_REQUIRED',
  );
  assert.equal(
    s.lookup('S', 'SENT', 600000).decision,
    'SESSION_EXPIRED_OR_UNKNOWN',
  );
  s.renewFixtureSession('S', 600001);
  assert.equal(s.lookup('S', 'SENT', 600002).appliedRevision, 2);
  s.renewFixtureSession('O', 600003);
  assert.equal(s.lookup('O', 'SENT', 600004).decision, 'RESULT_NOT_AVAILABLE');
  assert.equal(s.inspect().device.writes, 1);
});
void test('pending at expiration is distinct from an already applied operation', () => {
  const s = new TeachingAuthority();
  s.submit('S', request('Q'), 1);
  assert.equal(s.execute('Q', 600000).decision, 'SESSION_EXPIRED_OR_UNKNOWN');
  s.renewFixtureSession('S', 600001);
  assert.equal(s.lookup('S', 'Q', 600002).status, 'REJECTED');
  assert.equal(s.inspect().device.writes, 0);
  assert.throws(() => s.renewFixtureSession('BAD', 600003), /invalid/);
});
