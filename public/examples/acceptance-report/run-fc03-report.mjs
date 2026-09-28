import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = new URL('.', import.meta.url);
const inputUrl = new URL('./fc03-known-frame-input.json', directory);
const runnerUrl = new URL('./run-fc03-report.mjs', directory);
const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const toHex = (value) => value.toString(16).padStart(2, '0').toUpperCase();

const inputText = await readFile(inputUrl, 'utf8');
const runnerText = await readFile(runnerUrl, 'utf8');
const input = JSON.parse(inputText);
const tokens = input.response_pdu_hex.split(/\s+/);
if (!tokens.every((token) => /^[0-9a-f]{2}$/i.test(token)))
  throw new TypeError(
    'response_pdu_hex must contain two-digit hexadecimal bytes',
  );
const bytes = tokens.map((token) => Number.parseInt(token, 16));
const runId = new Date().toISOString().replace(/[-:.]/g, '');
const runsUrl = new URL('./runs/', directory);
const runUrl = new URL(`./runs/${runId}/`, directory);
await mkdir(runsUrl, { recursive: true });
await mkdir(runUrl);
const resultsUrl = new URL('./results.json', runUrl);
const manifestUrl = new URL('./manifest.json', runUrl);

if (
  !bytes.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)
)
  throw new TypeError('response_pdu_hex must contain bytes from 00 to FF');

const functionCode = bytes[0];
const byteCount = bytes[1];
const payload = bytes.slice(2);
const values = [];
for (let index = 0; index < payload.length; index += 2)
  values.push((payload[index] << 8) | payload[index + 1]);

const checks = {
  function_code: functionCode === input.expected.function_code,
  byte_count:
    byteCount === payload.length && byteCount === input.expected.byte_count,
  even_payload: payload.length % 2 === 0,
  register_count: values.length === input.expected.register_count,
  values: JSON.stringify(values) === JSON.stringify(input.expected.values),
};
const status = Object.values(checks).every(Boolean) ? 'pass' : 'fail';
const generatedAt = new Date().toISOString();
const results = {
  record_kind: 'offline_known_bytes_execution',
  case_id: input.case_id,
  run_id: runId,
  generated_at: generatedAt,
  status,
  hardware_tested: false,
  scope: input.scope,
  response_pdu_hex: bytes.map(toHex).join(' '),
  function_code: functionCode,
  byte_count: byteCount,
  values,
  expected_values: input.expected.values,
  checks,
};
const resultsText = `${JSON.stringify(results, null, 2)}\n`;
await writeFile(resultsUrl, resultsText, 'utf8');

const manifest = {
  record_kind: 'offline_known_bytes_manifest',
  run_id: runId,
  generated_at: generatedAt,
  command: `node ${fileURLToPath(runnerUrl).split(/[\\/]/).at(-1)}`,
  node_version: process.version,
  hardware_tested: false,
  scope: input.scope,
  status,
  artifacts: {
    input: { file: 'fc03-known-frame-input.json', sha256: sha256(inputText) },
    runner: { file: 'run-fc03-report.mjs', sha256: sha256(runnerText) },
    results: {
      file: `runs/${runId}/results.json`,
      sha256: sha256(resultsText),
    },
  },
};
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(
  `Offline case ${input.case_id}: ${status} (${fileURLToPath(runUrl)})`,
);
if (status === 'fail') process.exitCode = 1;
