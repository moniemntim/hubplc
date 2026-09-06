export const categories = [
  '全部',
  'PLC 與通訊',
  '電路',
  '編碼',
  '單位',
] as const;
export const tools = [
  {
    slug: 'analog',
    name: '類比訊號換算',
    category: 'PLC 與通訊',
    code: 'mA ↔ V',
    description: '電流、電壓、工程值與百分比的線性換算。',
    keywords: '4-20 0-20 0-10 1-5 2-10 感測器 壓力 液位',
  },
  {
    slug: 'plc-scaling',
    name: 'PLC 原始值縮放',
    category: 'PLC 與通訊',
    code: 'RAW',
    description: '自訂模組原始值與工程量程，正向或反向縮放。',
    keywords: '4095 27648 32000 ADC 類比',
  },
  {
    slug: 'base-converter',
    name: '進位換算器',
    category: 'PLC 與通訊',
    code: '0xFF',
    description: '二、八、十、十六進位與有號二補數互轉。',
    keywords: 'HEX DEC BIN OCT 二進位 十進位 十六進位',
  },
  {
    slug: 'modbus-address',
    name: 'Modbus 位址計算',
    category: 'PLC 與通訊',
    code: '4xxxx',
    description: '四種資料區、參考編號與零起算位址換算。',
    keywords: 'Modbos 寄存器 暫存器 register offset 40001',
  },
  {
    slug: 'modbus-crc',
    name: 'Modbus CRC-16',
    category: 'PLC 與通訊',
    code: 'CRC16',
    description: '計算 HEX 資料的校驗碼與線路傳送順序。',
    keywords: 'RTU 通訊 校驗 檢查碼',
  },
  {
    slug: 'register-converter',
    name: '暫存器與浮點數',
    category: 'PLC 與通訊',
    code: 'FLOAT',
    description: '整數、float32 與暫存器位元組排列互轉。',
    keywords: 'IEEE 754 endian ABCD BADC CDAB DCBA',
  },
  {
    slug: 'voltage-divider',
    name: '電阻分壓計算',
    category: '電路',
    code: 'R1/R2',
    description: '計算輸出電壓、功耗，或反推需要的電阻。',
    keywords: '歐姆 分壓 電流',
  },
  {
    slug: 'electrical',
    name: '電壓・電流・功率',
    category: '電路',
    code: 'V·A·W',
    description: '直流歐姆定律，以及單相、三相交流功率換算。',
    keywords: '瓦數 消耗 電阻 歐姆 功率因數 PF Ω',
  },
  {
    slug: '555-timer',
    name: '555 計算器',
    category: '電路',
    code: '555',
    description: '單穩態與無穩態計算，支援目標值反推。',
    keywords: '脈衝 頻率 占空比 定時器 NE555',
  },
  {
    slug: 'resistor-color',
    name: '電阻色碼',
    category: '電路',
    code: 'BANDS',
    description: '四環、五環色碼與阻值、容差雙向換算。',
    keywords: '色環 電阻 顏色',
  },
  {
    slug: 'resistor-network',
    name: '串並聯電阻',
    category: '電路',
    code: 'ΣR',
    description: '快速計算多顆電阻的串聯或並聯等效阻值。',
    keywords: '等效 電阻 歐姆',
  },
  {
    slug: 'rc-time',
    name: 'RC 時間常數',
    category: '電路',
    code: 'τ=RC',
    description: '時間常數、充放電電壓與響應曲線。',
    keywords: '電容 充電 放電',
  },
  {
    slug: 'qrcode',
    name: 'QR Code 生成器',
    category: '編碼',
    code: 'QR',
    description: '文字、網址、Wi-Fi 與聯絡人名片 QR Code。',
    keywords: 'QRCored 二維碼 wifi PNG SVG',
  },
  {
    slug: 'big5',
    name: '中文 → Big5',
    category: '編碼',
    code: 'BIG5',
    description: '每字分組、逐字對照與整段 HEX 位元組。',
    keywords: '繁體 中文 編碼 HEX HMI',
  },
  {
    slug: 'unit-converter',
    name: '工程單位換算',
    category: '單位',
    code: 'SI ↔',
    description: '壓力、流量、時間、質量、體積等九類常用單位。',
    keywords: '重量 溫度 長度 面積 速度 psi bar kg L',
  },
] as const;
export type ToolSlug = (typeof tools)[number]['slug'];
export function getTool(slug: ToolSlug) {
  return tools.find((tool) => tool.slug === slug)!;
}

export const toolExamples: Record<ToolSlug, string> = {
  analog: '4–20 mA 對應 0–100：輸入 12 mA 得到 50；轉成 0–10 V 時為 5 V。',
  'plc-scaling': '原始量程 0–27648 對應 0–100：13824 換成工程值 50。',
  'base-converter':
    '選擇 8 位元有號，十六進位 FF 的十進位值為 −1；無號時為 255。',
  'modbus-address':
    '五位數 Holding Register 40101 對應零起算位址 100（HEX 0064），讀取功能碼 03。',
  'modbus-crc': '01 03 00 00 00 0A 的 CRC 為 CDC5，線路上附加 C5 CD。',
  'register-converter':
    'Float32 數值 12.5，以 ABCD 排列為 4148 0000；CDAB 為 0000 4148。',
  'voltage-divider':
    'Vin = 24 V，R1 = R2 = 10000 Ω：Vout = 12 V，電流 1.2 mA。',
  electrical:
    '直流 24 V、0.2 A 對應 120 Ω、4.8 W；單相 220 V、10 A、PF 0.8 為 1760 W。',
  '555-timer':
    '無穩態 RA = RB = 10000 Ω、C = 0.000001 F：頻率約 48.09 Hz，占空比約 66.67%。',
  'resistor-color': '四環棕、黑、紅、金：1000 Ω ±5%，範圍 950–1050 Ω。',
  'resistor-network': '100、220、330 Ω 串聯為 650 Ω；兩顆 100 Ω 並聯為 50 Ω。',
  'rc-time':
    'R = 10000 Ω、C = 0.0001 F、Vin = 5 V：τ = 1 s，充電 1 s 約為 3.1606 V。',
  qrcode:
    '選擇「文字」輸入繁體中文即可產生 QR；Wi-Fi 模式會組成掃碼器可辨識的連線資料。',
  big5: '「你好」每字分組為 A741 A66E；整段位元組為 A7 41 A6 6E。',
  'unit-converter': '1 bar = 100 kPa；1 L/min = 0.06 m³/h；0 °C = 32 °F。',
};
