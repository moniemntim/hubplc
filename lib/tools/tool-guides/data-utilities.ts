import type { ToolSlug } from '../registry';
import type { ToolGuideData } from './types';

const t = (zh: string, en: string) => ({ zh, en });

export const dataUtilityGuides: Partial<Record<ToolSlug, ToolGuideData>> = {
  'data-mask': {
    task: t(
      '在分享前，以可見規則預覽文字中的個資遮罩結果。',
      'Preview rule-based masking of personal data in text before sharing.',
    ),
    scope: t(
      '只遮罩可辨識模式與你指定的文字，不是完整匿名化或合規判定。',
      'Masks recognisable patterns and your specified text only; it is not complete anonymisation or a compliance decision.',
    ),
    cases: [
      {
        title: t(
          '交付前的聯絡清單預覽',
          'Preview a contact list before handoff',
        ),
        inputs: [
          {
            label: t('原始文字', 'Source text'),
            value: '王小明 alice@example.com 0912-345-678 A123456789',
            source: t('僅供測試的範例資料', 'Test-only sample data'),
          },
          {
            label: t(
              '遮罩規則／自訂要遮罩的文字',
              'Masking rules / Custom text to mask',
            ),
            value: t(
              'Email、電話、識別碼／王小明',
              'Email, phone, identifier / 王小明',
            ),
            source: t(
              '交付前的人工遮罩需求',
              'Manual masking requirements before handoff',
            ),
          },
        ],
        steps: [
          t(
            '貼上內容，勾選規則，新增每行一筆自訂文字，按「預覽遮罩」。',
            'Paste text, select rules, add one custom term per line, then select “Preview masking”.',
          ),
        ],
        expected: [
          t(
            'Email、電話、識別碼與指定姓名會出現 *；同時顯示各規則的遮罩筆數。',
            'The email, phone, identifier, and specified name show * characters, with a count for each rule.',
          ),
        ],
        interpretation: t(
          '逐行比較原文與預覽後再複製或下載，避免漏掉不符合規則的資料。',
          'Compare source and preview line by line before copying or downloading, so data outside the rules is not missed.',
        ),
      },
    ],
    pitfalls: [
      t(
        '遮罩後文字仍可能可由上下文識別；不得宣稱已完全去識別化。',
        'Masked text may still be identifiable from context; do not claim it is fully de-identified.',
      ),
      t(
        '自訂文字依字面比對，大小寫、空白與變體都需要自行覆核。',
        'Custom terms are matched literally; review case, whitespace, and variations yourself.',
      ),
    ],
  },
  'email-check': {
    task: t(
      '批次整理 Email 格式、重複項與需人工確認的複雜寫法。',
      'Batch-sort email syntax, duplicates, and complex forms that need human review.',
    ),
    scope: t(
      '只檢查文字格式；不發信、不查 SMTP/MX，也不判斷帳號存在或可送達。',
      'Checks text syntax only; it sends no mail, checks no SMTP/MX, and does not determine mailbox existence or deliverability.',
    ),
    cases: [
      {
        title: t(
          '匯入名單前的格式整理',
          'Format cleanup before importing a list',
        ),
        inputs: [
          {
            label: t('Email 清單（每行一個）', 'Email list (one per line)'),
            value:
              'alice@example.com\nalice@EXAMPLE.com\nAlice@EXAMPLE.com\nuser@例子.测试\nalice@@example.com\n"quoted"@example.com',
            source: t(
              '待匯入但尚未寄送的名單副本',
              'A pre-send copy of the list to import',
            ),
          },
        ],
        steps: [
          t(
            '貼上每行一個地址，按「檢查格式」，再查看分類與標準化欄。',
            'Paste one address per line, select “Check syntax”, then review status and normalized columns.',
          ),
        ],
        expected: [
          t(
            '第二列會標為重複；第三列保留為不同的本機名稱大小寫；Unicode 網域會標準化；兩個 @ 為格式錯誤；引號寫法標為需人工確認。',
            'The second row is duplicate; the third row remains a separate local-part case; the Unicode domain is normalized; two @ signs are invalid; quoted syntax needs review.',
          ),
        ],
        interpretation: t(
          '「有效格式」不代表能收到信；需人工確認的複雜地址不應被直接判成不存在。',
          '“Valid syntax” does not mean mail can be received; complex addresses needing review must not be treated as nonexistent.',
        ),
      },
    ],
    pitfalls: [
      t(
        '請勿將結果當作寄送同意、反垃圾信檢查或名單品質保證。',
        'Do not treat results as sending consent, an anti-spam check, or a list-quality guarantee.',
      ),
      t(
        'CSV 會在可能被試算表當成公式的欄位前加單引號；原始文字仍在頁面供核對。',
        'CSV adds an apostrophe before fields that could be read as spreadsheet formulas; the original text remains on the page for comparison.',
      ),
    ],
  },
  'name-transliterator': {
    task: t(
      '產生中文姓名的漢語拼音草稿，拆分姓與名並保留可編輯的既有英文拼寫。',
      'Draft Hanyu Pinyin for a Chinese name, split surname and given name, and retain editable existing English spelling.',
    ),
    scope: t(
      '結果是草稿，不是護照或其他證件核准拼法；多音字與罕見字需要本人確認。',
      'Results are drafts, not passport or other document-approved spellings; polyphonic and uncommon characters need confirmation by the person.',
    ),
    cases: [
      {
        title: t(
          '姓名拼音草稿與既有拼寫比對',
          'Compare a name draft with existing spelling',
        ),
        inputs: [
          {
            label: t(
              '中文姓名／既有英文拼寫',
              'Chinese name / Existing English spelling',
            ),
            value: '王小明 / Wang Hsiao-Ming',
            source: t(
              '本人提供、仍待確認的姓名資料',
              'Name data provided by the person and still to be confirmed',
            ),
          },
          {
            label: t('輸出格式', 'Output format'),
            value: t('姓氏在前、大寫姓氏', 'Surname first, uppercase surname'),
            source: t(
              '內部名單顯示需求',
              'An internal-list display requirement',
            ),
          },
        ],
        steps: [
          t(
            '輸入中文姓名，確認姓名拆分與候選讀音，再選擇輸出格式；必要時直接編輯既有英文拼寫欄。',
            'Enter the Chinese name, review the name split and candidate readings, choose an output format, and edit existing English spelling when needed.',
          ),
        ],
        expected: [
          t(
            '顯示漢語拼音草稿與既有拼寫並列；王小明的草稿可呈現為 WANG, Xiao-Ming。',
            'The Hanyu Pinyin draft and existing spelling appear side by side; 王小明 can be shown as WANG, Xiao-Ming.',
          ),
        ],
        interpretation: t(
          '既有證件或本人指定拼寫優先；工具只協助比對與建立草稿。',
          'Existing document spelling or the person’s stated spelling takes precedence; the tool only helps compare and draft.',
        ),
      },
    ],
    pitfalls: [
      t(
        '複姓、逗號分隔與多音字都會標示供確認；不要假設工具能判定法律姓名。',
        'Compound surnames, comma-separated input, and polyphonic characters are flagged for review; do not assume the tool determines a legal name.',
      ),
      t(
        '請依外交部領事事務局的護照外文姓名規範確認正式拼法。',
        'Confirm official spelling against the Bureau of Consular Affairs passport-name guidance.',
      ),
    ],
    sources: [
      {
        label: t(
          '外交部領事事務局：護照外文姓名拼音',
          'BOCA: Passport romanized name guidance',
        ),
        url: 'https://www.boca.gov.tw/fp-35-7873-3a928-1.html',
      },
    ],
  },
};
