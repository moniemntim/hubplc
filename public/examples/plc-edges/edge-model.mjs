// Offline teaching model. It samples one boolean input per invocation and
// does not emulate PLC I/O refresh, a vendor runtime, or physical outputs.
export const initialEdges = () => ({ previous: false, commandCount: 0 });

export function edgeScan(before, { button }) {
  if (typeof button !== 'boolean')
    throw new TypeError('button must be boolean');
  if (
    typeof before?.previous !== 'boolean' ||
    !Number.isSafeInteger(before.commandCount) ||
    before.commandCount < 0
  )
    throw new TypeError(
      'before must be a state returned by initialEdges or edgeScan',
    );
  const rising = button && !before.previous;
  const falling = !button && before.previous;
  if (rising && before.commandCount === Number.MAX_SAFE_INTEGER)
    throw new RangeError('commandCount cannot exceed Number.MAX_SAFE_INTEGER');
  return {
    previous: button,
    rising,
    falling,
    commandCount: before.commandCount + Number(rising),
  };
}
