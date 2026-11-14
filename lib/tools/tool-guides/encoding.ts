import type { ToolGuideData } from './types';
import type { ToolSlug } from '../registry';

const t = (zh: string, en: string) => ({ zh, en });

/** Worked, reproducible cases for encoding and security-adjacent tools. */
export const encodingGuides: Partial<Record<ToolSlug, ToolGuideData>> = {
  'rmb-uppercase': {
    task: t(
      '將已核對的新臺幣數字金額轉為繁體財務大寫。',
      'Convert a checked New Taiwan Dollar amount to Traditional Chinese financial numerals.',
    ),
    scope: t(
      '只改寫金額，不計算稅額、匯率或四捨五入。',
      'Changes notation only; it does not calculate tax, exchange rates, or rounding.',
    ),
    cases: [
      {
        title: t(
          '付款申請單上的小數金額',
          'Decimal amount on a payment request',
        ),
        inputs: [
          {
            label: t('新臺幣金額（元）', 'TWD amount'),
            value: '1001.05',
            source: t(
              '已核對的申請單金額欄',
              'A verified amount field on the request',
            ),
          },
        ],
        steps: [
          t(
            '輸入 1001.05，按「轉為大寫」。',
            'Enter 1001.05 and select “Convert to uppercase”.',
          ),
        ],
        expected: [
          t(
            '結果為「新臺幣壹仟零壹圓零伍分」。',
            'The result is “新臺幣壹仟零壹圓零伍分”.',
          ),
        ],
        interpretation: t(
          '角為零但分不為零時會保留「零」；整數才以「圓整」結尾。',
          'When jiao is zero but fen is not, a zero is retained; only whole amounts end in 圓整.',
        ),
      },
    ],
    pitfalls: [
      t(
        '不要輸入逗號、負數、指數記法或超過兩位小數；工具會拒絕而不是猜測。',
        'Do not enter commas, negatives, exponent notation, or more than two decimal places; the tool rejects rather than guesses.',
      ),
      t(
        '輸出可作人工覆核，正式憑證的格式要求仍以你的單位規範為準。',
        'Use the output for human review; the required format of an official document remains governed by your organization.',
      ),
    ],
    related: ['text-case'],
  },
  'text-case': {
    task: t(
      '依明確規則整理英文 ASCII 大小寫，同時保留中文與符號。',
      'Apply explicit ASCII English casing rules while preserving Chinese text and symbols.',
    ),
    scope: t(
      '不是英文文法校對，也不會辨識縮寫、專有名詞或網址語意。',
      'It is not grammar checking and does not recognize acronyms, proper names, or URL semantics.',
    ),
    cases: [
      {
        title: t('設備告警標題整理', 'Normalize an equipment-alarm heading'),
        inputs: [
          {
            label: t('轉換方式', 'Conversion mode'),
            value: t('英文標題式', 'English Title Case'),
            source: t(
              '標題欄位的顯示規則',
              'The display convention of the title field',
            ),
          },
          {
            label: t('輸入文字', 'Input text'),
            value: 'plc alarm reset — 中文保持原樣',
            source: t('已複製的告警標題', 'A copied alarm heading'),
          },
        ],
        steps: [
          t(
            '選擇「英文標題式」，在「輸入文字」貼上案例文字，再按「轉換文字」。',
            'Choose “English Title Case”, paste the case text into “Input text”, then select “Convert text”.',
          ),
        ],
        expected: [
          t(
            '結果為「Plc Alarm Reset — 中文保持原樣」。',
            'The result is “Plc Alarm Reset — 中文保持原樣”.',
          ),
        ],
        interpretation: t(
          '只有 A–Z、a–z 會改變，因此 PLC 會變成 Plc，需由使用者保留必要縮寫。',
          'Only A–Z and a–z change, so PLC becomes Plc; preserve required acronyms yourself.',
        ),
      },
    ],
    pitfalls: [
      t(
        '句首大寫把句點、驚嘆號、問號與換行當分界，網址或縮寫中的句點也會受影響。',
        'Sentence case treats periods, exclamation marks, question marks, and line breaks as boundaries, including periods in URLs or abbreviations.',
      ),
      t(
        '每次改動文字或模式都會清掉舊結果；輸入上限為 100,000 個 Unicode 碼點。',
        'Changing text or mode clears the old result; the limit is 100,000 Unicode code points.',
      ),
    ],
    related: ['text-repair'],
  },
  'key-derivation': {
    task: t(
      '以明確參數重現 PBKDF2 或舊格式 EvpKDF 的派生結果。',
      'Reproduce a PBKDF2 or legacy EvpKDF derivation with explicit parameters.',
    ),
    scope: t(
      '派生結果不是可逆密碼，也不包含鹽值、迭代次數或 IV。',
      'A derived value is not a reversible password and does not contain its salt, iteration count, or IV.',
    ),
    cases: [
      {
        title: t('PBKDF2 測試向量核對', 'PBKDF2 test-vector check'),
        inputs: [
          {
            label: t('密碼（UTF-8）', 'Password (UTF-8)'),
            value: 'password',
            source: t(
              '公開測試向量，不是實際密碼',
              'A public test vector, not a real password',
            ),
          },
          {
            label: t(
              '鹽值輸入格式／鹽值（UTF-8）',
              'Salt input format / Salt (UTF-8)',
            ),
            value: t('UTF-8 文字 / salt', 'UTF-8 text / salt'),
            source: t('公開測試向量', 'A public test vector'),
          },
          {
            label: t(
              '迭代次數／派生密鑰長度',
              'Iterations / Derived key length',
            ),
            value: '1 / 256 bits',
            source: t('公開測試向量參數', 'Public test-vector parameters'),
          },
        ],
        steps: [
          t(
            '選 PBKDF2、SHA-256、HEX 小寫，按「派生密鑰」。',
            'Choose PBKDF2, SHA-256, and lowercase HEX, then select “Derive key”.',
          ),
        ],
        expected: [
          t(
            '結果為 120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b。',
            'The result is 120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b.',
          ),
        ],
        interpretation: t(
          '此低迭代案例只用於互通核對；實際資料必須連同算法、鹽值、迭代次數與長度保存。',
          'This low-iteration case is only for interoperability checking; retain algorithm, salt, iterations, and length with real data.',
        ),
      },
    ],
    pitfalls: [
      t(
        'HEX 鹽值每個 byte 要兩位；切換鹽值格式會清空欄位，避免將文字誤當位元組。',
        'Each HEX salt byte needs two digits; changing salt format clears the field to avoid treating text as bytes.',
      ),
      t(
        'EvpKDF 僅用於 CryptoJS／舊 OpenSSL 相容；頁面既有的舊格式警告仍適用。',
        'EvpKDF is only for CryptoJS/legacy OpenSSL compatibility; the page’s existing legacy warning still applies.',
      ),
    ],
    related: ['crypto', 'hash', 'byte-encoding'],
  },
  'byte-encoding': {
    task: t(
      '在 UTF-8、HEX、Base64、Base64URL、Latin-1 與 UTF-16 文字表示間轉換。',
      'Convert between UTF-8, HEX, Base64, Base64URL, Latin-1, and UTF-16 text representations.',
    ),
    scope: t(
      '檢查文字編碼與位元組表示，不提供保密性。',
      'Inspect text encodings and byte representations; it provides no confidentiality.',
    ),
    cases: [
      {
        title: t(
          '確認 UTF-16BE 文字表示',
          'Check a UTF-16BE text representation',
        ),
        inputs: [
          {
            label: t('輸入格式／輸出格式', 'Input format / Output format'),
            value: t(
              'UTF-8 文字 / UTF-16BE 文字（HEX）',
              'UTF-8 text / UTF-16BE text (HEX)',
            ),
            source: t(
              '對方系統的欄位規格',
              'The receiving system’s field specification',
            ),
          },
          {
            label: t('輸入內容', 'Input'),
            value: '中文',
            source: t('待送出的文字樣本', 'A text sample to send'),
          },
        ],
        steps: [
          t('設定格式後按「轉換」。', 'Set the formats and select “Convert”.'),
        ],
        expected: [t('結果為 4e2d6587。', 'The result is 4e2d6587.')],
        interpretation: t(
          '此結果是「中文」的 UTF-16BE 編碼；若轉成一般 HEX，會顯示 UTF-8 位元組 e4b8ade69687。',
          'This is the UTF-16BE encoding of 中文; converting to ordinary HEX shows UTF-8 bytes e4b8ade69687.',
        ),
      },
    ],
    pitfalls: [
      t(
        '標準 Base64 需要正確補齊；HEX 必須為偶數個十六進位字元。錯誤輸入會被拒絕。',
        'Standard Base64 requires valid padding and HEX needs an even count of hexadecimal characters. Invalid input is rejected.',
      ),
      t(
        'Latin-1 不會截斷超出範圍的 Unicode 字元；單次最多處理 1 MiB 解碼位元組。',
        'Latin-1 never truncates out-of-range Unicode characters; each conversion handles at most 1 MiB of decoded bytes.',
      ),
    ],
    related: ['big5', 'text-repair'],
  },
  crypto: {
    task: t(
      '在瀏覽器內加密或解密文字，並以同一密碼驗證往返結果。',
      'Encrypt or decrypt text in the browser, then verify a round trip with the same password.',
    ),
    scope: t(
      'AES-GCM 的新密文格式與舊 CryptoJS 相容格式不同，必須選擇正確格式。',
      'The new AES-GCM ciphertext format differs from legacy CryptoJS-compatible formats; choose the matching format.',
    ),
    cases: [
      {
        title: t('AES-GCM 往返確認', 'AES-GCM round-trip check'),
        inputs: [
          {
            label: t('演算法／格式', 'Algorithm / format'),
            value: t('AES-256-GCM（建議）', 'AES-256-GCM (recommended)'),
            source: t('新建測試資料', 'New test data'),
          },
          {
            label: t(
              '原文／密碼／再次輸入密碼',
              'Text / Password / Re-enter password',
            ),
            value:
              '公開測試文字 / public fixture password / public fixture password',
            source: t(
              '非機密測試文字與密碼',
              'Non-secret test text and password',
            ),
          },
        ],
        steps: [
          t(
            '按「加密」，再按「將結果帶入反向操作」，最後按「解密」。',
            'Select “Encrypt”, then “Reuse result for reverse operation”, then “Decrypt”.',
          ),
        ],
        expected: [
          t(
            '密文以 HPLC1. 開頭；解密結果逐字回到「公開測試文字」。同一原文與密碼再次加密時，密文應不同。',
            'Ciphertext starts with HPLC1.; decryption returns exactly 公開測試文字. Encrypting the same text and password again should yield different ciphertext.',
          ),
        ],
        interpretation: t(
          '驗證的是可讀回的往返，而非固定密文比對；新 salt 與 IV 使密文每次不同。',
          'This verifies a readable round trip, not a fixed ciphertext; fresh salt and IV make each ciphertext different.',
        ),
      },
    ],
    pitfalls: [
      t(
        '密碼、空白與 Unicode 不會自動修剪或正規化；遺失密碼無法由本站找回。',
        'Passwords, whitespace, and Unicode are not automatically trimmed or normalized; the site cannot recover a lost password.',
      ),
      t(
        '舊格式只為相容用途；保留頁面對舊算法與格式的警告。',
        'Legacy formats exist only for compatibility; keep the page’s warnings about legacy algorithms and formats in mind.',
      ),
    ],
    related: ['key-derivation', 'hash'],
  },
  hash: {
    task: t(
      '產生文字摘要，或以 HMAC 核對帶金鑰的訊息驗證碼。',
      'Generate a text digest or check a keyed HMAC message authentication code.',
    ),
    scope: t(
      '摘要與 HMAC 都不能解密還原原文；HMAC 需要相同金鑰才能比對。',
      'Neither a digest nor an HMAC can decrypt the source text; HMAC comparison requires the same key.',
    ),
    cases: [
      {
        title: t('SHA-256 公開測試向量', 'SHA-256 public test vector'),
        inputs: [
          {
            label: t(
              '計算類型／雜湊演算法',
              'Calculation type / Hash algorithm',
            ),
            value: t('雜湊摘要 / SHA-256', 'Hash digest / SHA-256'),
            source: t('公開測試向量', 'A public test vector'),
          },
          {
            label: t(
              '原文（UTF-8，允許空字串）',
              'Text (UTF-8; empty string allowed)',
            ),
            value: 'abc',
            source: t('公開測試向量', 'A public test vector'),
          },
        ],
        steps: [
          t(
            '選擇 HEX 小寫，按「計算摘要」。',
            'Choose lowercase HEX and select “Calculate digest”.',
          ),
        ],
        expected: [
          t(
            '結果為 ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad。',
            'The result is ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad.',
          ),
        ],
        interpretation: t(
          '原文改變通常會改變摘要，但不同內容仍可能產生相同摘要；抗碰撞不代表保證沒有碰撞。若對方提供 HMAC，改用「HMAC（帶金鑰）」並填入雙方約定金鑰。',
          'Changing the source usually changes the digest, but different contents can share a digest; collision resistance is not a guarantee that collisions do not exist. For a supplied HMAC, choose HMAC and enter the agreed key.',
        ),
      },
    ],
    pitfalls: [
      t(
        'MD5 與 SHA-1 僅適用舊系統相容或非安全用途，頁面警告不可忽略。',
        'MD5 and SHA-1 are only for legacy compatibility or non-security use; do not ignore the page warning.',
      ),
      t(
        '輸入空字串是有效摘要案例；但 HMAC 的金鑰不能留空。',
        'An empty string is a valid digest case, but an HMAC key cannot be empty.',
      ),
    ],
    related: ['crypto', 'key-derivation'],
    sources: [
      {
        label: t('NIST：抗碰撞定義', 'NIST: Collision resistance'),
        url: 'https://csrc.nist.gov/glossary/term/collision_resistance',
      },
    ],
  },
  'password-generator': {
    task: t(
      '在瀏覽器內建立符合目標系統限制的新密碼、片語或數字 PIN。',
      'Create a new password, passphrase, or numeric PIN in the browser within the target system’s limits.',
    ),
    scope: t(
      '結果是亂數，不能用固定字串驗證；本工具不推估帳戶安全或破解時間。',
      'Results are random and cannot be validated as a fixed string; the tool does not estimate account security or cracking time.',
    ),
    cases: [
      {
        title: t('六位數系統 PIN', 'Six-digit system PIN'),
        inputs: [
          {
            label: t('密碼類型／PIN 長度', 'Password type / PIN length'),
            value: t('數字 PIN / 6', 'Numeric PIN / 6'),
            source: t(
              '目標系統明確要求六位數字',
              'A target system that explicitly requires six digits',
            ),
          },
        ],
        steps: [
          t(
            '選「數字 PIN」，輸入 6，按「產生密碼」。',
            'Choose “Numeric PIN”, enter 6, and select “Generate password”.',
          ),
        ],
        expected: [
          t(
            '結果為剛好 6 個 0–9 字元；開頭的 0 也會保留。',
            'The result contains exactly six characters from 0–9, and leading zeroes are retained.',
          ),
        ],
        interpretation: t(
          '每次按鈕都會重新抽樣，但不保證與歷次結果不同；按「複製密碼」才會寫入剪貼簿。',
          'Each click samples again, but a result can repeat an earlier value; it is written to the clipboard only after selecting Copy password.',
        ),
      },
    ],
    pitfalls: [
      t(
        '清空頁面不會清除作業系統剪貼簿；複製後請依環境自行管理剪貼簿內容。',
        'Clearing the page does not clear the operating-system clipboard; manage copied content for your environment.',
      ),
      t(
        '短 PIN 只適用要求數字碼的系統，不等同一般帳戶密碼。',
        'A short PIN is only for systems that require a numeric code; it is not equivalent to a general account password.',
      ),
    ],
    related: ['crypto', 'key-derivation'],
  },
  'text-repair': {
    task: t(
      '比較候選編碼，或以指定的誤讀與原始編碼修復可逆的文字亂碼。',
      'Compare encoding candidates or repair reversible mojibake using specified mistaken and original encodings.',
    ),
    scope: t(
      '它不能保證復原已遺失的原始位元組；含有替代字元「�」時尤其如此。',
      'It cannot guarantee recovery of source bytes that are already lost, especially when the replacement character � is present.',
    ),
    cases: [
      {
        title: t(
          'UTF-8 被誤當 Windows-1252',
          'UTF-8 mistaken for Windows-1252',
        ),
        inputs: [
          {
            label: t('修復方式／亂碼原文', 'Repair method / Mojibake text'),
            value: t(
              '比較常見編碼候選 / ä¸­æ–‡',
              'Compare common encoding candidates / ä¸­æ–‡',
            ),
            source: t(
              '未含替代字元的複製文字',
              'Copied text without replacement characters',
            ),
          },
        ],
        steps: [
          t(
            '按「開始修復」，在候選中選擇「誤讀：Windows-1252 → 原始：UTF-8」。',
            'Select “Start repair”, then choose “Mistaken: Windows-1252 → Original: UTF-8”.',
          ),
        ],
        expected: [
          t('完整轉換結果為「中文」。', 'The full conversion result is 中文.'),
        ],
        interpretation: t(
          '先確認候選內容與來源檔；若可取得原始檔，改用「文字檔編碼轉換」重新解讀原始位元組較可靠。',
          'Confirm candidates against the source; if the original file is available, use text-file conversion to decode original bytes more reliably.',
        ),
      },
    ],
    pitfalls: [
      t(
        '不要把 Word、PDF 或二進位檔當純文字檔；文字與檔案上限分別為 20,000 UTF-16 字元單位與 1 MiB。',
        'Do not treat Word, PDF, or binary files as plain text; limits are 20,000 UTF-16 code units and 1 MiB respectively.',
      ),
      t(
        '下載格式與 UTF-8 BOM 是輸出選項，不會改變已選定的候選結果。',
        'Download encoding and UTF-8 BOM are output choices; they do not change the selected candidate.',
      ),
    ],
    related: ['byte-encoding', 'big5'],
  },
  qrcode: {
    task: t(
      '將已確認的文字、網址、Wi-Fi 設定或聯絡資訊轉為可掃描 QR Code。',
      'Turn confirmed text, a URL, Wi-Fi settings, or contact details into a scannable QR Code.',
    ),
    scope: t(
      'QR Code 只是承載內容；掃描後是否安全取決於其中網址或網路設定。',
      'A QR Code only carries content; safety after scanning depends on the embedded URL or network settings.',
    ),
    cases: [
      {
        title: t('設備文件網址 QR Code', 'Equipment-document URL QR Code'),
        inputs: [
          {
            label: t('內容類型／網址', 'Content type / URL'),
            value: t('網址 / https://hubplc.com/', 'URL / https://hubplc.com/'),
            source: t(
              '已在瀏覽器開啟並核對的 HTTPS 網址',
              'An HTTPS URL opened and checked in a browser',
            ),
          },
          {
            label: t('更正等級', 'Correction level'),
            value: t('M（約 15%）', 'M (about 15%)'),
            source: t(
              '一般室內張貼需求',
              'A typical indoor posting requirement',
            ),
          },
        ],
        steps: [
          t(
            '選「網址」，輸入完整 HTTPS 網址，等待預覽顯示後以手機掃描核對。',
            'Choose URL, enter the complete HTTPS URL, wait for the preview, then scan it with a phone to check.',
          ),
        ],
        expected: [
          t(
            '出現「可掃描的 QR Code」預覽；掃描的內容應是完全相同的網址。',
            'A “Scannable QR Code” preview appears; scanning should return exactly the same URL.',
          ),
        ],
        interpretation: t(
          '要提高受損容忍度可調高更正等級，但可容納內容會減少。',
          'A higher correction level increases damage tolerance but reduces payload capacity.',
        ),
      },
    ],
    pitfalls: [
      t(
        '網址僅接受完整 http:// 或 https://；不要將未核對的登入網址或敏感 Wi-Fi 密碼公開張貼。',
        'URLs must be complete http:// or https:// values; do not publicly post unchecked login URLs or sensitive Wi-Fi passwords.',
      ),
      t(
        'PNG 與 SVG 是同一個在瀏覽器記憶體產生的符號，下載前應以實際掃描驗證。',
        'PNG and SVG represent the same in-memory symbol; verify by actually scanning before distribution.',
      ),
    ],
    related: ['byte-encoding'],
  },
  big5: {
    task: t(
      '逐字檢查文字能否以 Big5 編碼，並取得每個字元與整段的 HEX 位元組。',
      'Check each character for Big5 encodability and obtain per-character and complete HEX bytes.',
    ),
    scope: t(
      '這是 Big5 編碼檢視，不是檔案轉碼；不同系統的編碼表仍可能不同。',
      'This inspects Big5 encoding, not file transcoding; encoding tables can still vary across systems.',
    ),
    cases: [
      {
        title: t('舊設備通訊欄位預檢', 'Preflight a legacy-device text field'),
        inputs: [
          {
            label: t('輸入文字', 'Input text'),
            value: '你好',
            source: t(
              '待送往舊設備的短文字',
              'Short text intended for a legacy device',
            ),
          },
          {
            label: t('顯示整段位元組', 'Show complete byte sequence'),
            value: t('顯示', 'Show'),
            source: t(
              '通訊欄位的位元組檢查需求',
              'A byte-inspection need for the field',
            ),
          },
        ],
        steps: [
          t(
            '貼上文字，確認「整段位元組」與逐字對照。',
            'Paste the text and inspect “Complete byte sequence” and the character map.',
          ),
        ],
        expected: [
          t(
            '逐字 HEX 為 A741 A66E，整段位元組為 A7 41 A6 6E。',
            'Character-by-character HEX is A741 A66E and complete bytes are A7 41 A6 6E.',
          ),
        ],
        interpretation: t(
          '若任一字顯示 ??／無法編碼，就不能安全地複製整段結果；需改字或先確認目標系統支援的編碼表。',
          'If any character shows ?? / unencodable, the complete result cannot be copied safely; revise text or confirm the target encoding table.',
        ),
      },
    ],
    pitfalls: [
      t(
        'big5-hkscs 在此套件被視為 Big5 別名，不代表每一台設備採相同字表。',
        'This package treats big5-hkscs as a Big5 alias; that does not mean every device uses the same table.',
      ),
      t(
        'Ctrl／⌘ + Enter 複製逐字 HEX；清空後不再顯示舊位元組。',
        'Ctrl/⌘ + Enter copies character-by-character HEX; clearing removes the old byte display.',
      ),
    ],
    related: ['text-repair', 'byte-encoding'],
  },
};
