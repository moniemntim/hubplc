import { analogLegacy, baseConvert, modbusConvert } from './tools/plc.ts';
/** Original 4–20 mA API, shared with the dedicated analog calculator. */
export const analogScale = analogLegacy;
export function convertBase(raw: string, base: number) {
  const result = baseConvert({ raw, base, bits: 32, signed: false });
  const value = BigInt(result.unsigned);
  return {
    decimal: result.decimal,
    hex: value.toString(16).toUpperCase().padStart(4, '0'),
    binary: value.toString(2).padStart(16, '0'),
  };
}
export function modbusAddress(raw: string) {
  const { offset, hex } = modbusConvert({
    area: 'holding',
    digits: 5,
    reference: raw,
  });
  return { offset, hex };
}
