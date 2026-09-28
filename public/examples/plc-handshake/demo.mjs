import { handshakeFixtures, runFixture } from './fixtures.mjs';

for (const [name, steps] of Object.entries(handshakeFixtures)) {
  console.log(`\n${name}`);
  console.table(
    runFixture(steps).map(({ label, input, state, signals }) => ({
      atMs: input.nowMs,
      label,
      mode: state.mode,
      currentId: state.current?.requestId ?? null,
      snapshot: JSON.stringify(state.current?.payload ?? null),
      accept: signals.accept,
      busy: signals.busy,
      done: signals.done,
      fail: signals.fail,
      resultId: signals.resultId,
      rejectId: signals.rejectId,
      rejectReason: signals.rejectReason,
      events: state.scanEvents.map((event) => event.code).join(', '),
    })),
  );
}
