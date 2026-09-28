import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  appendNote,
  createTimeline,
  exportTimeline,
  ingestTransition,
  observedSourceReceiveDifference,
  timelinePartitions,
} from './model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);

function loaded() {
  let state = createTimeline({ coverage: fixture.coverage });
  for (const { receipt, ...transition } of fixture.transitions) {
    state = ingestTransition(state, transition, receipt).state;
  }
  const { receipt, ...note } = fixture.note;
  state = appendNote(state, note, receipt).state;
  return state;
}

void test('six rows, two retransmissions, and a deterministic export', () => {
  let state = loaded();
  const low = fixture.transitions[1];
  for (const receipt of fixture.retransmissions) {
    const { receipt: _receipt, ...transition } = low;
    state = ingestTransition(state, transition, receipt).state;
  }
  const view = exportTimeline(state, fixture.window);
  assert.equal(state.events.length, 6);
  assert.equal(state.receipts.length, 8);
  assert.equal(view.windowed.length, 5);
  assert.deepEqual(
    view.unlocated.map((item) => item.key),
    ['HMI_NOTE/NOTE17-V1'],
  );
  assert.equal(
    JSON.stringify(view),
    JSON.stringify(exportTimeline(state, fixture.window)),
  );
});

void test('only a declared comparable millisecond event gets the 520ms observation', () => {
  const state = loaded();
  assert.equal(
    observedSourceReceiveDifference(
      state.events.find((item) => item.key === 'PLC_A/TR2041'),
    ),
    520,
  );
  assert.equal(
    observedSourceReceiveDifference(
      state.events.find((item) => item.key === 'HMI_A/TR2048'),
    ),
    null,
  );
});

void test('payload conflict and invalid inputs leave prior state unchanged', () => {
  const state = loaded();
  const before = JSON.stringify(state);
  const { receipt: _receipt, ...base } = fixture.transitions[1];
  const changed = { ...base, payload: 'OTHER' };
  const conflict = ingestTransition(state, changed, {
    receiptId: 'R09',
    receivedAt: '2026-09-17T05:57:15.000Z',
  });
  assert.equal(conflict.decision, 'PAYLOAD_CONFLICT_REJECTED');
  assert.equal(JSON.stringify(state), before);
  const invalid = ingestTransition(state, null, null);
  assert.equal(invalid.decision, 'INPUT_REJECTED');
  assert.equal(JSON.stringify(invalid.state), before);
});

void test('note reference, append-only versions, and bounds preserve prior records', () => {
  let state = loaded();
  const { receipt: _receipt, ...firstNote } = fixture.note;
  const bad = appendNote(
    state,
    { ...firstNote, targetKey: 'PLC_A/TR9999', version: 2 },
    { receiptId: 'R09', receivedAt: '2026-09-17T05:57:15.000Z' },
  );
  assert.equal(bad.decision, 'NOTE_REFERENCE_REJECTED');
  const nextNote = {
    ...firstNote,
    version: 2,
    createdAt: '2026-09-17T05:59:30.000Z',
    reason: 'handover_addition',
    text: 'Later handover note; it does not claim an occurrence time.',
  };
  const appended = appendNote(state, nextNote, {
    receiptId: 'R09',
    receivedAt: '2026-09-17T05:59:30.010Z',
  });
  state = appended.state;
  assert.equal(appended.decision, 'NOTE_APPENDED');
  assert.deepEqual(
    state.notes.map((item) => item.version),
    [1, 2],
  );
  assert.equal(timelinePartitions(state, fixture.window).unlocated.length, 2);
  let bounded = createTimeline();
  for (let index = 0; index < 32; index += 1) {
    const id = `E${String(index).padStart(2, '0')}`;
    bounded = ingestTransition(
      bounded,
      {
        transitionId: id,
        sourceId: 'SRC',
        cycleId: 'C1',
        sourceTime: '2026-09-17T05:57:00.000Z',
        clockComparable: true,
        precision: 'millisecond',
        kind: 'source',
        actor: 'SYSTEM',
        payload: id,
      },
      {
        receiptId: `R${String(index).padStart(2, '0')}`,
        receivedAt: '2026-09-17T05:57:00.001Z',
      },
    ).state;
  }
  const full = ingestTransition(
    bounded,
    {
      transitionId: 'E99',
      sourceId: 'SRC',
      cycleId: 'C1',
      sourceTime: '2026-09-17T05:57:01.000Z',
      clockComparable: true,
      precision: 'millisecond',
      kind: 'source',
      actor: 'SYSTEM',
      payload: 'E99',
    },
    { receiptId: 'R99', receivedAt: '2026-09-17T05:57:01.001Z' },
  );
  assert.equal(full.decision, 'EVENT_CAPACITY_FAULT');
  assert.equal(full.state.events.length, 32);
  assert.equal(full.state.receipts.length, 32);
});

void test('receipt and note bounds reject additions without changing records', () => {
  let state = loaded();
  const { receipt: _receipt, ...low } = fixture.transitions[1];
  for (let index = 10; index < 68; index += 1) {
    state = ingestTransition(state, low, {
      receiptId: `R${index}`,
      receivedAt: '2026-09-17T05:57:20.000Z',
    }).state;
  }
  assert.equal(state.receipts.length, 64);
  const receiptFull = ingestTransition(state, low, {
    receiptId: 'R68',
    receivedAt: '2026-09-17T05:57:21.000Z',
  });
  assert.equal(receiptFull.decision, 'RECEIPT_CAPACITY_REJECTED');
  assert.equal(receiptFull.state.receipts.length, 64);

  state = loaded();
  const { receipt: _noteReceipt, ...firstNote } = fixture.note;
  for (let version = 2; version <= 8; version += 1) {
    const appended = appendNote(
      state,
      {
        ...firstNote,
        version,
        createdAt: `2026-09-17T05:57:${String(13 + version).padStart(2, '0')}.100Z`,
        reason: `revision_${version}`,
        text: `Version ${version} is a later note.`,
      },
      {
        receiptId: `N${version}`,
        receivedAt: `2026-09-17T05:57:${String(13 + version).padStart(2, '0')}.120Z`,
      },
    );
    state = appended.state;
  }
  const noteFull = appendNote(
    state,
    {
      ...firstNote,
      version: 8,
      createdAt: '2026-09-17T05:57:30.100Z',
      reason: 'duplicate_at_bound',
      text: 'This cannot be stored because the note-version bound is full.',
    },
    { receiptId: 'N9', receivedAt: '2026-09-17T05:57:30.120Z' },
  );
  assert.equal(noteFull.decision, 'NOTE_CAPACITY_REJECTED');
  assert.equal(noteFull.state.notes.length, 8);
});

void test('the half-open time window excludes its exact end', () => {
  let state = createTimeline();
  state = ingestTransition(
    state,
    {
      transitionId: 'END',
      sourceId: 'SRC',
      cycleId: 'C1',
      sourceTime: fixture.window.end,
      clockComparable: true,
      precision: 'millisecond',
      kind: 'source',
      actor: 'SYSTEM',
      payload: 'AT_END',
    },
    { receiptId: 'ENDR', receivedAt: fixture.window.end },
  ).state;
  const partitions = timelinePartitions(state, fixture.window);
  assert.equal(partitions.windowed.length, 0);
  assert.equal(partitions.outside.length, 1);
});

void test('strict own keys, bounded IDs, and text reject malformed input', () => {
  const state = loaded();
  const { receipt: _receipt, ...base } = fixture.transitions[1];
  const symbolKey = { ...base };
  symbolKey[Symbol('extra')] = true;
  const nonEnumerable = { ...base };
  Object.defineProperty(nonEnumerable, 'hidden', { value: true });
  const samples = [
    null,
    undefined,
    3,
    symbolKey,
    nonEnumerable,
    { ...base, transitionId: 'TR2041\n' },
    { ...base, payload: '   ' },
    { ...base, payload: 'LOW\u0001SPEED' },
  ];
  for (const transition of samples) {
    const rejected = ingestTransition(state, transition, {
      receiptId: 'R09',
      receivedAt: '2026-09-17T05:57:15.000Z',
    });
    assert.equal(rejected.decision, 'INPUT_REJECTED');
  }
});

void test('note versions keep their parent, time order, and exported copies isolated', () => {
  const state = loaded();
  const { receipt: _receipt, ...firstNote } = fixture.note;
  const wrongParent = appendNote(
    state,
    {
      ...firstNote,
      targetKey: 'PLC_A/TR2039',
      version: 2,
      createdAt: '2026-09-17T05:57:14.100Z',
    },
    { receiptId: 'R09', receivedAt: '2026-09-17T05:57:14.120Z' },
  );
  assert.equal(wrongParent.decision, 'NOTE_LINEAGE_REJECTED');
  const older = appendNote(
    state,
    { ...firstNote, version: 2, createdAt: '2026-09-17T05:57:12.100Z' },
    { receiptId: 'R09', receivedAt: '2026-09-17T05:57:14.120Z' },
  );
  assert.equal(older.decision, 'NOTE_TIME_REJECTED');
  const receiptBeforeNote = appendNote(
    state,
    { ...firstNote, version: 2, createdAt: '2026-09-17T05:57:14.100Z' },
    { receiptId: 'R09', receivedAt: '2026-09-17T05:57:14.000Z' },
  );
  assert.equal(receiptBeforeNote.decision, 'NOTE_TIME_REJECTED');
  const exported = exportTimeline(state, fixture.window);
  exported.receipts[0].receiptId = 'MUTATED';
  exported.notes[0].text = 'MUTATED';
  assert.equal(state.receipts[0].receiptId, 'R01');
  assert.equal(state.notes[0].text, fixture.note.text);
});
