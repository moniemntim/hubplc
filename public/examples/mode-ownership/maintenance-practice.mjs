import { ModeAuthority, request, signals } from './model.mjs';
const restoreReviewed = false;
const source = new ModeAuthority();
const ready = (at) =>
  signals(at, { stopped: true, autoIdle: true, restoreReviewed });
source.scan(ready(0), 0);
source.submit(request('MANUAL'), 0);
source.scan(ready(1), 1);
source.submit(request('ENTER', 'Maintenance', 2), 2);
source.scan(ready(3), 3);
source.submit(request('EXIT', 'Manual', 3), 4);
source.scan(ready(5), 5);
console.log(JSON.stringify(source.view(5)));
