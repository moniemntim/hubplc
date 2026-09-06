export const MAX_REPAIR_TEXT = 20_000;
export const MAX_TEXT_FILE_BYTES = 1_048_576;

export const textEncodings = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'utf-16le', label: 'UTF-16 LE' },
  { value: 'utf-16be', label: 'UTF-16 BE' },
  { value: 'big5', label: 'Big5' },
  { value: 'gbk', label: 'GBK' },
  { value: 'gb18030', label: 'GB18030' },
  { value: 'shift_jis', label: 'Shift_JIS' },
  { value: 'euc-jp', label: 'EUC-JP' },
  { value: 'iso-2022-jp', label: 'ISO-2022-JP' },
  { value: 'euc-kr', label: 'EUC-KR' },
  { value: 'windows-1252', label: 'Windows-1252' },
  { value: 'latin1', label: 'ISO-8859-1 (Latin-1)' },
] as const;

export type TextEncoding = (typeof textEncodings)[number]['value'];
