const scan = (nowMs, overrides = {}) => ({
  nowMs,
  requestA: false,
  requestB: false,
  cancelA: false,
  cancelB: false,
  release: null,
  resetFault: false,
  moduleReady: false,
  safetyConfirmed: false,
  ...overrides,
});

export const demoScans = [
  scan(0, { requestA: true, requestB: true }),
  scan(1, { requestA: true, requestB: true }),
  scan(2, {
    requestA: true,
    requestB: true,
    release: { owner: 'A', jobSeq: 1 },
  }),
  scan(3, { requestB: true }),
  scan(4, { requestB: true, cancelB: true }),
  scan(5, { requestB: true, release: { owner: 'B', jobSeq: 2 } }),
  scan(6),
  scan(7, { requestA: true }),
  scan(17, { requestA: true, requestB: true }),
  scan(18, {
    requestB: true,
    resetFault: true,
    safetyConfirmed: true,
  }),
  scan(19, {
    requestB: true,
    resetFault: true,
    moduleReady: true,
    safetyConfirmed: true,
  }),
  scan(20, { requestB: true }),
  scan(21, {
    requestB: true,
    resetFault: true,
    moduleReady: true,
    safetyConfirmed: true,
  }),
  scan(22, { requestB: true }),
];

export const expectedDemo = [
  '1 now=0 owner=A/1 pendingA=- pendingB=2 lock=false enable=A grant=A/1 event=granted_A_1',
  '2 now=1 owner=A/1 pendingA=- pendingB=2 lock=false enable=A grant=- event=none',
  '3 now=2 owner=- pendingA=- pendingB=2 lock=false enable=- grant=- event=released_A_1',
  '4 now=3 owner=B/2 pendingA=- pendingB=- lock=false enable=B grant=B/2 event=granted_B_2',
  '5 now=4 owner=B/2 pendingA=- pendingB=- lock=false enable=B grant=- event=owner_B_cancel_requires_controlled_stop',
  '6 now=5 owner=- pendingA=- pendingB=- lock=false enable=- grant=- event=released_B_2',
  '7 now=6 owner=- pendingA=- pendingB=- lock=false enable=- grant=- event=none',
  '8 now=7 owner=A/3 pendingA=- pendingB=- lock=false enable=A grant=A/3 event=granted_A_3',
  '9 now=17 owner=A/3 pendingA=- pendingB=4 lock=true enable=- grant=- event=timeout_A_3',
  '10 now=18 owner=A/3 pendingA=- pendingB=4 lock=true enable=- grant=- event=fault_reset_conditions_not_met',
  '11 now=19 owner=A/3 pendingA=- pendingB=4 lock=true enable=- grant=- event=none',
  '12 now=20 owner=A/3 pendingA=- pendingB=4 lock=true enable=- grant=- event=none',
  '13 now=21 owner=- pendingA=- pendingB=4 lock=false enable=- grant=- event=fault_reset_owner_cleared',
  '14 now=22 owner=B/4 pendingA=- pendingB=- lock=false enable=B grant=B/4 event=granted_B_4',
];

export { scan };
