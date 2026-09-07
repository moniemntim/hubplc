export const MAX_CRYPTO_BYTES = 1024 * 1024;
export const MAX_CRYPTO_PASSWORD_BYTES = 1024;
export const cipherAlgorithms = [
  { value: 'aes-gcm', label: 'AES-256-GCM（建議）' },
  { value: 'aes', label: 'AES-CBC（CryptoJS 相容）' },
  { value: 'tripledes', label: 'TripleDES（舊格式）' },
  { value: 'des', label: 'DES（舊格式）' },
  { value: 'rc4', label: 'RC4（舊格式）' },
  { value: 'rc4drop', label: 'RC4Drop（舊格式）' },
  { value: 'rabbit', label: 'Rabbit（舊格式）' },
  { value: 'rabbitlegacy', label: 'RabbitLegacy（舊格式）' },
] as const;
export type CipherAlgorithm = (typeof cipherAlgorithms)[number]['value'];
export type LegacyCipher = Exclude<CipherAlgorithm, 'aes-gcm'>;
export type CryptoDirection = 'encrypt' | 'decrypt';
export const hashAlgorithms = [
  { value: 'sha256', label: 'SHA-256' },
  { value: 'sha384', label: 'SHA-384' },
  { value: 'sha512', label: 'SHA-512' },
  { value: 'sha224', label: 'SHA-224' },
  { value: 'sha3-224', label: 'SHA3-224（標準）' },
  { value: 'sha3-256', label: 'SHA3-256（標準）' },
  { value: 'sha3-384', label: 'SHA3-384（標準）' },
  { value: 'sha3-512', label: 'SHA3-512（標準）' },
  { value: 'keccak-224', label: 'Keccak-224（CryptoJS SHA3 相容）' },
  { value: 'keccak-256', label: 'Keccak-256（CryptoJS SHA3 相容）' },
  { value: 'keccak-384', label: 'Keccak-384（CryptoJS SHA3 相容）' },
  { value: 'keccak-512', label: 'Keccak-512（CryptoJS SHA3 相容）' },
  { value: 'sha1', label: 'SHA-1（舊格式）' },
  { value: 'md5', label: 'MD5（舊格式）' },
  { value: 'ripemd160', label: 'RIPEMD-160（相容用途）' },
] as const;
export type HashAlgorithm = (typeof hashAlgorithms)[number]['value'];
export type KdfAlgorithm = 'pbkdf2' | 'evpkdf';
export type KdfHash = 'sha1' | 'sha256' | 'sha384' | 'sha512' | 'md5';
export type KdfJob = {
  kind: 'kdf';
  algorithm: KdfAlgorithm;
  password: string;
  salt: string;
  saltFormat: 'text' | 'hex';
  hash: KdfHash;
  iterations: number;
  bits: number;
};
export type CryptoJob =
  | KdfJob
  | {
      kind: 'cipher';
      algorithm: CipherAlgorithm;
      direction: CryptoDirection;
      text: string;
      password: string;
      drop: number;
    }
  | {
      kind: 'hash';
      algorithm: HashAlgorithm;
      text: string;
      hmac: boolean;
      key: string;
    };
export type CryptoReply = { result: string } | { error: string };
