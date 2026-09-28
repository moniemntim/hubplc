import { cursor } from './model.mjs';
import { points } from './fixtures.mjs';
// Change these two values, then compare the printed output with the article.
const cursorMs = 4500;
const lastPointQuality = 'Good';
const practicePoints = structuredClone(points);
practicePoints.at(-1).quality = lastPointQuality;
console.log(JSON.stringify(cursor({ points: practicePoints, cursorMs })));
