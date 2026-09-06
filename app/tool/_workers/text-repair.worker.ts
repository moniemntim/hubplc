import {
  decodeText,
  encodeText,
  repairText,
  suggestFileDecodings,
  suggestRepairs,
} from '@/lib/tools/text-repair';
import type { TextJob, TextReply } from '@/lib/tools/text-repair-protocol';

self.onmessage = (event: MessageEvent<TextJob>) => {
  const job = event.data;
  let reply: TextReply;
  try {
    switch (job.kind) {
      case 'repair-auto':
        reply = { candidates: suggestRepairs(job.text) };
        break;
      case 'repair-manual':
        reply = {
          candidates: [
            {
              text: repairText(job.text, job.mistaken, job.original),
              original: job.original,
              mistaken: job.mistaken,
            },
          ],
        };
        break;
      case 'file-auto':
        reply = {
          candidates: suggestFileDecodings(job.bytes).map(
            ({ text, encoding }) => ({ text, original: encoding }),
          ),
        };
        break;
      case 'file-manual':
        reply = {
          candidates: [
            {
              text: decodeText(job.bytes, job.encoding),
              original: job.encoding,
            },
          ],
        };
        break;
      case 'export': {
        const bytes = encodeText(job.text, job.encoding);
        reply = {
          bytes:
            job.bom && job.encoding === 'utf-8'
              ? new Uint8Array([0xef, 0xbb, 0xbf, ...bytes])
              : bytes,
        };
        break;
      }
    }
  } catch (error) {
    reply = {
      error:
        error instanceof Error ? error.message : '轉換失敗，請檢查輸入與編碼。',
    };
  }
  self.postMessage(reply);
};
