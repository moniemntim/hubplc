import { readFile } from 'node:fs/promises';
import {
  CONTRACT,
  createNumericState,
  submitEngineeringText,
  submitRawEnvelope,
} from './numeric-input-model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./fixture.json', import.meta.url), 'utf8'),
);

const print = (fields) => console.log(fields.join(' '));

console.log(`dataset=${fixture.dataset} synthetic=${fixture.synthetic}`);
print([
  `contract_schema=${CONTRACT.schema}`,
  `unit=${CONTRACT.unit}`,
  `scale=${CONTRACT.scale}`,
  'engineering=0..100.0C',
  `step=${CONTRACT.stepEngineering}`,
  'wire=0..1000',
]);

let state = createNumericState(fixture.initialWire);
for (const item of fixture.engineering) {
  const submitted = submitEngineeringText(state, item.text);
  state = submitted.state;
  print([
    'entry=engineering',
    `id=${item.id}`,
    `text=${item.text}`,
    `decision=${submitted.result.decision}`,
    `last_wire=${submitted.result.lastWire}`,
    `last_engineering=${submitted.result.lastEngineering}`,
  ]);
}
for (const item of fixture.raw) {
  const submitted = submitRawEnvelope(state, item.envelope);
  state = submitted.state;
  print([
    'entry=raw',
    `id=${item.id}`,
    `raw=${item.envelope.raw}`,
    `raw_type=${typeof item.envelope.raw}`,
    `decision=${submitted.result.decision}`,
    `last_wire=${submitted.result.lastWire}`,
    `last_engineering=${submitted.result.lastEngineering}`,
  ]);
}
