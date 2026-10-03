import { numberInput } from './core.ts';

export type Supply = 'single' | 'three-line' | 'three-neutral';
export function vaToAmps(
  powerRaw: string,
  unit: 'VA' | 'kVA',
  voltageRaw: string,
  supply: Supply,
) {
  if (!['single', 'three-line', 'three-neutral'].includes(supply))
    throw new Error('請選擇有效的供電方式。');
  if (unit !== 'VA' && unit !== 'kVA') throw new Error('請選擇 VA 或 kVA。');
  const power = numberInput(powerRaw, '視在功率');
  const voltage = numberInput(voltageRaw, '電壓');
  if (power < 0) throw new Error('視在功率不可小於 0。');
  if (voltage <= 0) throw new Error('電壓必須大於 0。');
  const va = power * (unit === 'kVA' ? 1000 : 1);
  const factor =
    supply === 'single' ? 1 : supply === 'three-line' ? Math.sqrt(3) : 3;
  const amps = va / voltage / factor;
  if (!Number.isFinite(va) || !Number.isFinite(amps))
    throw new Error('結果超出可計算範圍。');
  if (power > 0 && amps === 0) throw new Error('電流過小，無法表示。');
  return { va, voltage, amps };
}
