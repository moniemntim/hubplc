import { readFile } from 'node:fs/promises';

import { validateReadPlan } from './block-plan.mjs';

const fixture = JSON.parse(
  await readFile(new URL('./block-plan-fixture.json', import.meta.url), 'utf8'),
);

function printResult(name, result) {
  const codes = result.errors.map((error) => error.code).join(', ') || 'none';
  console.log(
    `${name}: valid=${result.valid}; words=${result.words}; errors=${codes}`,
  );
}

printResult('six-block plan', validateReadPlan(fixture.basePlan, fixture.map));
printResult(
  'six-block plan with 79-80 item',
  validateReadPlan(fixture.basePlan, fixture.map, [fixture.boundaryItem]),
);
printResult(
  'alternate 79-80 boundary plan',
  validateReadPlan(fixture.alternateBoundaryPlan, fixture.map, [
    fixture.boundaryItem,
  ]),
);

for (const [name, plan] of Object.entries(fixture.invalidPlans)) {
  printResult(name, validateReadPlan(plan, fixture.map));
}
