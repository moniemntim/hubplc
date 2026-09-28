import test from 'node:test';
import { verify } from '../public/examples/shift-handover/self-test.mjs';
void test(
  'handover acceptance remains separate from alarm state and requires current complete records',
  verify,
);
