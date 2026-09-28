import { runFixture, scenarioFixtures, boundaryFixtures } from './fixtures.mjs';

for (const [name, steps] of Object.entries({
  ...scenarioFixtures,
  ...boundaryFixtures,
})) {
  console.log(`\n${name}`);
  console.table(
    runFixture(steps).map(({ label, input, state }) => ({
      atMs: input.nowMs,
      label,
      state: state.state,
      currentRequestId: state.currentRequestId,
      resultId: state.result?.requestId ?? null,
      outputActive: state.outputRequestActive,
      reason: state.reason,
      events: state.scanEvents.map((event) => event.code).join(', '),
    })),
  );
}
