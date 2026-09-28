import { TeachingAuthority, request } from './model.mjs';
const restoreBeforeDispatch = false;
const server = new TeachingAuthority();
server.submit('S', request('QUEUED'), 0);
server.changeRole('Viewer', 1);
if (restoreBeforeDispatch) server.changeRole('Supervisor', 2);
console.log(JSON.stringify(server.execute('QUEUED', 3)));
console.log(JSON.stringify(server.inspect().device));
