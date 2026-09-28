import { edgeScan, initialEdges } from './edge-model.mjs';

const buttons = [
  false,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  false,
];
let state = initialEdges();
console.log('scan,button,previous,rising,falling,commandCount');
for (const [index, button] of buttons.entries()) {
  const previous = state.previous;
  state = edgeScan(state, { button });
  console.log(
    [
      index + 1,
      Number(button),
      Number(previous),
      Number(state.rising),
      Number(state.falling),
      state.commandCount,
    ].join(','),
  );
}
