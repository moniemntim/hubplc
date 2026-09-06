import { TextEncoder } from '@kayahr/text-encoding/no-encodings';
import '@kayahr/text-encoding/encodings/big5';

export type Big5Character = {
  character: string;
  label: string;
  hex: string;
  supported: boolean;
  error?: string;
};

function labelCharacter(character: string) {
  if (character === ' ') return '空白';
  if (character === '\t') return 'Tab';
  if (character === '\n') return '換行';
  if (character === '\r') return '回車';
  return character;
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) =>
    byte.toString(16).toUpperCase().padStart(2, '0'),
  ).join(' ');
}

/** Encodes one Unicode code point at a time so unsupported characters are explicit. */
export function encodeBig5(input: string) {
  const encoder = new TextEncoder('big5');
  const characters: Big5Character[] = Array.from(input, (character) => {
    try {
      return {
        character,
        label: labelCharacter(character),
        hex: toHex(encoder.encode(character)),
        supported: true,
      };
    } catch {
      return {
        character,
        label: labelCharacter(character),
        hex: '??',
        supported: false,
        error: `「${labelCharacter(character)}」無法以 Big5 編碼`,
      };
    }
  });
  const supported = characters.every((item) => item.supported);
  return {
    characters,
    supported,
    groupedHex: characters
      .map((item) => item.hex.replaceAll(' ', ''))
      .join(' '),
    bytesHex: supported
      ? characters.map((item) => item.hex).join(' ')
      : undefined,
  };
}
