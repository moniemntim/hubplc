import type { TextEncoding } from './text-encoding-options';

export type TextJob =
  | { kind: 'repair-auto'; text: string }
  | {
      kind: 'repair-manual';
      text: string;
      mistaken: TextEncoding;
      original: TextEncoding;
    }
  | { kind: 'file-auto'; bytes: Uint8Array }
  | { kind: 'file-manual'; bytes: Uint8Array; encoding: TextEncoding }
  | { kind: 'export'; text: string; encoding: TextEncoding; bom: boolean };

export type TextCandidate = {
  text: string;
  original: TextEncoding;
  mistaken?: TextEncoding;
};
export type TextReply =
  | { candidates: TextCandidate[] }
  | { bytes: Uint8Array }
  | { error: string };
