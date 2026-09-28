import test from 'node:test';
import { verify } from '../public/examples/tick-scheduling/self-test.mjs';
void test(
  'tick full-domain arithmetic, invalid evidence and bounded non-overlapping schedules',
  verify,
);
