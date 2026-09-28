import test from 'node:test';
import { verify } from '../public/examples/authorization/self-test.mjs';
void test(
  'current authorization, immutable queue, revocation, limits and atomic in-memory execution',
  verify,
);
