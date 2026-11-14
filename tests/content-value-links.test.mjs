import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {
  relatedLessons,
  getPublicRelatedLessons,
} from '../lib/tools/related-lessons.ts';
import { unitsTimeGuides } from '../lib/tools/tool-guides/units-time.ts';
import { encodingGuides } from '../lib/tools/tool-guides/encoding.ts';
void test('every contextual walkthrough points to a currently public article, including the three engineering guides', async () => {
  const articles = JSON.parse(
    await fs.readFile('lib/article-index.generated.json', 'utf8'),
  );
  const publicSet = new Set(articles.map((article) => article.slug));
  const targets = new Set();
  for (const [tool, lessons] of Object.entries(relatedLessons)) {
    assert.equal(
      new Set(lessons.map((lesson) => lesson.slug)).size,
      lessons.length,
      tool,
    );
    for (const lesson of lessons) {
      assert.ok(
        publicSet.has(lesson.slug),
        `${tool}: held/missing target ${lesson.slug}`,
      );
      assert.ok(lesson.zh && lesson.en);
      targets.add(lesson.slug);
    }
    assert.equal(
      getPublicRelatedLessons(tool, articles).length,
      lessons.length,
      `${tool}: no silently filtered current links`,
    );
  }
  for (const slug of [
    'fx5u-sd-bin-read-write',
    'fx5u-sd-csv-read-write',
    'xca-ecu-https-certificate-setup',
  ])
    assert.ok(targets.has(slug), slug);
  assert.deepEqual(
    getPublicRelatedLessons('register-converter', []),
    [],
    'future publication holds still protect hidden routes',
  );
});
void test('clock walkthroughs use visitor actions rather than an inaccessible test-clock input', () => {
  for (const slug of ['stopwatch', 'world-clock'])
    assert.doesNotMatch(
      JSON.stringify(unitsTimeGuides[slug]),
      /固定測試時鐘|fixed test clock|不是畫面可輸入/iu,
    );
  assert.match(JSON.stringify(unitsTimeGuides['world-clock']), /暫停更新/);
  assert.doesNotMatch(
    JSON.stringify(unitsTimeGuides['world-clock']),
    /2026-01-01/,
  );
});
void test('hash and random-password guidance does not guarantee collision-free or never-repeated results', () => {
  assert.doesNotMatch(
    JSON.stringify(encodingGuides.hash),
    /任何一個原文 byte 改變都會得到不同摘要/,
  );
  assert.match(JSON.stringify(encodingGuides.hash), /碰撞/);
  assert.ok(
    encodingGuides.hash.sources.some((source) =>
      source.url.startsWith('https://csrc.nist.gov/'),
    ),
  );
  assert.match(
    JSON.stringify(encodingGuides['password-generator']),
    /不保證與歷次結果不同/,
  );
});
