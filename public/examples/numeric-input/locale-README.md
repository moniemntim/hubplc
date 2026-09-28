# Locale and temperature input example

Node.js 24.19.0. Download numeric-input-model.mjs, locale-model.mjs, locale-demo.mjs and locale-self-test.mjs into one folder.

Run `node locale-demo.mjs` and `node --test locale-self-test.mjs`.

Canonical raw is Celsius times 10, integer 0..1000. English dot and German comma input are explicitly selected, never guessed. Fahrenheit conversion uses exact rational arithmetic before step validation. Formatting uses Intl.NumberFormat only for display. Draft context stays fixed until confirm/cancel. This is a local model, not a PLC/HMI integration test.

Practice: change the draft 26,0 to 26,5; confirm raw becomes 265 and display becomes 79.7 °F. No dependencies or equipment connection required.
