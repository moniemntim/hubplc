import test from 'node:test';
import { verify } from '../public/examples/mode-ownership/self-test.mjs';
void test(
  'mode requests retain ownership until confirmation and honor timeout, quality, cancellation and restoration boundaries',
  verify,
);
