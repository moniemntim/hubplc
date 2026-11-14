import type { ToolSlug } from '../registry.ts';
import type { ToolGuideData } from './types.ts';

const t = (zh: string, en: string) => ({ zh, en });

export const sampleDataGuides: Partial<Record<ToolSlug, ToolGuideData>> = {
  'random-codes': {
    task: t(
      '用安全亂數一次建立可辨識、互不重複的測試代碼。',
      'Create identifiable, unique test codes in one batch with secure randomness.',
    ),
    scope: t(
      '每次最多 1000 筆；唯一性只保證本次產生結果，不適合當作密碼、授權碼或正式序號系統。',
      'Each run is limited to 1000 rows. Uniqueness is guaranteed only within the generated result, not for passwords, authorization tokens, or a production serial system.',
    ),
    cases: [
      {
        title: t('建立十組 LAB 測試代碼', 'Create ten LAB test codes'),
        inputs: [
          {
            label: t('產生數量', 'Count'),
            value: '10',
            source: t('測試批次需求', 'Test-batch requirement'),
          },
          {
            label: t('代碼長度', 'Code length'),
            value: '6',
            source: t('測試資料欄位限制', 'Test-data field limit'),
          },
          {
            label: t('字元集', 'Character set'),
            value: t('英數（避開易混淆字元）', 'Alphanumeric (unambiguous)'),
            source: t('人工抄寫需求', 'Manual transcription requirement'),
          },
          {
            label: t('前綴', 'Prefix'),
            value: 'LAB-',
            source: t('測試環境標記', 'Test-environment marker'),
          },
        ],
        steps: [
          t(
            '輸入各欄位後按「產生資料」。',
            'Enter the fields, then select “Generate data”.',
          ),
          t(
            '檢查表格共十列，再依需求按「複製 CSV／JSON」或下載對應檔案。',
            'Check that the table has ten rows, then copy or download CSV/JSON as needed.',
          ),
        ],
        expected: [
          t(
            '每個結果都以 LAB- 開頭，後接六個所選字元。',
            'Every result begins with LAB- followed by six characters from the chosen set.',
          ),
          t(
            '十個值互不重複；具體字串每次都可能不同。',
            'All ten values are distinct; the exact strings can differ on every run.',
          ),
        ],
        interpretation: t(
          '此案例驗證格式、數量與唯一性，不應把隨機結果當成可預先指定的固定答案。',
          'This case verifies format, count, and uniqueness; random output must not be treated as a predetermined answer.',
        ),
      },
    ],
    pitfalls: [
      t(
        '字元集與長度可產生的不同值不足時，工具會拒絕請求而不重複發號。',
        'If the character set and length cannot provide enough distinct values, the tool rejects the request rather than reusing a code.',
      ),
      t(
        '前綴只允許英數、底線與連字號，最長 32 字元。',
        'Prefixes allow only letters, digits, underscores, and hyphens, up to 32 characters.',
      ),
    ],
  },
  'sample-data': {
    task: t(
      '產生明確標示為測試用途的合成資料列。',
      'Generate rows of synthetic data explicitly marked for testing.',
    ),
    scope: t(
      '資料不含電話或地址、不查詢真實身分；名稱是合成標記，不宣稱不會碰巧與任何人相同。',
      'The data omits phone numbers and addresses and performs no real-person lookup; names are synthetic markers and are not claimed to be impossible matches for a person.',
    ),
    cases: [
      {
        title: t('產生三筆匯入測試資料', 'Generate three import-test rows'),
        inputs: [
          {
            label: t('產生數量', 'Count'),
            value: '3',
            source: t('匯入前的最小測試批次', 'Minimum pre-import test batch'),
          },
        ],
        steps: [
          t(
            '輸入 3 後按「產生資料」。',
            'Enter 3, then select “Generate data”.',
          ),
          t(
            '檢查每列 ID、Email 與用途欄位，再複製或下載 CSV／JSON。',
            'Check every row’s ID, email, and purpose, then copy or download CSV/JSON.',
          ),
        ],
        expected: [
          t(
            '剛好有三列；每個 ID 以 TEST- 開頭且彼此不同。',
            'There are exactly three rows; every ID begins with TEST- and all IDs differ.',
          ),
          t(
            '每個 Email 均以 @example.invalid 結尾。',
            'Every email ends with @example.invalid.',
          ),
        ],
        interpretation: t(
          '資料是匯入、表單和版面測試用的占位資料；不可將它當作真實聯絡資訊或身分資料。',
          'The rows are placeholders for import, form, and layout tests; do not treat them as real contact or identity data.',
        ),
      },
    ],
    pitfalls: [
      t(
        'example.invalid 是保留網域，但仍應避免把測試資料誤送入正式系統。',
        'example.invalid is a reserved domain, but test data must still be kept out of production systems.',
      ),
      t(
        '改動數量後舊結果會清除，避免複製到與目前設定不相符的資料。',
        'Changing the count clears old results so data that no longer matches the current settings is not copied.',
      ),
    ],
  },
};
