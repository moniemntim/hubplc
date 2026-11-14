import { numberInput } from '../core.ts';
import { translateToolMessage } from '../error-i18n.ts';
import type { WorkflowRow, WorkflowText } from './types.ts';
export const bi = (zh: string, en: string): WorkflowText => ({ zh, en });
export class WorkflowError extends Error {
  en: string;
  constructor(zh: string, en: string) {
    super(zh);
    this.en = en;
  }
}
export function requireCondition(
  condition: boolean,
  zh: string,
  en: string,
): void {
  if (!condition) throw new WorkflowError(zh, en);
}
export function read(
  input: Record<string, string>,
  key: string,
  label: WorkflowText,
  rule?:
    | 'positive'
    | 'nonnegative'
    | 'integer-positive'
    | 'integer-nonnegative',
): number {
  let value: number;
  try {
    value = numberInput(input[key] ?? '');
  } catch (error) {
    const message = error instanceof Error ? error.message : '無法完成計算。';
    throw new WorkflowError(
      `${label.zh}：${message}`,
      `${label.en}: ${translateToolMessage(message, 'en')}`,
    );
  }
  if (rule === 'positive' || rule === 'integer-positive')
    requireCondition(
      value > 0,
      `${label.zh}必須大於 0。`,
      `${label.en} must be greater than zero.`,
    );
  if (rule === 'nonnegative' || rule === 'integer-nonnegative')
    requireCondition(
      value >= 0,
      `${label.zh}不可小於 0。`,
      `${label.en} cannot be negative.`,
    );
  if (rule === 'integer-positive' || rule === 'integer-nonnegative')
    requireCondition(
      Number.isSafeInteger(value),
      `${label.zh}必須是安全整數。`,
      `${label.en} must be a safe integer.`,
    );
  return value;
}
export function finite(value: number): number {
  requireCondition(
    Number.isFinite(value),
    '結果超出可表示範圍。',
    'The result is outside the supported range.',
  );
  return Object.is(value, -0) ? 0 : value;
}
export function row(
  zh: string,
  en: string,
  value: WorkflowRow['value'],
  unit?: string,
): WorkflowRow {
  return {
    label: bi(zh, en),
    value: typeof value === 'number' ? finite(value) : value,
    ...(unit ? { unit } : {}),
  };
}
