import { TeachingAuthority, request } from './model.mjs';
const session = 'O';
const value = 95;
const target = 'A';
const at = 0;
const server = new TeachingAuthority();
console.log(
  JSON.stringify(
    server.submit(session, request('PRACTICE', value, 1, target), at),
  ),
);
console.log(JSON.stringify(server.execute('PRACTICE', at)));
console.log(JSON.stringify(server.inspect().device));
