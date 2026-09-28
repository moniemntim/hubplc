import { ModeAuthority, request, signals } from './model.mjs';
const completeAt = 4999;
const interlock = true;
const source = new ModeAuthority();
source.submit(request('PRACTICE'), 0);
source.scan(
  signals(completeAt, { stopped: true, autoIdle: true, interlock }),
  completeAt,
);
console.log(JSON.stringify(source.result('PRACTICE')));
console.log(JSON.stringify(source.view(completeAt)));
