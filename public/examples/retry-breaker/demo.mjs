import {
  acquirePermit,
  completePermit,
  initialBreaker,
  makeBackoffPlan,
  simulateRetry,
} from './retry-breaker-model.mjs';

const samples = [0.63, 0.705, 0.05, 0.8375, 0.35];
console.log('backoff retry,cap_ms,sample,wait_ms');
for (const item of makeBackoffPlan(samples))
  console.log(
    `${item.retryNumber},${item.capMs},${item.sample},${item.waitMs}`,
  );

const retry = simulateRetry({
  callElapsedMs: [100, 200, 300, 400, 500, 600],
  deadlineMs: 13000,
  samples,
});
console.log(
  'retry attempt,start_ms,call_ms,wait_requested_ms,wait_observed_ms,ended_by',
);
for (const item of retry.attempts)
  console.log(
    `${item.attempt},${item.startedAtMs},${item.observedCallMs},${item.requestedWaitMs},${item.observedWaitMs},${item.endedBy ?? 'continue'}`,
  );
console.log(
  `retry ended_at_ms=${retry.endedAtMs} attempts_include_original=true`,
);

const failToOpen = () => {
  let state = initialBreaker();
  for (const nowMs of [0, 100, 200, 300, 400]) {
    const granted = acquirePermit(state, nowMs);
    state = completePermit(
      granted.state,
      nowMs,
      granted.permit.token,
      'RETRYABLE_FAILURE',
    ).state;
  }
  return state;
};

let state = failToOpen();
console.log(
  `breaker after_five_failures=${state.phase} open_until_ms=${state.openUntilMs}`,
);
const rejectedOpen = acquirePermit(state, 1000);
state = rejectedOpen.state;
console.log(`breaker open_reject=${rejectedOpen.decision}`);
let probe = acquirePermit(state, 30400);
state = probe.state;
console.log(
  `breaker probe=${probe.decision} token=${probe.permit.token} deadline_ms=${probe.permit.deadlineMs}`,
);
const rejectedSecond = acquirePermit(state, 30400);
state = rejectedSecond.state;
console.log(`breaker second_probe=${rejectedSecond.decision}`);
let completed = completePermit(state, 31400, probe.permit.token, 'SUCCESS');
state = completed.state;
console.log(
  `breaker equality=${completed.decision} phase=${state.phase} open_until_ms=${state.openUntilMs}`,
);
const oldReply = completePermit(state, 31401, probe.permit.token, 'SUCCESS');
state = oldReply.state;
console.log(`breaker old_reply=${oldReply.decision}`);

state = failToOpen();
probe = acquirePermit(state, 30400);
completed = completePermit(probe.state, 30450, probe.permit.token, 'SUCCESS');
console.log(
  `breaker probe_success=${completed.decision} phase=${completed.state.phase}`,
);
