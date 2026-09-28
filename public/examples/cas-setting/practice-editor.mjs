import { join } from 'node:path';
import { SettingStore, makeDirectory } from './store.mjs';
import { openEditor } from './editor.mjs';
// Change this integer, then run: node practice-editor.mjs
const myDraftRaw = 520;
const db = new SettingStore(join(makeDirectory(), 'practice-editor.sqlite'), {
  initialize: true,
});
try {
  const a = openEditor(db, 'A'),
    b = openEditor(db, 'B');
  a.edit(550);
  b.edit(myDraftRaw);
  a.submit('P-A');
  b.submit('P-B');
  console.log('conflict view', b.inspect());
  // This explicit line represents reviewing the changed base before a NEW intent.
  b.rebaseKeepingDraft();
  console.log('reviewed new base', b.inspect());
  b.submit('P-B-NEW');
  console.log('new result', b.inspect());
} finally {
  db.close();
}
