import { readFile } from 'node:fs/promises';
import {
  appendNote,
  createTimeline,
  exportTimeline,
  ingestTransition,
  observedSourceReceiveDifference,
} from './model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);
let state = createTimeline({ coverage: fixture.coverage });
for (const { receipt, ...transition } of fixture.transitions)
  state = ingestTransition(state, transition, receipt).state;
const { receipt, ...first } = fixture.note;
state = appendNote(state, first, receipt).state;
const second = appendNote(
  state,
  {
    ...first,
    version: 2,
    createdAt: '2026-09-17T05:59:30.000Z',
    reason: 'handover_addition',
    text: 'Later handover note; it does not claim an occurrence time.',
  },
  { receiptId: 'R09', receivedAt: '2026-09-17T05:59:30.010Z' },
);
state = second.state;
const exportOne = exportTimeline(state, fixture.window);
console.log(
  `note_append=${second.decision} versions=${state.notes.map((item) => item.version).join(',')}`,
);
console.log(
  `unlocated=${exportOne.unlocated.map((item) => item.key).join(',')}`,
);
const clockOffsetExercise = {
  ...fixture.transitions[1],
  clockComparable: false,
};
console.log(
  `source_clock_warning=${clockOffsetExercise.clockComparable === false}`,
);
console.log(`raw_source_time=${clockOffsetExercise.sourceTime}`);
console.log(
  `observed_difference_when_not_comparable=${observedSourceReceiveDifference({ ...clockOffsetExercise, receiveTime: clockOffsetExercise.receipt.receivedAt })}`,
);
