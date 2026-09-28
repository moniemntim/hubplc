import { analogConvert, type AnalogInput } from './tools/plc.ts';
export type LessonQuality = 'good' | 'unknown' | 'bad';
export function assessAnalog(input: AnalogInput, quality: LessonQuality) {
  if (!['good', 'unknown', 'bad'].includes(quality))
    throw new Error('未知的來源品質。');
  const calculation = analogConvert(input);
  const state =
    quality === 'bad'
      ? 'SOURCE_BAD'
      : quality === 'unknown'
        ? 'SOURCE_UNKNOWN'
        : calculation.outside
          ? 'OUT_OF_RANGE'
          : 'AVAILABLE';
  return {
    ...calculation,
    state,
    usable: state === 'AVAILABLE',
    usableValue: state === 'AVAILABLE' ? calculation.engineering : null,
  };
}
