import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  initialState,
  MAX_VERSION,
  parameterScan,
} from '../public/examples/parameter-snapshot/parameter-snapshot-model.mjs';

const input = (edit, overrides = {}) => ({
  edit,
  confirm: false,
  acceptRequest: false,
  complete: false,
  abort: false,
  ...overrides,
});

void test('confirmation validates the complete boundary record and preserves version on rejection', () => {
  let state = initialState();
  state = parameterScan(
    state,
    input({ qty: 0, wait_ms: 500 }, { confirm: true }),
  );
  assert.deepEqual(state.confirmation, {
    status: 'rejected',
    reason: 'qty_out_of_range',
  });
  assert.deepEqual(state.confirmed, { qty: 100, wait_ms: 500, version: 7 });

  state = parameterScan(
    state,
    input({ qty: 120, wait_ms: 700 }, { confirm: true }),
  );
  assert.equal(state.confirmation.status, 'none');
  assert.equal(state.confirmed.version, 7);

  state = parameterScan(state, input({ qty: 120, wait_ms: 700 }));
  state = parameterScan(
    state,
    input({ qty: 120, wait_ms: 700 }, { confirm: true }),
  );
  assert.deepEqual(state.confirmed, { qty: 120, wait_ms: 700, version: 8 });

  state = parameterScan(state, input({ qty: 120 }, { confirm: false }));
  state = parameterScan(state, input({ qty: 120 }, { confirm: true }));
  assert.deepEqual(state.confirmation, {
    status: 'rejected',
    reason: 'edit_shape_invalid',
  });
  assert.equal(state.confirmed.version, 8);
});

void test('both parameter boundaries are accepted, while a wait boundary violation is rejected', () => {
  let state = initialState();
  state = parameterScan(
    state,
    input({ qty: 1, wait_ms: 0 }, { confirm: true }),
  );
  assert.deepEqual(state.confirmed, { qty: 1, wait_ms: 0, version: 8 });
  state = parameterScan(state, input({ qty: 1000, wait_ms: 60_000 }));
  state = parameterScan(
    state,
    input({ qty: 1000, wait_ms: 60_000 }, { confirm: true }),
  );
  assert.deepEqual(state.confirmed, {
    qty: 1000,
    wait_ms: 60_000,
    version: 9,
  });
  state = parameterScan(state, input({ qty: 1000, wait_ms: 60_001 }));
  state = parameterScan(
    state,
    input({ qty: 1000, wait_ms: 60_001 }, { confirm: true }),
  );
  assert.deepEqual(state.confirmation, {
    status: 'rejected',
    reason: 'wait_ms_out_of_range',
  });
  assert.equal(state.confirmed.version, 9);
});

void test('strict submission and control types reject NaN, strings, extras, and do not mutate input', () => {
  let state = initialState();
  state = parameterScan(
    state,
    input({ qty: Number.NaN, wait_ms: 500 }, { confirm: true }),
  );
  assert.equal(state.confirmation.reason, 'qty_not_safe_integer');
  state = parameterScan(state, input({ qty: '100', wait_ms: 500 }));
  state = parameterScan(
    state,
    input({ qty: '100', wait_ms: 500 }, { confirm: true }),
  );
  assert.equal(state.confirmation.reason, 'qty_not_safe_integer');
  state = parameterScan(state, input({ qty: 100, wait_ms: 500 }));
  state = parameterScan(
    state,
    input({ qty: 100, wait_ms: 500, unexpected: true }, { confirm: true }),
  );
  assert.equal(state.confirmation.reason, 'edit_shape_invalid');

  const submitted = input({ qty: 120, wait_ms: 700 });
  const before = structuredClone(submitted);
  state = parameterScan(state, submitted);
  assert.deepEqual(submitted, before);
  assert.throws(
    () =>
      parameterScan(state, input({ qty: 120, wait_ms: 700 }, { confirm: 1 })),
    /confirm must be boolean/,
  );
});

void test('same-scan confirmation defers held acceptance and starts exactly one new-version job', () => {
  let state = initialState();
  state = parameterScan(
    state,
    input({ qty: 120, wait_ms: 700 }, { confirm: true, acceptRequest: true }),
  );
  assert.deepEqual(state.confirmation, {
    status: 'accepted',
    reason: 'confirmed_version_8',
  });
  assert.deepEqual(state.acceptance, {
    status: 'deferred',
    reason: 'confirmation_same_scan',
  });
  assert.equal(state.jobSnapshot, null);

  state = parameterScan(
    state,
    input({ qty: 120, wait_ms: 700 }, { confirm: true, acceptRequest: true }),
  );
  assert.deepEqual(state.jobSnapshot, { qty: 120, wait_ms: 700, version: 8 });
  assert.equal(state.acceptance.status, 'accepted');

  state = parameterScan(
    state,
    input({ qty: 120, wait_ms: 700 }, { acceptRequest: true }),
  );
  assert.equal(state.acceptance.status, 'none');
  assert.deepEqual(state.jobSnapshot, { qty: 120, wait_ms: 700, version: 8 });
});

void test('a deferred request released before acknowledgement cannot start a job', () => {
  let state = initialState();
  state = parameterScan(
    state,
    input({ qty: 120, wait_ms: 700 }, { confirm: true, acceptRequest: true }),
  );
  state = parameterScan(state, input({ qty: 120, wait_ms: 700 }));
  assert.deepEqual(state.acceptance, {
    status: 'rejected',
    reason: 'accept_request_released_before_ack',
  });
  assert.equal(state.jobSnapshot, null);
});

void test('terminal signals in IDLE consume new and deferred acceptance requests', () => {
  let state = initialState();
  state = parameterScan(
    state,
    input({ qty: 100, wait_ms: 500 }, { complete: true, acceptRequest: true }),
  );
  assert.deepEqual(state.terminal, {
    status: 'ignored',
    reason: 'no_running_job',
  });
  assert.deepEqual(state.acceptance, {
    status: 'rejected',
    reason: 'terminal_signal_active',
  });
  assert.equal(state.jobSnapshot, null);
  state = parameterScan(
    state,
    input({ qty: 100, wait_ms: 500 }, { acceptRequest: true }),
  );
  assert.equal(state.acceptance.status, 'none');
  state = parameterScan(state, input({ qty: 100, wait_ms: 500 }));
  state = parameterScan(
    state,
    input({ qty: 100, wait_ms: 500 }, { acceptRequest: true }),
  );
  assert.equal(state.jobState, 'RUN');

  state = initialState();
  state = parameterScan(
    state,
    input({ qty: 120, wait_ms: 700 }, { confirm: true, acceptRequest: true }),
  );
  state = parameterScan(
    state,
    input({ qty: 120, wait_ms: 700 }, { complete: true, acceptRequest: true }),
  );
  assert.equal(state.acceptPending, false);
  assert.equal(state.acceptance.reason, 'terminal_signal_active');
  assert.equal(state.jobSnapshot, null);
});

void test('RUN holds its snapshot, then complete and abort clear it before another request', () => {
  let state = initialState();
  state = parameterScan(
    state,
    input({ qty: 100, wait_ms: 500 }, { acceptRequest: true }),
  );
  assert.equal(state.jobState, 'RUN');
  assert.equal(state.jobSnapshot.version, 7);

  state = parameterScan(state, input({ qty: 200, wait_ms: 900 }));
  state = parameterScan(
    state,
    input({ qty: 200, wait_ms: 900 }, { confirm: true }),
  );
  assert.deepEqual(state.confirmed, { qty: 200, wait_ms: 900, version: 8 });
  assert.deepEqual(state.jobSnapshot, { qty: 100, wait_ms: 500, version: 7 });
  state = parameterScan(
    state,
    input({ qty: 200, wait_ms: 900 }, { acceptRequest: true }),
  );
  assert.deepEqual(state.acceptance, {
    status: 'rejected',
    reason: 'job_running',
  });

  state = parameterScan(
    state,
    input({ qty: 200, wait_ms: 900 }, { complete: true }),
  );
  assert.equal(state.jobState, 'IDLE');
  assert.equal(state.jobSnapshot, null);
  assert.deepEqual(state.lastJob, {
    outcome: 'completed',
    snapshot: { qty: 100, wait_ms: 500, version: 7 },
  });

  state = parameterScan(state, input({ qty: 200, wait_ms: 900 }));
  state = parameterScan(
    state,
    input({ qty: 200, wait_ms: 900 }, { acceptRequest: true }),
  );
  assert.equal(state.jobSnapshot.version, 8);
  state = parameterScan(
    state,
    input({ qty: 200, wait_ms: 900 }, { abort: true }),
  );
  assert.equal(state.jobSnapshot, null);
  assert.equal(state.lastJob.outcome, 'aborted');
});

void test('invalid confirmation and version exhaustion cannot create a job from stale parameters', () => {
  let state = initialState();
  state = parameterScan(
    state,
    input({ qty: 0, wait_ms: 500 }, { confirm: true, acceptRequest: true }),
  );
  assert.deepEqual(state.acceptance, {
    status: 'rejected',
    reason: 'confirmation_rejected',
  });
  assert.equal(state.jobSnapshot, null);

  state = initialState({
    confirmed: { qty: 1000, wait_ms: 60_000, version: MAX_VERSION },
  });
  state = parameterScan(
    state,
    input({ qty: 1, wait_ms: 0 }, { confirm: true }),
  );
  assert.deepEqual(state.confirmation, {
    status: 'rejected',
    reason: 'version_exhausted',
  });
  assert.equal(state.confirmed.version, MAX_VERSION);
});

void test('model rejects ambiguous terminal signals and downloaded scripts pass', () => {
  assert.throws(
    () =>
      parameterScan(
        initialState(),
        input({ qty: 100, wait_ms: 500 }, { complete: true, abort: true }),
      ),
    /complete and abort cannot both be true/,
  );
  const folder = 'public/examples/parameter-snapshot';
  assert.match(
    execFileSync(process.execPath, ['self-test.mjs'], {
      cwd: folder,
      encoding: 'utf8',
    }),
    /self-test: PASS/,
  );
  assert.match(
    execFileSync(process.execPath, ['demo.mjs'], {
      cwd: folder,
      encoding: 'utf8',
    }),
    /demo: PASS/,
  );
});
