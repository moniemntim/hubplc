const scan = (
  qty,
  wait_ms,
  {
    confirm = false,
    acceptRequest = false,
    complete = false,
    abort = false,
  } = {},
) => ({
  edit: { qty, wait_ms },
  confirm,
  acceptRequest,
  complete,
  abort,
});

export const initialConfirmed = { qty: 100, wait_ms: 500, version: 7 };

export const demoScans = [
  scan(120, 700),
  scan(120, 700, { confirm: true, acceptRequest: true }),
  scan(120, 700, { confirm: true, acceptRequest: true }),
  scan(0, 700),
  scan(0, 700, { confirm: true }),
  scan(200, 900),
  scan(200, 900, { confirm: true }),
  scan(200, 900, { complete: true }),
  scan(200, 900),
  scan(200, 900, { acceptRequest: true }),
  scan(200, 900, { acceptRequest: true }),
  scan(200, 900, { abort: true }),
];

export const expectedDemo = [
  '1 IDLE confirmed=7 snapshot=- snapshot_values=- confirm=none accept=none terminal=none',
  '2 IDLE confirmed=8 snapshot=- snapshot_values=- confirm=accepted accept=deferred terminal=none',
  '3 RUN confirmed=8 snapshot=8 snapshot_values=120/700 confirm=none accept=accepted terminal=none',
  '4 RUN confirmed=8 snapshot=8 snapshot_values=120/700 confirm=none accept=none terminal=none',
  '5 RUN confirmed=8 snapshot=8 snapshot_values=120/700 confirm=rejected accept=none terminal=none',
  '6 RUN confirmed=8 snapshot=8 snapshot_values=120/700 confirm=none accept=none terminal=none',
  '7 RUN confirmed=9 snapshot=8 snapshot_values=120/700 confirm=accepted accept=none terminal=none',
  '8 IDLE confirmed=9 snapshot=- snapshot_values=- confirm=none accept=none terminal=completed',
  '9 IDLE confirmed=9 snapshot=- snapshot_values=- confirm=none accept=none terminal=none',
  '10 RUN confirmed=9 snapshot=9 snapshot_values=200/900 confirm=none accept=accepted terminal=none',
  '11 RUN confirmed=9 snapshot=9 snapshot_values=200/900 confirm=none accept=none terminal=none',
  '12 IDLE confirmed=9 snapshot=- snapshot_values=- confirm=none accept=none terminal=aborted',
];

export { scan };
