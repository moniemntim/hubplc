import type { Locale } from '@/lib/locale';

const exactEnglish: Record<string, string> = {
  無法表示: 'Not representable',
  '結果超出可表示範圍，請調整輸入。':
    'The result is outside the supported range. Adjust the input.',
  '無法完成計算。': 'The calculation could not be completed.',
  '日期月份無效。': 'The month is invalid.',
  '日期請使用 YYYY-MM-DD 格式。': 'Use YYYY-MM-DD for the date.',
  '日期不存在，請檢查月份與日期。':
    'That date does not exist. Check the month and day.',
  '日期超出可計算範圍。': 'The date is outside the supported range.',
  '台北日期時間請使用 YYYY-MM-DD HH:mm:ss 格式。':
    'Use YYYY-MM-DD HH:mm:ss for Taipei date and time.',
  '時間必須在 00:00:00～23:59:59。':
    'Time must be between 00:00:00 and 23:59:59.',
  '時間戳單位必須是秒或毫秒。':
    'Timestamp unit must be seconds or milliseconds.',
  'Unix 時間戳超出可計算範圍。':
    'The Unix timestamp is outside the supported range.',
  'Unix 時間戳無效。': 'The Unix timestamp is invalid.',
  '日期時間超出可計算範圍。':
    'The date and time are outside the supported range.',
  '功率因數不可大於 1。': 'Power factor cannot exceed 1.',
  '請選擇有效的供電方式。': 'Select a valid supply type.',
  '請選擇有效的換算方向。': 'Select a valid conversion direction.',
  '請選擇有效的計算方式。': 'Select a valid calculation mode.',
  '實功率不可大於視在功率。': 'Real power cannot exceed apparent power.',
  '實功率與虛功率不可同時為 0。':
    'Real and reactive power cannot both be zero.',
  '反推平均功率時，時間必須大於 0。':
    'Time must be greater than zero when solving for average power.',
  '匯率資料不完整，請稍後重試或改用手動匯率。':
    'Rate data is incomplete. Try again later or use a manual rate.',
  '匯率資料的幣別格式不正確。':
    'The currency format in the rate data is invalid.',
  '匯率資料包含無效數值。': 'The rate data contains an invalid value.',
  '匯率資料缺少有效日期。': 'The rate data has no valid date.',
  '匯率資料的日期不正確。': 'The rate-data date is invalid.',
  '找不到所選幣別的匯率。': 'No rate was found for the selected currency.',
  '匯率必須是正數。': 'The exchange rate must be positive.',
  '匯率超出可表示範圍。': 'The exchange rate is outside the supported range.',
  '金額必須介於 0 與 10¹⁵ 之間。': 'The amount must be between 0 and 10¹⁵.',
  '匯率必須是有限的正數。':
    'The exchange rate must be a finite positive number.',
  '結果超出可表示範圍。': 'The result is outside the supported range.',
  '找不到所選單位。': 'The selected unit was not found.',
  '這兩個單位的物理量不同，不能直接換算。':
    'These units measure different quantities and cannot be converted directly.',
  '溫度不能低於絕對零度（0 K）。':
    'Temperature cannot be below absolute zero (0 K).',
  '無效的時間。': 'The time is invalid.',
  '瀏覽器無法辨識時區偏移。':
    'The browser could not determine the time-zone offset.',
};

const labels: Record<string, string> = {
  數值: 'Value',
  金額: 'Amount',
  匯率: 'Exchange rate',
  電壓: 'Voltage',
  線電壓: 'Line voltage',
  電流: 'Current',
  功率: 'Power',
  實功率: 'Real power',
  視在功率: 'Apparent power',
  虛功率: 'Reactive power',
  功率因數: 'Power factor',
  相位角: 'Phase angle',
  用電量: 'Energy',
  平均功率: 'Average power',
  時間: 'Time',
  天數: 'Days',
  每度電價: 'Price per kWh',
  瓦時: 'Watt-hours',
  焦耳: 'Joules',
  電費: 'Cost',
  增減天數: 'Day offset',
  'Unix 秒數': 'Unix seconds',
  'Unix 毫秒': 'Unix milliseconds',
};

function label(value: string) {
  return labels[value] ?? value;
}

export function translateToolMessage(message: string, locale: Locale) {
  if (locale !== 'en' || !message) return message;
  if (exactEnglish[message]) return exactEnglish[message];

  let match = message.match(/^請填寫(.+)。$/);
  if (match) return `Enter ${label(match[1]).toLowerCase()}.`;
  match = message.match(/^(.+)必須是有效的十進位數字。$/);
  if (match) return `${label(match[1])} must be a valid decimal number.`;
  match = message.match(/^(.+)超出可計算範圍。$/);
  if (match) return `${label(match[1])} is outside the supported range.`;
  match = message.match(/^(.+)超出可表示範圍。$/);
  if (match) return `${label(match[1])} is outside the representable range.`;
  match = message.match(/^(.+)必須大於 0。$/);
  if (match) return `${label(match[1])} must be greater than zero.`;
  match = message.match(/^(.+)不可小於 0。$/);
  if (match) return `${label(match[1])} cannot be less than zero.`;
  match = message.match(/^(.+)必須是安全整數。$/);
  if (match) return `${label(match[1])} must be a safe integer.`;
  match = message.match(/^年份必須在 (.+)。$/);
  if (match) return `Year must be within ${match[1]}.`;
  match = message.match(/^結果年份必須在 (.+)。$/);
  if (match) return `The result year must be within ${match[1]}.`;
  match = message.match(/^台北日期時間必須在 (.+)。$/);
  if (match) return `Taipei date and time must be within ${match[1]}.`;

  return /[\p{Script=Han}]/u.test(message)
    ? 'The input is invalid or outside the supported range. Check the values and try again.'
    : message;
}
