import type { AcPowerPreset } from '../../app/tool/_calculators/ac-power-converter';
import type { EnergyPreset } from '../../app/tool/_calculators/energy-cost';

type Bilingual = { zh: string; en: string };

export type WorkedCase<Preset> = {
  id: string;
  title: Bilingual;
  problem: Bilingual;
  inputs: Array<{ field: Bilingual; value: string; source: Bilingual }>;
  steps: Bilingual[];
  expected: Bilingual[];
  interpretation: Bilingual;
  boundary: Bilingual;
  preset: Preset;
};

export const powerWorkedCases: ReadonlyArray<WorkedCase<AcPowerPreset>> = [
  {
    id: 'single-current-to-power',
    title: {
      zh: '案例 1：單相 10 A 的實功率與視在功率',
      en: 'Case 1: real and apparent power from 10 A single-phase current',
    },
    problem: {
      zh: '要先用已知的電壓、電流與功率因數，估算一個單相交流負載的輸入功率與容量。',
      en: 'Estimate the input real power and capacity of a single-phase AC load from known voltage, current, and power factor.',
    },
    inputs: [
      {
        field: { zh: '電流', en: 'Current' },
        value: '10 A',
        source: {
          zh: '鉗形表或回路量測紀錄',
          en: 'Clamp-meter or circuit measurement record',
        },
      },
      {
        field: { zh: '電壓', en: 'Voltage' },
        value: '220 V',
        source: {
          zh: '供電規格或量測紀錄',
          en: 'Supply specification or measurement record',
        },
      },
      {
        field: { zh: '功率因數', en: 'Power factor' },
        value: '0.8',
        source: {
          zh: '設備銘牌、規格書或電力品質量測',
          en: 'Nameplate, specification, or power-quality measurement',
        },
      },
    ],
    steps: [
      {
        zh: '選擇「安培 → W／kW／VA／kVA」。',
        en: 'Choose “Amps → W/kW/VA/kVA.”',
      },
      {
        zh: '選擇「單相交流」，已知量單位選 A。',
        en: 'Choose “Single-phase AC” and use A as the known unit.',
      },
      {
        zh: '依序輸入 10、220、0.8，再讀取實功率與視在功率。',
        en: 'Enter 10, 220, and 0.8, then read real and apparent power.',
      },
    ],
    expected: [
      { zh: '實功率：1,760 W（1.76 kW）', en: 'Real power: 1,760 W (1.76 kW)' },
      {
        zh: '視在功率：2,200 VA（2.2 kVA）',
        en: 'Apparent power: 2,200 VA (2.2 kVA)',
      },
    ],
    interpretation: {
      zh: '視在功率是 V × I；實功率再乘上 PF。PF 不能只從電流猜出，必須有設備資料或量測依據。',
      en: 'Apparent power is V × I; real power is then multiplied by PF. PF cannot be inferred from current alone; use equipment data or a measurement.',
    },
    boundary: {
      zh: '這是教學假設算例；電壓波動、非正弦波與啟動瞬間不會由這三個輸入完整描述。',
      en: 'This is a teaching assumption, not a field measurement. Voltage variation, waveform distortion, and startup transients are not fully described by these three inputs.',
    },
    preset: {
      mode: 'current-to-power',
      phase: 'single',
      unit: 'A',
      value: '10',
      other: '220',
      pf: '0.8',
    },
  },
  {
    id: 'three-power-to-current',
    title: {
      zh: '案例 2：平衡三相 10 kW 反推線電流',
      en: 'Case 2: line current from 10 kW balanced three-phase power',
    },
    problem: {
      zh: '在已知三相輸入實功率、線電壓與功率因數時，估算各線的電流及所需視在功率。',
      en: 'Estimate line current and apparent power when three-phase input real power, line voltage, and power factor are known.',
    },
    inputs: [
      {
        field: { zh: '實功率', en: 'Real power' },
        value: '10 kW',
        source: {
          zh: '設備輸入功率規格或量測紀錄',
          en: 'Equipment input-power specification or measurement record',
        },
      },
      {
        field: { zh: '線電壓', en: 'Line voltage' },
        value: '380 V',
        source: {
          zh: '配電系統規格或量測紀錄',
          en: 'Distribution-system specification or measurement record',
        },
      },
      {
        field: { zh: '功率因數', en: 'Power factor' },
        value: '0.8',
        source: {
          zh: '設備規格或電力品質量測',
          en: 'Equipment specification or power-quality measurement',
        },
      },
    ],
    steps: [
      { zh: '選擇「W／kW／MW → 安培」。', en: 'Choose “W/kW/MW → Amps.”' },
      {
        zh: '選擇「平衡三相交流」，已知量單位選 kW。',
        en: 'Choose “Balanced three-phase AC” and kW as the known unit.',
      },
      {
        zh: '輸入 10、380、0.8；三相欄位的 380 V 是線電壓。',
        en: 'Enter 10, 380, and 0.8. In three-phase mode, 380 V is line voltage.',
      },
    ],
    expected: [
      {
        zh: '線電流：18.991785 A（約 19.0 A）',
        en: 'Line current: 18.991785 A (about 19.0 A)',
      },
      { zh: '視在功率：12.5 kVA', en: 'Apparent power: 12.5 kVA' },
    ],
    interpretation: {
      zh: '此公式假設三相平衡，結果是三相合計輸入功率對應的線電流。若 10 kW 是馬達軸輸出，而非電氣輸入，還要納入效率，不能直接代入。',
      en: 'The formula assumes a balanced system; the result is line current for total three-phase input power. If 10 kW is motor shaft output rather than electrical input, efficiency must also be included.',
    },
    boundary: {
      zh: '不要把相電壓當作線電壓，也不要用本算例取代不平衡負載、諧波或保護整定計算。',
      en: 'Do not substitute phase voltage for line voltage, or use this case for unbalanced loads, harmonics, or protective-device coordination.',
    },
    preset: {
      mode: 'power-to-current',
      phase: 'three',
      unit: 'kW',
      value: '10',
      other: '380',
      pf: '0.8',
    },
  },
  {
    id: 'real-to-apparent-ups',
    title: {
      zh: '案例 3：800 W 負載是否超過 UPS 的 VA 容量',
      en: 'Case 3: whether an 800 W load exceeds a UPS VA rating',
    },
    problem: {
      zh: '已知負載為 800 W、PF 為 0.6，先換算視在功率，再與假設的 UPS 1200 VA／900 W 額定值比較。',
      en: 'Given an 800 W load at PF 0.6, convert to apparent power before comparing with a hypothetical UPS rated 1200 VA / 900 W.',
    },
    inputs: [
      {
        field: { zh: '實功率', en: 'Real power' },
        value: '800 W',
        source: {
          zh: '負載規格或量測紀錄',
          en: 'Load specification or measurement record',
        },
      },
      {
        field: { zh: '功率因數', en: 'Power factor' },
        value: '0.6',
        source: {
          zh: '負載規格或量測紀錄',
          en: 'Load specification or measurement record',
        },
      },
      {
        field: {
          zh: 'UPS 額定值（比較條件）',
          en: 'UPS rating (comparison condition)',
        },
        value: '1200 VA / 900 W',
        source: {
          zh: '本教學的假設條件',
          en: 'Teaching assumption in this case',
        },
      },
    ],
    steps: [
      { zh: '選擇「W／kW／MW → VA／kVA」。', en: 'Choose “W/kW/MW → VA/kVA.”' },
      {
        zh: '選擇「單相交流」，已知量單位選 W。',
        en: 'Choose “Single-phase AC” and W as the known unit.',
      },
      {
        zh: '輸入 800 與 0.6，將計算出的 VA 同時比對 UPS 的 VA 與 W 額定值。',
        en: 'Enter 800 and 0.6, then compare the calculated VA with both UPS VA and W ratings.',
      },
    ],
    expected: [
      {
        zh: '視在功率：1,333.333 VA（約 1.333 kVA）',
        en: 'Apparent power: 1,333.333 VA (about 1.333 kVA)',
      },
      {
        zh: '800 W 小於 900 W，但 1,333.333 VA 大於 1,200 VA，因此此假設 UPS 仍不符合 VA 容量。',
        en: '800 W is below 900 W, but 1,333.333 VA is above 1,200 VA; the hypothetical UPS still fails its VA capacity.',
      },
    ],
    interpretation: {
      zh: '容量比較要同時看 W 與 VA，較先超限的一項決定不能這樣配置。',
      en: 'Compare both W and VA; whichever limit is exceeded first prevents this configuration.',
    },
    boundary: {
      zh: '續航時間與啟動／突入電流是另一組條件；本例只處理穩態容量，不代表 UPS 可帶動任何啟動負載。',
      en: 'Runtime and startup/inrush current are separate conditions. This case covers steady-state capacity only and does not prove the UPS can start every load.',
    },
    preset: {
      mode: 'real-to-apparent',
      phase: 'single',
      unit: 'W',
      value: '800',
      pf: '0.6',
    },
  },
];

export const energyWorkedCases: ReadonlyArray<WorkedCase<EnergyPreset>> = [
  {
    id: 'monthly-energy-from-power',
    title: {
      zh: '案例 1：用功率、時數與天數估算用電量',
      en: 'Case 1: estimate energy use from power, hours, and days',
    },
    problem: {
      zh: '以固定使用型態估算一個 1.5 kW 負載 22 天的用電量與自訂單一電價的金額。',
      en: 'Estimate 22 days of energy use for a 1.5 kW load with a fixed usage pattern and a custom flat rate.',
    },
    inputs: [
      {
        field: { zh: '功率', en: 'Power' },
        value: '1.5 kW',
        source: {
          zh: '設備輸入功率規格或量測紀錄',
          en: 'Equipment input-power specification or measurement record',
        },
      },
      {
        field: { zh: '每日使用時間', en: 'Daily usage time' },
        value: '6 h',
        source: {
          zh: '排程、運轉紀錄或使用假設',
          en: 'Schedule, run log, or usage assumption',
        },
      },
      {
        field: { zh: '使用天數', en: 'Usage days' },
        value: '22 days',
        source: {
          zh: '計費區間或使用假設',
          en: 'Billing period or usage assumption',
        },
      },
      {
        field: { zh: '每度電價', en: 'Price per kWh' },
        value: '3.2',
        source: {
          zh: '本教學的自訂單一費率',
          en: 'Custom flat rate for this teaching case',
        },
      },
    ],
    steps: [
      {
        zh: '選擇「功率＋時間 → 用電量與電費」，功率單位選 kW。',
        en: 'Choose “Power + time → energy use and cost” and kW.',
      },
      { zh: '輸入 1.5、6、22 與 3.2。', en: 'Enter 1.5, 6, 22, and 3.2.' },
      {
        zh: '以 kW × 小時 × 天數取得 kWh，再乘自訂費率。',
        en: 'Use kW × hours × days for kWh, then multiply by the custom rate.',
      },
    ],
    expected: [
      { zh: '用電量：198 kWh', en: 'Energy use: 198 kWh' },
      {
        zh: '估算金額：633.6 個貨幣單位',
        en: 'Estimated cost: 633.6 currency units',
      },
    ],
    interpretation: {
      zh: '這是固定功率與固定使用時間的算術估算；3.2 是自行輸入的費率，不能直接當作實際電業帳單。',
      en: 'This is arithmetic under fixed power and hours. The 3.2 rate is user-entered, not a claim about an actual utility bill.',
    },
    boundary: {
      zh: '實際帳單可能含級距、需量、基本費、稅費或其他項目；變動負載應改用分段紀錄或電表資料。',
      en: 'Actual bills may include tiers, demand, base charges, taxes, or other items. Use interval records or meter data for variable loads.',
    },
    preset: {
      mode: 'from-power',
      unit: 'kW',
      value: '1.5',
      hours: '6',
      days: '22',
      rate: '3.2',
    },
  },
  {
    id: 'average-power-from-energy',
    title: {
      zh: '案例 2：由 10 kWh 反推 5 小時平均功率',
      en: 'Case 2: average power from 10 kWh over 5 hours',
    },
    problem: {
      zh: '已知一段期間累積 10 kWh、持續 5 小時，反推區間平均功率並用自訂費率估算金額。',
      en: 'Given 10 kWh accumulated over 5 hours, calculate interval-average power and estimate cost using a custom rate.',
    },
    inputs: [
      {
        field: { zh: '用電量', en: 'Energy use' },
        value: '10 kWh',
        source: {
          zh: '電表、子表或帳務區間紀錄',
          en: 'Meter, submeter, or billing-interval record',
        },
      },
      {
        field: { zh: '總時間', en: 'Total time' },
        value: '5 h',
        source: {
          zh: '區間開始與結束時間',
          en: 'Interval start and end times',
        },
      },
      {
        field: { zh: '每度電價', en: 'Price per kWh' },
        value: '3',
        source: {
          zh: '本教學的自訂單一費率',
          en: 'Custom flat rate for this teaching case',
        },
      },
    ],
    steps: [
      {
        zh: '選擇「用電量＋時間 → 平均功率」，能量單位選 kWh。',
        en: 'Choose “Energy use + time → average power” and kWh.',
      },
      { zh: '輸入 10、5 與 3。', en: 'Enter 10, 5, and 3.' },
      {
        zh: '以 kWh ÷ 小時得到區間平均 kW，再以 kWh × 費率估算金額。',
        en: 'Divide kWh by hours for interval-average kW, then multiply kWh by the rate.',
      },
    ],
    expected: [
      { zh: '平均功率：2 kW', en: 'Average power: 2 kW' },
      {
        zh: '估算金額：30 個貨幣單位',
        en: 'Estimated cost: 30 currency units',
      },
    ],
    interpretation: {
      zh: '2 kW 只是這 5 小時的平均值，不能揭露期間內是否出現更高的瞬時峰值。',
      en: '2 kW is only the five-hour average; it does not reveal whether a higher instantaneous peak occurred.',
    },
    boundary: {
      zh: '不要將平均功率當成需量或設備額定值；需要峰值時，應使用足夠取樣頻率的量測或需量資料。',
      en: 'Do not treat average power as demand or equipment rating. Use adequately sampled measurements or demand data when peak power matters.',
    },
    preset: {
      mode: 'from-energy',
      unit: 'kWh',
      value: '10',
      hours: '5',
      rate: '3',
    },
  },
];
