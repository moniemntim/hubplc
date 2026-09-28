import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  appendAndExtract,
  hexToBytes,
  parseAdu,
} from '../public/examples/modbus-framing/modbus-framing.mjs';
import { validateReadPlan } from '../public/examples/modbus-framing/block-plan.mjs';

const fixturePath = new URL(
  '../public/examples/modbus-framing/stream-fixtures.json',
  import.meta.url,
);
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const blockPlanFixturePath = new URL(
  '../public/examples/modbus-framing/block-plan-fixture.json',
  import.meta.url,
);
const blockPlanFixture = JSON.parse(
  await readFile(blockPlanFixturePath, 'utf8'),
);

void test('keeps a five-byte TCP fragment and extracts two coalesced Modbus TCP ADUs', () => {
  let remainder = new Uint8Array();
  const frames = [];

  for (const chunk of fixture.chunks) {
    const extracted = appendAndExtract(remainder, hexToBytes(chunk));
    frames.push(...extracted.frames);
    remainder = extracted.remainder;
  }

  assert.deepEqual(
    frames.map((frame) => frame.transactionId),
    fixture.expectedTransactionIds,
  );
  assert.equal(remainder.length, fixture.expectedRemainderBytes);
  assert.deepEqual([...frames[0].pdu], [0x03, 0x00, 0x10, 0x00, 0x02]);
});

void test('retains an incomplete ADU until a later chunk supplies its bytes', () => {
  const incomplete = appendAndExtract(
    new Uint8Array(),
    hexToBytes('00 2A 00 00 00 06 01'),
  );

  assert.equal(incomplete.frames.length, 0);
  assert.equal(incomplete.remainder.length, 7);
});

void test('rejects an MBAP Length outside the supported Modbus TCP ADU range', () => {
  assert.throws(
    () =>
      appendAndExtract(
        new Uint8Array(),
        hexToBytes(fixture.invalidLengthPrefix),
      ),
    /Invalid MBAP Length: 0/,
  );
});

void test('rejects malformed complete ADUs instead of accepting excess bytes', () => {
  assert.throws(
    () => parseAdu(hexToBytes('00 2A 00 00 00 06 01 03 00 10 00 02 FF')),
    /MBAP Length requires 12/,
  );
});

void test('rejects a complete ADU whose Protocol ID is not Modbus TCP', () => {
  assert.throws(
    () => parseAdu(hexToBytes('00 2A 00 01 00 06 01 03 00 10 00 02')),
    /Unsupported Protocol ID: 0x0001/,
  );
});

void test('calculates a 40-register FC03 response as a 89-byte Modbus TCP ADU', () => {
  const response = Buffer.concat([
    Buffer.from([0x00, 0x2a, 0x00, 0x00, 0x00, 0x53, 0x01, 0x03, 0x50]),
    Buffer.alloc(80),
  ]);
  const parsed = parseAdu(response);

  assert.equal(response.length, 89);
  assert.equal(parsed.length, 83);
  assert.equal(parsed.pdu.length, 82);
  assert.equal(parsed.pdu[1], 80);
});

void test('validates the six-block 188-word read list and its 79-80 alternative', () => {
  const base = validateReadPlan(
    blockPlanFixture.basePlan,
    blockPlanFixture.map,
  );
  const splitItem = validateReadPlan(
    blockPlanFixture.basePlan,
    blockPlanFixture.map,
    [blockPlanFixture.boundaryItem],
  );
  const alternate = validateReadPlan(
    blockPlanFixture.alternateBoundaryPlan,
    blockPlanFixture.map,
    [blockPlanFixture.boundaryItem],
  );

  assert.deepEqual(base, { errors: [], valid: true, words: 188 });
  assert.equal(splitItem.valid, false);
  assert.equal(splitItem.errors[0].code, 'item-crosses-block');
  assert.deepEqual(alternate, { errors: [], valid: true, words: 188 });
});

void test('rejects manual plans that cross a hole, map bound, or device cap', () => {
  const expectedCodes = {
    forbiddenRange: 'forbidden-range',
    outOfRange: 'out-of-range',
    deviceCap: 'device-cap',
  };

  for (const [name, plan] of Object.entries(blockPlanFixture.invalidPlans)) {
    const result = validateReadPlan(plan, blockPlanFixture.map);

    assert.equal(result.valid, false, name);
    assert.equal(result.errors[0].code, expectedCodes[name]);
  }
});

void test('read plan guards enforce protocol bounds before enumerating addresses', () => {
  const map = {
    ...blockPlanFixture.map,
    deviceMaxQuantity: 200,
    maxAddress: 65535,
  };
  assert.equal(
    validateReadPlan([{ start: 0, quantity: 126 }], map).errors[0].code,
    'protocol-cap',
  );
  assert.equal(
    validateReadPlan([{ start: 0, quantity: 1e308 }], map).valid,
    false,
  );
  assert.equal(
    validateReadPlan([{ start: 1e308, quantity: 1 }], map).valid,
    false,
  );
  assert.equal(
    validateReadPlan([{ start: 65535, quantity: 2 }], map).valid,
    false,
  );
  assert.equal(validateReadPlan([null], map).valid, false);
  assert.equal(
    validateReadPlan([], map, [{ start: 0, width: 0 }]).valid,
    false,
  );
  assert.throws(
    () => validateReadPlan([], { ...map, maxAddress: Infinity }),
    TypeError,
  );
});
