import { AngleTracker } from './angle.mjs';
const gap = 100;
const quality = 'Good';
const tracker = new AngleTracker(360);
tracker.update({ angle: 358, at: 0 });
console.log(JSON.stringify(tracker.update({ angle: 2, at: gap, quality })));
