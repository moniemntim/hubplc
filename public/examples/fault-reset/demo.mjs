import { initialReset, resetScan } from './reset-model.mjs';
const rows = [
  [true, true, false],
  [true, false, false],
  [true, true, true],
  [true, true, false],
  [true, false, false],
  [true, true, false],
  [true, true, false],
  [false, false, true],
  [true, true, false],
  [true, false, false],
  [true, true, false],
];
let state = initialReset();
console.log('scan,valid,button,cause,fault,pulse,accepted,reason');
for (const [index, [valid, button, cause]] of rows.entries()) {
  state = resetScan(state, { valid, button, cause });
  console.log(
    [
      index + 1,
      +valid,
      +button,
      +cause,
      +state.fault,
      +state.pulse,
      state.accepted,
      state.reason,
    ].join(','),
  );
}
