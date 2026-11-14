import { convertUnit } from './units.ts';

export const MAX_BATCH_ROWS = 200;
export type UnitBatchRow = {
  line: number;
  input: string;
  value?: number;
  error?: string;
};

export function convertUnitBatch(
  raw: string,
  fromId: string,
  toId: string,
): UnitBatchRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((input, index) => ({ line: index + 1, input: input.trim() }))
    .filter((row) => row.input !== '');
  if (lines.length === 0) throw new Error('請輸入至少一筆數值。');
  if (lines.length > MAX_BATCH_ROWS)
    throw new Error('批次換算最多支援 200 筆非空白資料。');
  return lines.map((row) => {
    try {
      return { ...row, value: convertUnit(row.input, fromId, toId) };
    } catch (error) {
      return {
        ...row,
        error: error instanceof Error ? error.message : '無法完成計算。',
      };
    }
  });
}
