import { conversionTools, conversionExamples } from './conversion-registry.ts';
export const categories = [
  '全部',
  'PLC 與通訊',
  '電路',
  '編碼',
  '單位',
] as const;
export const tools = [
  ...conversionTools,
  {
    slug: 'key-derivation',
    name: '密鑰派生 PBKDF2／EvpKDF',
    category: '編碼',
    code: 'KDF',
    description:
      '自訂密碼、鹽值、雜湊與迭代次數，派生密鑰並輸出 HEX 或 Base64。',
    keywords: 'PBKDF2 EvpKDF EVP 密鑰派生 金鑰 salt 鹽 HMAC 密碼',
  },
  {
    slug: 'byte-encoding',
    name: 'Base64 與文字編碼轉換',
    category: '編碼',
    code: '64 ↔ 字',
    description: 'Base64、Base64URL、HEX、Latin1 與 UTF-8／UTF-16 位元組轉換。',
    keywords:
      'Base64 Base64URL HEX Latin1 UTF8 UTF16 UTF-8 UTF-16 編碼 解碼 位元組',
  },
  {
    slug: 'crypto',
    name: '文字加密／解密',
    category: '編碼',
    code: 'AES',
    description: 'AES-GCM 文字加解密，以及 AES、DES、RC4 等舊格式相容工具。',
    keywords: '加密 解密 AES GCM CBC DES TripleDES RC4 Rabbit CryptoJS 密碼',
  },
  {
    slug: 'hash',
    name: '雜湊與 HMAC',
    category: '編碼',
    code: 'SHA',
    description:
      '計算 SHA、MD5、RIPEMD-160 摘要或 HMAC，支援 HEX 與 Base64 輸出。',
    keywords:
      '雜湊 哈希 hash HMAC SHA3 Keccak SHA256 SHA512 SHA384 SHA224 SHA1 MD5 RIPEMD160 摘要',
  },
  {
    slug: 'password-generator',
    name: '密碼產生器',
    category: '編碼',
    code: 'A7#x',
    description: '在瀏覽器產生隨機密碼、好記片語或 PIN，自訂長度與字元。',
    keywords: '密碼 隨機 安全 password generator PIN 片語 亂數',
  },
  {
    slug: 'text-repair',
    name: '文字亂碼修復與檔案轉碼',
    category: '編碼',
    code: 'UTF ↔ 字',
    description: '比較中日韓亂碼修復候選，讀取文字檔並轉換編碼。',
    keywords:
      '文字轉換 亂碼還原 Big5 GBK GB18030 UTF-8 Shift JIS EUC 日文 韓文 檔案 轉碼',
  },
  {
    slug: 'battery-life',
    name: '電池續航估算',
    category: '電路',
    code: 'Ah / A',
    description: '依電池容量、固定耗電與可用容量比例估算運作時間。',
    keywords: '電池 續航 壽命 mAh Ah mA 容量 battery',
  },
  {
    slug: 'capacitor-discharge',
    name: '電容放電計算',
    category: '電路',
    code: 'V(t)',
    description: '計算放電至目標電壓的時間，或反推電阻與初始功耗。',
    keywords: 'RC 放電 時間 電阻 能量 焦耳 電容',
  },
  {
    slug: 'dbm-watts',
    name: 'dBm 與瓦特換算',
    category: '單位',
    code: 'dBm ↔ W',
    description: 'dBm、dBW、瓦特與毫瓦的功率換算。',
    keywords: 'RF 無線 射頻 功率 dBW mW 分貝 毫瓦',
  },
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
  {
    slug: 'capacitor-network',
    name: '串並聯電容',
    category: '電路',
    code: 'ΣC',
    description: '多顆電容串聯或並聯，計算等效容量並連動電路圖。',
    keywords: '電容量 電容器 pF nF μF µF',
  },
  {
    slug: 'smd-capacitor',
    name: 'SMD 電容代碼',
    category: '電路',
    code: '104',
    description: '電容三位數與 R 小數代碼、容量及容差雙向換算。',
    keywords: '貼片 陶瓷 代碼 J K M 104',
  },
  {
    slug: 'led-resistor',
    name: 'LED 串聯電阻',
    category: '電路',
    code: 'LED',
    description: '依 LED 數量、壓降與目標電流計算限流電阻及功耗。',
    keywords: '發光二極體 限流 電阻 E24',
  },
  {
    slug: 'smd-resistor',
    name: 'SMD 電阻代碼',
    category: '電路',
    code: 'EIA96',
    description: '三位數、四位數、R 小數與 EIA-96 阻值雙向換算。',
    keywords: '貼片 472 1001 零歐姆 01A',
  },
  {
    slug: 'current-divider',
    name: '支路電流分配',
    category: '電路',
    code: 'I₁+I₂',
    description: '並聯電阻各支路電流、占比與功耗計算。',
    keywords: '分流 並聯 支路 電流分配',
  },
  {
    slug: 'shunt-resistor',
    name: '量測分流電阻',
    category: '電路',
    code: 'mV/A',
    description: '由壓降、電流與阻值計算分流電阻，換算實測電流。',
    keywords: '分流器 shunt 75mV 電流量測 毫歐',
  },
  {
    slug: 'rc-filter',
    name: 'RC 濾波器',
    category: '電路',
    code: 'fᶜ',
    description: '一階低通與高通截止頻率、增益、相位及頻率曲線。',
    keywords: 'RC 低通 高通 LPF HPF 截止',
  },
  {
    slug: 'reactance',
    name: '容抗／感抗',
    category: '電路',
    code: 'Xᶜ·Xᴸ',
    description: '電容、電感與頻率雙向換算電抗，查看頻率曲線。',
    keywords: '容抗 感抗 阻抗 Hz 電感',
  },
  {
    slug: 'lc-resonance',
    name: 'LC 諧振',
    category: '電路',
    code: 'LC',
    description: '由電感、電容或理想諧振頻率中的兩項計算第三項。',
    keywords: '共振 諧振 電感 頻率',
  },
  {
    slug: 'preferred-resistor',
    name: '標準電阻選值',
    category: '電路',
    code: 'E6–96',
    description: '查找 E 系列相鄰標準阻值、最接近阻值與誤差。',
    keywords: 'E6 E12 E24 E48 E96 優選 標準電阻',
  },
] as const;
export type ToolSlug = (typeof tools)[number]['slug'];
export function getTool(slug: ToolSlug) {
  return tools.find((tool) => tool.slug === slug)!;
}

export const toolExamples: Record<ToolSlug, string> = {
  ...conversionExamples,
  'key-derivation':
    'PBKDF2-HMAC-SHA256，密碼 password、UTF-8 鹽值 salt、迭代 1 次、256 bits：120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b。此為公開測試向量。',
  'byte-encoding':
    'UTF-8 文字「中文」的 Base64 為 5Lit5paH，HEX 為 e4b8ade69687。',
  crypto:
    '輸入原文與密碼進行加密，再用「將結果帶入反向操作」驗證還原。請勿將測試用密碼用於真實敏感資料。',
  hash: 'SHA-256 的 abc 摘要為 ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad。',
  'password-generator':
    '預設為 20 字元，包含大小寫字母、數字及符號。按下產生後才會建立新密碼。',
  'text-repair':
    'UTF-8「中文」被 Windows-1252 誤讀成「ä¸­æ–‡」；選取相對應候選可還原。',
  'battery-life':
    '2000 mAh 電池、100 mA 固定耗電、100% 可用容量：理想續航 20 小時。',
  'capacitor-discharge':
    '100 µF 電容經 10 kΩ 電阻從 24 V 放電至 5 V，理論上約需 1.5686 秒。',
  'dbm-watts': '0 dBm = 1 mW；30 dBm = 1 W = 0 dBW。',
  'capacitor-network': '兩顆 100 nF 電容串聯為 50 nF，並聯為 200 nF。',
  'smd-capacitor': '104 = 100000 pF = 100 nF = 0.1 µF；104K 表示 ±10% 容差。',
  'led-resistor':
    '5 V 電源、一顆 Vf = 2 V 的 LED、目標 20 mA：理論電阻 150 Ω、功耗 0.06 W。',
  'smd-resistor': '472 = 4.7 kΩ；1001 = 1 kΩ；EIA-96 的 01A = 100 Ω。',
  'current-divider': '兩顆 100 Ω 並聯接 10 V：各支路 0.1 A，總電流 0.2 A。',
  'shunt-resistor':
    '額定 100 A／75 mV 的分流器為 0.75 mΩ；量到 37.5 mV 對應 50 A。',
  'rc-filter':
    'R = 10 kΩ、C = 10 nF：截止頻率約 1591.55 Hz，截止點增益約 −3.01 dB。',
  reactance: '1 kHz、100 nF 電容的容抗約 1591.55 Ω。',
  'lc-resonance': 'L = 10 mH、C = 100 nF：理想諧振頻率約 5032.92 Hz。',
  'preferred-resistor':
    'E24 目標 128 Ω：下方 120 Ω、上方 130 Ω，最接近為 130 Ω。',
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
