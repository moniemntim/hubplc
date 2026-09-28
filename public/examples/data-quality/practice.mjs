import { createDataQualityMonitor, receiveGood, tick } from './model.mjs';
// Change only this observation time, then rerun.
const observeAtMs = 599;
const sample = receiveGood(createDataQualityMonitor(), {
  nowMs: 0,
  epoch: 1,
  value: 23.4,
  sourceAtMs: 0,
  sourceClockId: 'MONO-A',
  receivedAtMs: 0,
  receivedClockId: 'MONO-A',
});
const state = tick(sample.state, observeAtMs);
console.log(
  `now=${state.nowMs} connection=${state.connection} quality=${state.quality} receiveAge=${state.receiveAgeMs} sourceAge=${state.sourceAgeMs} lastGood=${state.lastGoodValue}`,
);
