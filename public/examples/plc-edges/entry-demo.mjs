import { entryScan, initialEntry } from './entry-model.mjs';

const scans = [
  ['WAIT', null],
  ['RUN', 12],
  ['RUN', 8],
  ['RUN', null],
  ['RUN', 5],
  ['DONE', 99],
  ['DONE', null],
  ['RUN', null],
  ['RUN', 7],
];
let state = initialEntry();
console.log(
  'scan,stateNow,previous,entered,exited,sample,acceptedSample,batchSum,sampleCount,entryCount,savedSum,savedCount,saveCount',
);
for (const [index, [stateNow, sample]] of scans.entries()) {
  const previous = state.previous;
  state = entryScan(state, { stateNow, sample });
  console.log(
    [
      index + 1,
      stateNow,
      previous,
      Number(state.entered),
      Number(state.exited),
      sample ?? '',
      Number(state.acceptedSample),
      state.batchSum,
      state.sampleCount,
      state.entryCount,
      state.savedSum ?? '',
      state.savedCount ?? '',
      state.saveCount,
    ].join(','),
  );
}
