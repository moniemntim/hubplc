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
for (const { receipt, ...transition } of fixture.transitions) {
  state = ingestTransition(state, transition, receipt).state;
}
const { receipt: noteReceipt, ...note } = fixture.note;
state = appendNote(state, note, noteReceipt).state;
const lowSpeed = fixture.transitions.find(
  (item) => item.transitionId === 'TR2041',
);
for (const receipt of fixture.retransmissions) {
  const { receipt: _receipt, ...transition } = lowSpeed;
  state = ingestTransition(state, transition, receipt).state;
}
const exported = exportTimeline(state, fixture.window);
const observed = observedSourceReceiveDifference(
  state.events.find((item) => item.key === 'PLC_A/TR2041'),
);

console.log(`dataset=${fixture.dataset} synthetic=${fixture.synthetic}`);
console.log(
  `window=${fixture.window.start}..${fixture.window.end} interval=[start,end)`,
);
console.log(
  `rows=${state.events.length} receipts=${state.receipts.length} notes=${state.notes.length}`,
);
console.log(`windowed=${exported.windowed.map((item) => item.key).join(',')}`);
console.log(
  `unlocated=${exported.unlocated.map((item) => item.key).join(',')}`,
);
console.log(`observed_source_receive_difference_ms=${observed}`);
console.log(
  `coverage=${exported.coverage[0].start}..${exported.coverage[0].end}:${exported.coverage[0].reason}`,
);
console.log(
  `export_deterministic=${JSON.stringify(exported) === JSON.stringify(exportTimeline(state, fixture.window))}`,
);
