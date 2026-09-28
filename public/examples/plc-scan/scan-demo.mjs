import { runScanSequence, samplePulse } from './scan-model.mjs';

const inputs = [false, false, true, false, false];
for (const order of ['forward', 'swapped']) {
  console.log(order);
  console.log('scan,input,previousM10,m10,m11,out,applied');
  for (const row of runScanSequence(inputs, order)) {
    console.log(Object.values(row).map(Number).join(','));
  }
}
console.log('pulseStart,pulseEnd,samplesAt0_10_20_30');
for (const [start, end] of [
  [2, 5],
  [8, 12],
  [8, 25],
]) {
  console.log(
    `${start},${end},${samplePulse(start, end, [0, 10, 20, 30])
      .map(({ input }) => Number(input))
      .join(' ')}`,
  );
}
