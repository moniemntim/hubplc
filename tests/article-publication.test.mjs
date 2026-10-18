import test from 'node:test';
import assert from 'node:assert/strict';
import { isArticleVerified } from '../scripts/article-publication.mjs';

void test('industrial hardware verification requires a traceable attestation', () => {
  assert.equal(isArticleVerified({ hardwareVerified: true }), false);
  assert.equal(
    isArticleVerified({
      hardwareVerified: true,
      verificationSource: 'author-attestation',
      verifiedHardware: ['ECU-1051'],
      verificationDate: '2026-10-18',
    }),
    true,
  );
  assert.equal(
    isArticleVerified({
      hardwareVerified: true,
      verificationSource: 'author-attestation',
      verifiedHardware: [],
      verificationDate: '2026-10-18',
    }),
    false,
  );
});

void test('software and simulator verification behavior remains supported', () => {
  assert.equal(
    isArticleVerified({
      verificationKind: 'software',
      applicationVerified: true,
    }),
    true,
  );
  assert.equal(isArticleVerified({ simulatorVerified: true }), true);
});
