import { encryptModern, decryptModern } from '@/lib/tools/crypto-modern';
import { legacyCipher } from '@/lib/tools/crypto-legacy';
import { calculateHash } from '@/lib/tools/crypto-hash';
import { deriveKdf } from '@/lib/tools/crypto-kdf';
import type { CryptoJob, CryptoReply } from '@/lib/tools/crypto-options';

self.onmessage = async (event: MessageEvent<CryptoJob>) => {
  const job = event.data;
  let reply: CryptoReply;
  try {
    if (job.kind !== 'hash' && job.kind !== 'cipher' && job.kind !== 'kdf')
      throw new Error('不支援的處理類型。');
    if (
      job.kind === 'cipher' &&
      job.direction !== 'encrypt' &&
      job.direction !== 'decrypt'
    )
      throw new Error('加解密方向不正確。');
    const result =
      job.kind === 'kdf'
        ? await deriveKdf(job)
        : job.kind === 'hash'
          ? calculateHash(job.algorithm, job.text, job.hmac, job.key)
          : job.algorithm === 'aes-gcm'
            ? await (
                job.direction === 'encrypt' ? encryptModern : decryptModern
              )(job.text, job.password)
            : legacyCipher(
                job.algorithm,
                job.direction,
                job.text,
                job.password,
                job.drop,
              );
    reply = { result };
  } catch (error) {
    reply = {
      error:
        error instanceof Error ? error.message : '處理失敗，請檢查內容與設定。',
    };
  }
  self.postMessage(reply);
};
