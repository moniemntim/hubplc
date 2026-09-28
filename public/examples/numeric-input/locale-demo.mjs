import { createLocaleEditor, parseLocalized } from './locale-model.mjs';
const editor = createLocaleEditor();
for (const [locale, unit] of [
  ['en-US', 'C'],
  ['de-DE', 'C'],
  ['en-US', 'F'],
  ['en-US', 'C'],
]) {
  const s = editor.displayAs(locale, unit);
  console.log(`${locale}/${unit}: ${s.display}; raw=${s.raw}`);
}
for (const [text, locale, unit] of [
  ['25,3', 'de-DE', 'C'],
  ['25,3', 'en-US', 'C'],
  ['1,234', null, 'C'],
  ['1,234', 'de-DE', 'C'],
  ['77.5', 'en-US', 'F'],
  ['77.54', 'en-US', 'F'],
]) {
  const r = parseLocalized(text, locale, unit);
  console.log(
    `${text}/${locale}/${unit}: ${r.decision}${r.accepted ? ` raw=${r.wire}` : ''}`,
  );
}
editor.begin('26,0', 'de-DE', 'C');
editor.displayAs('en-US', 'F');
console.log('before confirm: ' + JSON.stringify(editor.inspect()));
console.log('confirm: ' + JSON.stringify(editor.confirm()));
console.log('after confirm: ' + JSON.stringify(editor.inspect()));
// Finish a rejected practice draft before starting a separate cancel example.
if (editor.inspect().draft) editor.cancel();
editor.begin('99.0');
editor.cancel();
console.log('cancel: raw=' + editor.inspect().raw);
