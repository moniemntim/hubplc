import test from 'node:test';
import { verify } from '../public/examples/geometry-table/self-test.mjs';
void test(
  'angle geometry, continuity guards and atomic teaching curve replacement',
  verify,
);
