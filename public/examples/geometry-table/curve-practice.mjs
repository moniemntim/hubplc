import { Curve } from './curve.mjs';
const x = 150;
const quality = 'Good';
const unit = 'count';
console.log(JSON.stringify(new Curve().calculate(x, quality, unit)));
