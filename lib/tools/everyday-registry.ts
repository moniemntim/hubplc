export const everydayTools = [
  {
    slug: 'random-draw',
    name: '抽獎與隨機抽籤',
    category: '日常工具',
    code: 'DRAW',
    description:
      '從名單抽出中獎者或項目，設定抽取數、重複規則與權重，複製或匯出結果。',
    keywords:
      '線上抽獎 隨機抽籤 中獎 名單 權重 lottery raffle picker random draw',
  },
  {
    slug: 'random-groups',
    name: '隨機分組與配對',
    category: '日常工具',
    code: 'GROUP',
    description: '依組數或每組人數隨機分組，也可兩兩配對並清楚列出落單者。',
    keywords: '隨機分組 隨機配對 分隊 分組 名單 random groups pairs teams',
  },
  {
    slug: 'gift-exchange',
    name: '交換禮物配對',
    category: '日常工具',
    code: 'A → B',
    description:
      '產生每人送出及收到一份禮物的單一循環配對，避免配到自己，支援逐人查看。',
    keywords: '交換禮物 聖誕 配對 secret santa gift exchange',
  },
  {
    slug: 'random-codes',
    name: '亂碼與批次序號產生器',
    category: '日常工具',
    code: 'ID × N',
    description:
      '批次產生不重複的測試代碼與序號，設定字元、長度、前綴並匯出清單。',
    keywords: '亂碼 序號 批次 編號 測試代碼 random serial codes identifiers',
  },
  {
    slug: 'sample-data',
    name: '姓名與測試資料產生器',
    category: '日常工具',
    code: 'TEST',
    description:
      '產生虛構姓名與測試用資料列，使用明確測試識別碼及保留網域，不連接真實個資資料庫。',
    keywords:
      '個資 姓名 假資料 虛構 測試資料 random name synthetic sample mock data',
  },
  {
    slug: 'ip-address',
    name: '我的 IP 位址查詢',
    category: '日常工具',
    code: 'IPv4/6',
    description:
      '查詢這次連線對網站呈現的公開 IP 與版本，說明 VPN、代理及區網位址的差別。',
    keywords: '我的IP IP位址 公網 IPv4 IPv6 network address',
  },
  {
    slug: 'data-mask',
    name: '個資遮罩工具',
    category: '日常工具',
    code: '***',
    description:
      '在瀏覽器內遮罩電話、Email、識別碼與指定文字，先預覽再複製輸出。',
    keywords: '個資 遮罩 匿名 電話 信箱 身分證 隱私 data mask redact privacy',
  },
  {
    slug: 'email-check',
    name: '郵件地址格式檢查',
    category: '日常工具',
    code: '@',
    description:
      '批次檢查 Email 格式、整理重複地址並分類結果；不發信、不宣稱信箱存在。',
    keywords: '郵件地址檢測 Email 格式 檢查 信箱 重複 email validator syntax',
  },
  {
    slug: 'name-transliterator',
    name: '中文姓名拼音',
    category: '日常工具',
    code: 'PINYIN',
    description:
      '將中文姓名轉為漢語拼音草稿，區分姓與名、確認多音字並調整既有英文拼寫。',
    keywords:
      '中文姓名英譯 漢語拼音 護照 姓氏 英文 拼音 pinyin romanization name',
  },
] as const;

export const everydayEnglish = {
  'random-draw': {
    name: 'Prize Draw & Random Picker',
    description:
      'Draw names or items with count, repeat and weighting rules; copy or export the results.',
    example:
      'Draw two different entries from four names. Results vary; check membership and no repeats.',
  },
  'random-groups': {
    name: 'Random Groups & Pairs',
    description:
      'Shuffle names into groups by count or size, or form pairs with explicit leftovers.',
    example:
      'Five participants in two groups produce group sizes 3 and 2; pairs leave one participant unpaired.',
  },
  'gift-exchange': {
    name: 'Gift Exchange Pairing',
    description:
      'Create a single-cycle assignment with one gift sent and received per person, no self-assignment, and individual views.',
    example:
      'With four participants, check four unique givers and recipients and no self-assignment.',
  },
  'random-codes': {
    name: 'Random Codes & Batch Serials',
    description:
      'Generate unique test codes with configurable characters, length and prefixes, then export the list.',
    example: 'Generate ten LAB-prefixed codes and check all ten are distinct.',
  },
  'sample-data': {
    name: 'Names & Synthetic Test Data',
    description:
      'Generate fictional names and test rows with explicit test IDs and reserved domains, without querying real personal data.',
    example:
      'Generate three test profiles with TEST identifiers and example.invalid email addresses.',
  },
  'ip-address': {
    name: 'My IP Address',
    description:
      'Inspect the public IP and version seen by this website, with VPN, proxy and LAN limitations explained.',
    example:
      '203.0.113.10 is an IPv4 documentation address; your actual result depends on your connection.',
  },
  'data-mask': {
    name: 'Personal Data Masking',
    description:
      'Mask phone numbers, email addresses, identifiers and specified text locally, then preview and copy.',
    example:
      'Mask a sample email and phone number, then check the preview before sharing.',
  },
  'email-check': {
    name: 'Email Format Checker',
    description:
      'Check email syntax in batches, identify duplicate addresses and classify results without sending email or claiming account existence.',
    example:
      'alice@example.invalid has email-like syntax; alice@@example.invalid is malformed.',
  },
  'name-transliterator': {
    name: 'Chinese Name Pinyin',
    description:
      'Draft Hanyu Pinyin for a Chinese name, separate surname and given name, review alternate readings and edit an existing spelling.',
    example:
      '王小明 can be drafted as WANG, Xiao-Ming in Hanyu Pinyin; confirm the person’s chosen spelling.',
  },
} as const;

export const everydayExamples = {
  'random-draw':
    '四個名字抽兩名，不重複抽取；結果每次不同，核對人數、名單與規則。',
  'random-groups':
    '五人分兩組，組大小為 3 與 2；若兩兩配對，會清楚顯示一位落單者。',
  'gift-exchange':
    '四人交換禮物，核對四個送禮者與四個不同收禮者，且沒有任何人配到自己。',
  'random-codes': '產生十組 LAB 前綴代碼，確認數量為十組且互不重複。',
  'sample-data':
    '產生三筆測試資料，Email 使用 example.invalid，識別碼明確標示 TEST。',
  'ip-address': '203.0.113.10 是 IPv4 文件示例；實際查詢值依你的連線環境而定。',
  'data-mask': '先用示範 Email 與電話檢查遮罩效果，再人工覆核輸出內容。',
  'email-check':
    'alice@example.invalid 符合基本地址格式；alice@@example.invalid 的格式有誤。',
  'name-transliterator':
    '王小明的漢語拼音草稿為 WANG, Xiao-Ming；實際姓名拼寫需由本人確認。',
} as const;
