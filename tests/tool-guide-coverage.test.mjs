import assert from 'node:assert/strict';
import test from 'node:test';
import { tools } from '../lib/tools/registry.ts';
import {
  toolGuides,
  retainedGuideSlugs,
} from '../lib/tools/tool-guides/index.ts';

void test('each public tool has its specific new guide or a retained complete case guide', () => {
  assert.deepEqual(
    Object.keys(toolGuides).sort(),
    tools
      .filter((tool) => !retainedGuideSlugs.includes(tool.slug))
      .map((tool) => tool.slug)
      .sort(),
  );
  const publicSlugs = new Set(tools.map((tool) => tool.slug));
  for (const [slug, guide] of Object.entries(toolGuides)) {
    assert.ok(
      guide.task.zh && guide.task.en && guide.scope.zh && guide.scope.en,
      slug,
    );
    assert.ok(guide.cases.length > 0 && guide.pitfalls.length > 0, slug);
    for (const example of guide.cases) {
      assert.ok(
        example.inputs.length > 0 &&
          example.steps.length > 0 &&
          example.expected.length > 0,
        slug,
      );
      for (const input of example.inputs) {
        assert.ok(
          input.label.zh &&
            input.label.en &&
            input.source.zh &&
            input.source.en,
          slug,
        );
        assert.ok(
          typeof input.value === 'string'
            ? input.value.trim()
            : input.value.zh && input.value.en,
          slug,
        );
      }
    }
    for (const related of guide.related ?? [])
      assert.ok(
        publicSlugs.has(related),
        `${slug}: invalid related route ${related}`,
      );
    for (const source of guide.sources ?? [])
      assert.equal(
        new URL(source.url).protocol,
        'https:',
        `${slug}: source link`,
      );
  }
});
