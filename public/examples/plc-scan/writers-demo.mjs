import { traceWriters, decideOutput } from './scan-model.mjs';

for (const order of ['AB', 'BA']) {
  console.log(JSON.stringify({ order, ...traceWriters(true, order) }));
}
console.log('auto,manual,stop,alarm,block,out');
for (const autoRequest of [false, true]) {
  for (const manualRequest of [false, true]) {
    for (const stop of [false, true]) {
      for (const alarm of [false, true]) {
        const row = decideOutput({ autoRequest, manualRequest, stop, alarm });
        console.log(Object.values(row).map(Number).join(','));
      }
    }
  }
}
