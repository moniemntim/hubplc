import type { ToolSlug } from '../registry.ts';
import type { GuideText, ToolGuideCase, ToolGuideData } from './types.ts';

const t = (zh: string, en: string): GuideText => ({ zh, en });
const input = (
  labelZh: string,
  labelEn: string,
  value: string | GuideText,
  sourceZh: string,
  sourceEn: string,
) => ({
  label: t(labelZh, labelEn),
  value,
  source: t(sourceZh, sourceEn),
});
const worked = (
  titleZh: string,
  titleEn: string,
  inputs: ToolGuideCase['inputs'],
  stepsZh: string[],
  stepsEn: string[],
  expectedZh: string[],
  expectedEn: string[],
  interpretationZh: string,
  interpretationEn: string,
): ToolGuideCase => ({
  title: t(titleZh, titleEn),
  inputs,
  steps: stepsZh.map((step, index) => t(step, stepsEn[index] ?? step)),
  expected: expectedZh.map((value, index) =>
    t(value, expectedEn[index] ?? value),
  ),
  interpretation: t(interpretationZh, interpretationEn),
});
const guide = (
  taskZh: string,
  taskEn: string,
  scopeZh: string,
  scopeEn: string,
  example: ToolGuideCase,
  pitfalls: Array<[string, string]>,
  related: string[],
): ToolGuideData => ({
  task: t(taskZh, taskEn),
  scope: t(scopeZh, scopeEn),
  cases: [example],
  pitfalls: pitfalls.map(([zh, en]) => t(zh, en)),
  related,
});

/**
 * Page-specific worked cases for electrical tools.  PLC and the two larger
 * power tools keep their existing specialised guides; their live checks are
 * in tests/tool-audit/electrical-plc.mjs.
 */
export const electricalPlcGuides: Partial<Record<ToolSlug, ToolGuideData>> = {
  'power-factor': guide(
    '由量測的實功率與視在功率確認負載功率因數。',
    'Confirm load power factor from measured real and apparent power.',
    '適用正弦穩態的總量 P、Q、S；不取代諧波或不平衡量測。',
    'For total sinusoidal steady-state P, Q and S; not harmonic or imbalance analysis.',
    worked(
      '馬達負載的 PF',
      'Motor-load PF',
      [
        input(
          '實功率 P',
          'Active power P',
          '8 kW',
          '電表實功率讀值',
          'Power-meter real-power reading',
        ),
        input(
          '視在功率 S',
          'Apparent power S',
          '10 kVA',
          '電表視在功率讀值',
          'Power-meter apparent-power reading',
        ),
      ],
      ['選擇「實功率與視在功率」。', '輸入 8 kW 與 10 kVA。'],
      ['Select “active and apparent power”.', 'Enter 8 kW and 10 kVA.'],
      ['PF = 0.8。', '相位角約 36.87°，虛功率 6 kvar。'],
      [
        'PF = 0.8.',
        'Phase angle is about 36.87° and reactive power is 6 kvar.',
      ],
      'PF 小於 1 表示有無功成分；改善前應先確認讀值是同一時間區間的總量。',
      'PF below 1 indicates a reactive component; confirm readings cover the same interval before correction.',
    ),
    [
      [
        'P 不可大於 S，否則輸入組合不成立。',
        'P cannot exceed S; that input pair is invalid.',
      ],
      [
        'kW、kVA、kvar 必須各自選對單位。',
        'Use the correct unit for kW, kVA and kvar.',
      ],
    ],
    ['ac-power-converter', 'va-to-amps'],
  ),
  'va-to-amps': guide(
    '依視在功率和供電型式估算線電流。',
    'Estimate line current from apparent power and supply type.',
    '適用單相或平衡三相的 RMS 視在功率；不以 PF 換算實功率。',
    'For single-phase or balanced three-phase RMS apparent power; it does not convert to real power with PF.',
    worked(
      '單相 UPS 輸出電流',
      'Single-phase UPS output current',
      [
        input(
          '視在功率',
          'Apparent power',
          '1000 VA',
          'UPS 銘牌',
          'UPS nameplate',
        ),
        input(
          '電壓',
          'Voltage',
          '220 V',
          '額定輸出電壓',
          'Rated output voltage',
        ),
      ],
      ['選擇單相交流與 VA。', '輸入 1000 VA、220 V。'],
      ['Select single-phase AC and VA.', 'Enter 1000 VA and 220 V.'],
      ['電流約 4.545 A。', '公式為 I = S / V。'],
      ['Current is about 4.545 A.', 'Formula: I = S / V.'],
      '這是額定視在功率電流；導線和保護元件仍要依規範、環境與啟動電流選型。',
      'This is rated apparent-power current; size conductors and protection for code, environment and inrush.',
    ),
    [
      [
        '三相欄位的電壓是線電壓，公式含 √3。',
        'Three-phase voltage is line voltage and the formula includes √3.',
      ],
      [
        'VA 與 W 不可直接視為相同。',
        'Do not treat VA and W as interchangeable.',
      ],
    ],
    ['ac-power-converter', 'power-factor'],
  ),
  'battery-life': guide(
    '以平均電流與可用容量估算電池續航。',
    'Estimate battery runtime from average current and usable capacity.',
    '是負載平均值的初估；不模擬放電曲線、脈衝峰值或低溫降容。',
    'A first estimate using average load; it does not model discharge curves, pulses, or cold derating.',
    worked(
      '2000 mAh 感測節點',
      '2000 mAh sensor node',
      [
        input(
          '電池容量',
          'Battery capacity',
          '2000 mAh',
          '電池標稱容量',
          'Battery rated capacity',
        ),
        input(
          '平均負載電流',
          'Average load current',
          '0.1 A',
          '量測週期平均值',
          'Measured duty-cycle average',
        ),
        input(
          '可用容量',
          'Usable capacity',
          '100%',
          '先以理想值估算',
          'Ideal first estimate',
        ),
      ],
      ['保留 mAh 單位，輸入 0.1 A。', 'Keep mAh selected and enter 0.1 A.'],
      ['Keep mAh selected and enter 0.1 A.'],
      ['預估續航 20 小時，約 0.833 天。', '有效容量為 2 Ah。'],
      [
        'Estimated runtime is 20 hours, about 0.833 days.',
        'Usable capacity is 2 Ah.',
      ],
      '部署值應將可用容量降額，並用量測的睡眠、傳輸及峰值電流重新計算。',
      'Derate usable capacity for deployment and recalculate using measured sleep, transmit, and peak current.',
    ),
    [
      [
        'mAh 會先換算為 Ah，電流欄位是 A。',
        'mAh is converted to Ah; the current field is amperes.',
      ],
      [
        '零或負載電流不能計算有限續航。',
        'Zero or negative load current cannot produce finite runtime.',
      ],
    ],
    ['energy-cost'],
  ),
  'capacitor-discharge': guide(
    '計算電容經放電電阻降到安全目標電壓所需時間。',
    'Calculate time for a capacitor to discharge through a resistor to a target voltage.',
    '假設理想 RC 指數放電；不替代高壓設備的安全放電與驗電程序。',
    'Assumes ideal RC exponential discharge; it does not replace safety discharge or verification procedures for high voltage.',
    worked(
      '24 V 控制電源的保持電容',
      '24 V control-supply hold-up capacitor',
      [
        input('C', 'C', '100 µF', '電容標稱值', 'Capacitor nominal value'),
        input(
          '初始電壓',
          'Initial voltage',
          '24 V',
          '斷電前量測值',
          'Pre-disconnect measurement',
        ),
        input(
          '目標電壓',
          'Target voltage',
          '5 V',
          '安全或功能門檻',
          'Safety or functional threshold',
        ),
        input(
          '放電電阻',
          'Discharge resistance',
          '10 kΩ',
          '電阻標稱值',
          'Resistor nominal value',
        ),
      ],
      ['選擇「由電阻算時間」。', '輸入 C、24 V、5 V 與 10 kΩ。'],
      [
        'Select “calculate time from resistance”.',
        'Enter C, 24 V, 5 V and 10 kΩ.',
      ],
      ['時間常數 τ = 1 s。', '放電至 5 V 約需 1.569 s；初始功率約 57.6 mW。'],
      [
        'Time constant τ = 1 s.',
        'Time to 5 V is about 1.569 s; initial power is about 57.6 mW.',
      ],
      '電阻耐壓、脈衝功率和電容容差會改變實際結果，應保留安全裕量。',
      'Resistor voltage rating, pulse power, and capacitance tolerance change real results; retain a safety margin.',
    ),
    [
      [
        '目標電壓必須介於 0 與初始電壓之間。',
        'Target voltage must be between zero and the initial voltage.',
      ],
      [
        '不可把這個理想結果當作已確認無電。',
        'Do not treat this ideal result as verification of de-energization.',
      ],
    ],
    ['rc-time'],
  ),
  'voltage-divider': guide(
    '用兩顆串聯電阻把已知輸入電壓轉成無負載輸出。',
    'Use two series resistors to derive an unloaded output voltage.',
    '輸出假設未被負載拉低；有 ADC、感測器或其他負載時要納入輸入阻抗。',
    'Output assumes no loading; include input impedance for an ADC, sensor, or other load.',
    worked(
      '24 V 轉 12 V 監測點',
      '24 V to 12 V monitor point',
      [
        input(
          'Vin',
          'Vin',
          '24 V',
          '控制電源額定值',
          'Control-supply nominal value',
        ),
        input('R1', 'R1', '10 kΩ', '上臂電阻', 'Upper resistor'),
        input('R2', 'R2', '10 kΩ', '下臂電阻', 'Lower resistor'),
      ],
      ['選擇「正算輸出」。', '輸入 Vin 24 V、R1 10 kΩ、R2 10 kΩ。'],
      ['Select “calculate output”.', 'Enter Vin 24 V, R1 10 kΩ and R2 10 kΩ.'],
      ['Vout = 12 V。', '分壓電流 1.2 mA，兩顆電阻各約 14.4 mW。'],
      [
        'Vout = 12 V.',
        'Divider current is 1.2 mA and each resistor dissipates about 14.4 mW.',
      ],
      '若後級輸入阻抗不遠大於 R2，實際 Vout 會更低。',
      'If downstream input impedance is not much larger than R2, actual Vout will be lower.',
    ),
    [
      ['R1、R2 必須為正值。', 'R1 and R2 must be positive.'],
      [
        '反算時目標 Vout 必須小於 Vin。',
        'For inverse calculation, target Vout must be below Vin.',
      ],
    ],
    ['electrical', 'current-divider'],
  ),
  electrical: guide(
    '在直流模式以任兩個 V、I、R、P 求其餘電氣量。',
    'In DC mode, solve remaining V, I, R, and P from any two.',
    '直流模式使用歐姆定律；交流模式是單相或平衡三相功率估算。',
    'DC uses Ohm’s law; AC is a single-phase or balanced three-phase power estimate.',
    worked(
      '24 V、120 Ω 負載',
      '24 V, 120 Ω load',
      [
        input(
          '已知量 1',
          'Known value 1',
          t('電壓 24 V', 'Voltage 24 V'),
          '電源量測值',
          'Supply measurement',
        ),
        input(
          '已知量 2',
          'Known value 2',
          t('電阻 120 Ω', 'Resistance 120 Ω'),
          '負載標稱值',
          'Load nominal value',
        ),
      ],
      ['選擇直流、電壓與電阻。', '輸入 24 與 120。'],
      ['Select DC, voltage, and resistance.', 'Enter 24 and 120.'],
      ['電流 = 0.2 A。', '功率 = 4.8 W。'],
      ['Current = 0.2 A.', 'Power = 4.8 W.'],
      '元件額定功率需高於理論耗散並考量溫升。',
      'Component power rating must exceed theoretical dissipation and account for temperature rise.',
    ),
    [
      [
        '不可選兩個相依量而沒有獨立資訊。',
        'Do not select two dependent values without independent information.',
      ],
      ['交流三相假設平衡負載。', 'Three-phase AC assumes a balanced load.'],
    ],
    ['voltage-divider', 'ac-power-converter'],
  ),
  '555-timer': guide(
    '以 555 的 RA、RB、C 計算無穩態頻率、週期與占空比。',
    'Calculate 555 astable frequency, period, and duty cycle from RA, RB, and C.',
    '採常見 555 理想公式；元件容差、輸出負載與二極體改良電路會改變成品。',
    'Uses common ideal 555 equations; tolerances, output load, and diode-modified circuits change hardware behavior.',
    worked(
      '約 48 Hz 閃爍器',
      'About 48 Hz flasher',
      [
        input('RA', 'RA', '10 kΩ', '設計選值', 'Design choice'),
        input('RB', 'RB', '10 kΩ', '設計選值', 'Design choice'),
        input('C', 'C', '1 µF', '設計選值', 'Design choice'),
      ],
      ['選擇無穩態與「由 R、C 計算」。', '輸入 RA、RB 各 10 kΩ、C 1 µF。'],
      [
        'Select astable and “calculate from R and C”.',
        'Enter RA and RB 10 kΩ, C 1 µF.',
      ],
      [
        '頻率約 48.09 Hz，週期約 20.79 ms。',
        '高電位約 13.86 ms、低電位約 6.93 ms、占空比約 66.67%。',
      ],
      [
        'Frequency is about 48.09 Hz and period about 20.79 ms.',
        'High is about 13.86 ms, low 6.93 ms, duty about 66.67%.',
      ],
      '標準無穩態接法無法直接得到低於 50% 的占空比。',
      'The standard astable connection cannot directly produce duty below 50%.',
    ),
    [
      ['RA、RB、C 必須為正值。', 'RA, RB, and C must be positive.'],
      [
        '先確認電容單位是 µF 而不是 F。',
        'Confirm capacitor unit is µF, not F.',
      ],
    ],
    ['rc-time', 'preferred-resistor'],
  ),
  'resistor-color': guide(
    '讀取四色環或五色環的阻值與容差。',
    'Decode four- or five-band resistor value and tolerance.',
    '適用色環軸向電阻；貼片標記請改用 SMD 電阻代碼工具。',
    'For color-banded axial resistors; use the SMD resistor tool for chip markings.',
    worked(
      '棕黑紅金四色環',
      'Brown-black-red-gold four-band',
      [
        input(
          '有效數字',
          'Significant digits',
          t('棕、黑', 'Brown, black'),
          '元件色環',
          'Component bands',
        ),
        input(
          '倍率',
          'Multiplier',
          t('紅', 'Red'),
          '元件色環',
          'Component band',
        ),
        input(
          '容差',
          'Tolerance',
          t('金', 'Gold'),
          '元件色環',
          'Component band',
        ),
      ],
      ['選擇四色環。', '依序選棕、黑、紅、金。'],
      ['Select four bands.', 'Select brown, black, red, and gold in order.'],
      ['阻值 1 kΩ，容差 ±5%。', '可接受範圍為 950 Ω 至 1.05 kΩ。'],
      [
        'Value is 1 kΩ with ±5% tolerance.',
        'Acceptable range is 950 Ω to 1.05 kΩ.',
      ],
      '讀色前先從容差環所在端判斷方向；金銀通常不作有效數字。',
      'Read from the end opposite the tolerance band; gold and silver are normally not significant digits.',
    ),
    [
      [
        '四色與五色的有效數字位數不同。',
        'Four- and five-band resistors use different significant-digit counts.',
      ],
      ['容差不是量測到的誤差。', 'Tolerance is not the measured error.'],
    ],
    ['smd-resistor'],
  ),
  'resistor-network': guide(
    '計算多顆電阻全串聯或全並聯的等效阻值。',
    'Calculate equivalent resistance for all-series or all-parallel resistors.',
    '只處理純串聯或純並聯；橋式、混聯與負載效應需另行化簡。',
    'Handles only pure series or parallel; bridge, mixed networks, and loading require separate reduction.',
    worked(
      '三顆串聯限流電阻',
      'Three series resistors',
      [
        input('R1', 'R1', '100 Ω', 'BOM', 'BOM'),
        input('R2', 'R2', '220 Ω', 'BOM', 'BOM'),
        input('R3', 'R3', '330 Ω', 'BOM', 'BOM'),
      ],
      ['選擇串聯。', '輸入 100、220、330 Ω。'],
      ['Select series.', 'Enter 100, 220, and 330 Ω.'],
      ['等效電阻 = 650 Ω。'],
      ['Equivalent resistance = 650 Ω.'],
      '串聯等效值相加；並聯等效值必小於最小支路電阻。',
      'Series values add; a parallel equivalent is below the smallest branch resistance.',
    ),
    [
      ['每一顆電阻都必須大於零。', 'Every resistor must be positive.'],
      [
        '並聯結果不代表各支路功耗相同。',
        'A parallel result does not mean branch dissipation is equal.',
      ],
    ],
    ['current-divider', 'preferred-resistor'],
  ),
  'rc-time': guide(
    '計算一階 RC 充電或放電在指定時間的電壓。',
    'Calculate first-order RC charge or discharge voltage at a specified time.',
    '適用理想階躍輸入與未載入節點；不模擬漏電、ESR 或後級負載。',
    'For ideal step input and unloaded node; it does not model leakage, ESR, or downstream load.',
    worked(
      '5 V 訊號的 RC 延遲',
      '5 V signal RC delay',
      [
        input('R', 'R', '10 kΩ', '設計選值', 'Design choice'),
        input('C', 'C', '100 µF', '設計選值', 'Design choice'),
        input('時間 t', 'Time t', '1 s', '觀察時間', 'Observation time'),
        input('輸入電壓', 'Input voltage', '5 V', '訊號電壓', 'Signal voltage'),
      ],
      ['選擇充電。', '輸入 R 10 kΩ、C 100 µF、t 1 s、5 V。'],
      ['Select charge.', 'Enter R 10 kΩ, C 100 µF, t 1 s, and 5 V.'],
      ['τ = 1 s，5τ = 5 s。', '1 s 時電壓約 3.161 V（約 63.2%）。'],
      [
        'τ = 1 s and 5τ = 5 s.',
        'At 1 s voltage is about 3.161 V (about 63.2%).',
      ],
      '5τ 是接近穩態的工程估算，不是精確等於最終值。',
      'Five time constants is an engineering approximation to steady state, not exact final value.',
    ),
    [
      [
        'R、C、t 必須為非負且 R、C 不能為零。',
        'R, C, and t must be nonnegative, and R and C cannot be zero.',
      ],
      [
        '選擇充電或放電會改變曲線方向。',
        'Charge vs discharge changes curve direction.',
      ],
    ],
    ['capacitor-discharge', 'rc-filter'],
  ),
  'capacitor-network': guide(
    '計算多顆電容全並聯或全串聯的等效容量。',
    'Calculate equivalent capacitance for all-parallel or all-series capacitors.',
    '只給理想等效容量；不計耐壓、ESR、漏電與頻率特性。',
    'Provides ideal equivalent capacitance only; it excludes voltage rating, ESR, leakage, and frequency behavior.',
    worked(
      '兩顆 100 nF 並聯去耦',
      'Two 100 nF parallel decouplers',
      [
        input('C1', 'C1', '100 nF', '元件標稱值', 'Component nominal'),
        input('C2', 'C2', '100 nF', '元件標稱值', 'Component nominal'),
      ],
      ['選擇並聯。', '兩個欄位都輸入 100 nF。'],
      ['Select parallel.', 'Enter 100 nF in both fields.'],
      ['等效電容 = 200 nF（0.2 µF）。'],
      ['Equivalent capacitance = 200 nF (0.2 µF).'],
      '串聯可提高耐壓的設計仍需均壓與額定電壓分析。',
      'A series design intended to raise voltage rating still needs balancing and voltage-rating analysis.',
    ),
    [
      [
        '串聯結果必小於最小電容。',
        'A series result is below the smallest capacitor.',
      ],
      ['不要把單位 pF、nF、µF 混用。', 'Do not mix pF, nF, and µF.'],
    ],
    ['rc-time', 'reactance'],
  ),
  'smd-capacitor': guide(
    '將常見 SMD 電容三碼或 R 小數標記換成容量。',
    'Convert common SMD capacitor three-digit or R-decimal markings to capacitance.',
    '適用可辨識的數字標記；無標記 MLCC 不能靠外觀可靠判定容量。',
    'For identifiable numeric markings; unmarked MLCCs cannot be reliably identified by appearance.',
    worked(
      '104K 陶瓷電容',
      '104K ceramic capacitor',
      [
        input(
          'SMD 電容代碼',
          'SMD capacitor code',
          '104',
          '元件印字',
          'Part marking',
        ),
        input('容差', 'Tolerance', 'K ±10%', '元件印字', 'Part marking'),
      ],
      ['選擇「代碼轉電容量」。', '輸入 104，容差選 K。'],
      ['Select “code to capacitance”.', 'Enter 104 and select K tolerance.'],
      ['容量 = 100 nF = 0.1 µF。', 'K 表示 ±10%。'],
      ['Capacitance = 100 nF = 0.1 µF.', 'K means ±10%.'],
      '標記只處理標稱容量和容差，不代表介電質、耐壓或 DC bias 特性。',
      'The marking gives nominal capacitance/tolerance, not dielectric, voltage rating, or DC-bias behavior.',
    ),
    [
      [
        '三碼最後一位是 pF 的 10 次方倍率。',
        'The final three-digit character is the power-of-ten multiplier in pF.',
      ],
      [
        '不符合格式時應回查料號或量測。',
        'For an unsupported marking, check the part number or measure it.',
      ],
    ],
    ['capacitor-network'],
  ),
  'led-resistor': guide(
    '為串聯 LED 依電源、壓降與目標電流選限流電阻。',
    'Select a current-limiting resistor for series LEDs from supply, drop, and target current.',
    '假設 LED 串聯且 Vf 固定；不取代 LED 熱特性、脈衝驅動或恆流驅動器設計。',
    'Assumes series LEDs and fixed Vf; it does not replace LED thermal, pulse-drive, or constant-current-driver design.',
    worked(
      '12 V、三顆白光 LED',
      '12 V, three white LEDs',
      [
        input(
          '電源電壓',
          'Supply voltage',
          '12 V',
          '電源標稱值',
          'Supply nominal',
        ),
        input(
          'LED 順向壓降',
          'LED forward voltage',
          '3 V',
          '資料表典型值',
          'Datasheet typical',
        ),
        input('LED 數量', 'LED count', '3', '串聯顆數', 'Series count'),
        input(
          '目標電流',
          'Target current',
          '20 mA',
          '資料表條件',
          'Datasheet condition',
        ),
      ],
      ['選擇 E24 標準阻值。', '輸入 12 V、3 V、3 顆、20 mA。'],
      ['Select E24 preferred values.', 'Enter 12 V, 3 V, 3 LEDs, and 20 mA.'],
      [
        '理論值 150 Ω，E24 選值 150 Ω。',
        '電阻功耗約 60 mW，實際電流約 20 mA。',
      ],
      [
        'Ideal value is 150 Ω; E24 selection is 150 Ω.',
        'Resistor dissipation is about 60 mW and actual current about 20 mA.',
      ],
      'LED Vf 會隨批次和溫度變動；量產或高功率設計應評估最差 Vf 與熱。',
      'LED Vf varies by lot and temperature; evaluate worst-case Vf and heat for production or high power.',
    ),
    [
      [
        '電源必須大於 LED 總 Vf，否則沒有可用限流壓降。',
        'Supply must exceed total LED Vf; otherwise no current-limiting headroom exists.',
      ],
      [
        '選阻值後仍要確認功率額定與溫升。',
        'After selecting resistance, confirm power rating and temperature rise.',
      ],
    ],
    ['preferred-resistor', 'electrical'],
  ),
  'smd-resistor': guide(
    '解讀三碼、四碼、R 小數和 EIA-96 的貼片電阻印字。',
    'Decode three/four-digit, R-decimal, and EIA-96 chip-resistor markings.',
    '僅轉換標記與標稱阻值；不判定封裝尺寸、功率、容差或溫度係數。',
    'Converts marking and nominal resistance only; it does not determine package, power, tolerance, or temperature coefficient.',
    worked(
      '472 貼片電阻',
      '472 chip resistor',
      [
        input(
          '標記格式',
          'Marking format',
          t('三位數', 'Three-digit'),
          '元件印字格式',
          'Part-marking format',
        ),
        input(
          'SMD 電阻代碼',
          'SMD resistor code',
          '472',
          '元件印字',
          'Part marking',
        ),
      ],
      ['選擇「代碼轉阻值」與三位數。', '輸入 472。'],
      ['Select “code to resistance” and three digits.', 'Enter 472.'],
      ['阻值 = 4.7 kΩ（4700 Ω）。'],
      ['Resistance = 4.7 kΩ (4700 Ω).'],
      '最後一位是十的次方倍率；「472」不是 472 Ω。',
      'The final digit is a power-of-ten multiplier; “472” is not 472 Ω.',
    ),
    [
      [
        '0 Ω、R 小數與 EIA-96 需要選對格式。',
        'Zero-ohm, R-decimal, and EIA-96 markings need the correct format.',
      ],
      [
        '無法辨識的短碼可能是廠牌料號。',
        'An unrecognized short code may be a manufacturer part code.',
      ],
    ],
    ['resistor-color', 'preferred-resistor'],
  ),
  'current-divider': guide(
    '計算並聯電阻的各支路電流、占比和理想功耗。',
    'Calculate branch current, share, and ideal dissipation for parallel resistors.',
    '所有支路假設直接並聯於同一節點；不含導線電阻或非線性負載。',
    'Assumes every branch is directly parallel at the same node; excludes wiring resistance and nonlinear loads.',
    worked(
      '12 V 三支路負載',
      '12 V three-branch load',
      [
        input(
          '電源電壓',
          'Supply voltage',
          '12 V',
          '電源量測值',
          'Supply measurement',
        ),
        input(
          'R1/R2/R3',
          'R1/R2/R3',
          '100 / 220 / 330 Ω',
          '支路電阻標稱值',
          'Branch resistor nominals',
        ),
      ],
      ['選擇電源電壓，輸入 12 V。', '輸入三個支路電阻。'],
      [
        'Select supply voltage and enter 12 V.',
        'Enter the three branch resistors.',
      ],
      [
        '等效電阻約 56.897 Ω，總電流約 0.2109 A。',
        'R1/R2/R3 支路電流為 0.12 / 0.05455 / 0.03636 A。',
      ],
      [
        'Equivalent resistance is about 56.897 Ω and total current about 0.2109 A.',
        'R1/R2/R3 currents are 0.12 / 0.05455 / 0.03636 A.',
      ],
      '各支路電流應相加回總電流；最小電阻支路承擔最大電流。',
      'Branch currents must sum to total current; the smallest resistor carries the largest current.',
    ),
    [
      [
        '不要把串聯網路輸入這個工具。',
        'Do not enter a series network in this tool.',
      ],
      [
        '功耗為理想電阻值，須另查額定值。',
        'Dissipation assumes ideal resistors; check ratings separately.',
      ],
    ],
    ['resistor-network', 'voltage-divider'],
  ),
  'shunt-resistor': guide(
    '由分流器壓降與電流計算阻值及功耗。',
    'Calculate shunt resistance and dissipation from voltage drop and current.',
    '適用直流或低頻近似；不處理 Kelvin 配線、共模範圍、放大器誤差與脈衝。',
    'For DC or low-frequency approximation; it excludes Kelvin wiring, common mode, amplifier error, and pulses.',
    worked(
      '75 mV / 100 A 分流器',
      '75 mV / 100 A shunt',
      [
        input('壓降', 'Voltage drop', '75 mV', '分流器銘牌', 'Shunt nameplate'),
        input('電流', 'Current', '100 A', '分流器銘牌', 'Shunt nameplate'),
      ],
      ['選擇「壓降與電流」。', '輸入 75 mV 和 100 A。'],
      ['Select “voltage drop and current”.', 'Enter 75 mV and 100 A.'],
      ['分流電阻 = 0.75 mΩ。', '壓降功耗 = 7.5 W。'],
      ['Shunt resistance = 0.75 mΩ.', 'Voltage-drop dissipation = 7.5 W.'],
      '7.5 W 是連續理論耗散，選型還要保留散熱、溫漂與短時過載裕量。',
      '7.5 W is continuous theoretical dissipation; selection still needs thermal, drift, and overload margin.',
    ),
    [
      ['mV 必須正確換算成 V。', 'Convert mV to V correctly.'],
      [
        '量測模式的額定壓降與額定電流要來自同一分流器。',
        'Measured mode’s rated voltage and current must belong to the same shunt.',
      ],
    ],
    ['electrical', 'current-divider'],
  ),
  'rc-filter': guide(
    '設計一階 RC 低通或高通，並查看指定頻率的增益與相位。',
    'Design a first-order RC low-pass or high-pass and inspect gain and phase at a frequency.',
    '假設訊號源阻抗低、負載阻抗高；不取代主動濾波或完整頻率響應設計。',
    'Assumes low source impedance and high load impedance; not a replacement for active-filter or full-response design.',
    worked(
      '10 kΩ、10 nF 低通',
      '10 kΩ, 10 nF low-pass',
      [
        input('R', 'R', '10 kΩ', '設計選值', 'Design choice'),
        input('C', 'C', '10 nF', '設計選值', 'Design choice'),
        input(
          '指定頻率',
          'Specified frequency',
          '1 kHz',
          '訊號頻率',
          'Signal frequency',
        ),
      ],
      ['選擇低通與「由 R、C 求截止頻率」。', '輸入 R 10 kΩ、C 10 nF、1 kHz。'],
      [
        'Select low-pass and “find cutoff from R and C”.',
        'Enter R 10 kΩ, C 10 nF, and 1 kHz.',
      ],
      [
        '截止頻率約 1591.55 Hz。',
        '1 kHz 時電壓增益約 0.8467，約 −1.45 dB，角度約 −32.14°。',
      ],
      [
        'Cutoff is about 1591.55 Hz.',
        'At 1 kHz, voltage gain is about 0.8467, about −1.45 dB, and phase about −32.14°.',
      ],
      '截止頻率處的幅度是約 −3 dB，不是零輸出。',
      'At cutoff amplitude is about −3 dB, not zero output.',
    ),
    [
      [
        '電阻與電容必須為正值。',
        'Resistance and capacitance must be positive.',
      ],
      [
        '負載會改變有效 R 與實際截止頻率。',
        'Load changes effective R and actual cutoff.',
      ],
    ],
    ['rc-time', 'reactance'],
  ),
  reactance: guide(
    '由頻率和 L 或 C 計算理想感抗或容抗。',
    'Calculate ideal inductive or capacitive reactance from frequency and L or C.',
    '僅計算純電抗大小；不含 ESR、DCR、寄生與自諧振。',
    'Calculates pure reactance magnitude only; excludes ESR, DCR, parasitics, and self-resonance.',
    worked(
      '1 kHz 的 100 nF 電容',
      '100 nF capacitor at 1 kHz',
      [
        input(
          '元件',
          'Component',
          t('電容', 'Capacitor'),
          '被測元件',
          'Measured component',
        ),
        input('頻率', 'Frequency', '1 kHz', '測試頻率', 'Test frequency'),
        input('C', 'C', '100 nF', '標稱容量', 'Nominal capacitance'),
      ],
      ['選擇電容（容抗）與「由元件值計算」。', '輸入 1 kHz、100 nF。'],
      [
        'Select capacitor/reactance and “calculate from component value”.',
        'Enter 1 kHz and 100 nF.',
      ],
      ['容抗大小約 1591.55 Ω。', '阻抗表示為 −j1591.55 Ω。'],
      [
        'Reactance magnitude is about 1591.55 Ω.',
        'Impedance notation is −j1591.55 Ω.',
      ],
      '頻率提高時容抗下降；感抗則隨頻率上升。',
      'Capacitive reactance falls as frequency rises; inductive reactance rises.',
    ),
    [
      ['頻率、L、C 都必須為正值。', 'Frequency, L, and C must be positive.'],
      [
        '高頻下需注意元件自諧振。',
        'At high frequency, account for component self-resonance.',
      ],
    ],
    ['rc-filter', 'lc-resonance'],
  ),
  'lc-resonance': guide(
    '由理想 L、C 計算諧振頻率，或由頻率反推缺少的元件值。',
    'Calculate ideal LC resonant frequency, or solve a missing component from frequency.',
    '是無損理想 LC；線圈電阻、寄生電容和負載會移動實際諧振點。',
    'It is a lossless ideal LC; coil resistance, parasitic capacitance, and loading move real resonance.',
    worked(
      '1 mH 與 1 µF',
      '1 mH and 1 µF',
      [
        input('L', 'L', '1 mH', '設計選值', 'Design choice'),
        input('C', 'C', '1 µF', '設計選值', 'Design choice'),
      ],
      ['選擇「L 與 C 求頻率」。', '輸入 1 mH 和 1 µF。'],
      ['Select “find frequency from L and C”.', 'Enter 1 mH and 1 µF.'],
      ['理想諧振頻率約 5032.92 Hz。'],
      ['Ideal resonant frequency is about 5032.92 Hz.'],
      '成品調校應以量測確認；計算值只用於初選。',
      'Confirm the finished circuit by measurement; use the calculated value for initial selection only.',
    ),
    [
      ['L、C 與頻率都必須為正值。', 'L, C, and frequency must be positive.'],
      ['不要把 Hz、kHz 與 µH、mH 混用。', 'Do not mix Hz/kHz or µH/mH.'],
    ],
    ['reactance', 'rc-filter'],
  ),
  'preferred-resistor': guide(
    '在 E 系列中找出目標阻值相鄰與最接近的標準值。',
    'Find neighbouring and nearest preferred values in an E series.',
    '協助元件選值，不會驗證功率、耐壓、溫漂或庫存。',
    'Helps select nominal values; it does not verify power, voltage rating, temperature drift, or stock.',
    worked(
      '128 Ω 目標值的 E24 選擇',
      'E24 selection for a 128 Ω target',
      [
        input(
          '標準阻值系列',
          'Preferred series',
          'E24',
          'BOM 規範',
          'BOM rule',
        ),
        input(
          '目標阻值',
          'Target resistance',
          '128 Ω',
          '計算所得理想值',
          'Calculated ideal value',
        ),
      ],
      ['選擇 E24。', '輸入目標 128 Ω。'],
      ['Select E24.', 'Enter target 128 Ω.'],
      ['相鄰值為 120 Ω 與 130 Ω。', '最接近值為 130 Ω，相對誤差約 +1.5625%。'],
      [
        'Neighbours are 120 Ω and 130 Ω.',
        'Nearest is 130 Ω with relative error about +1.5625%.',
      ],
      '最接近不一定是設計最佳：例如限流或分壓時要以結果方向決定上、下取值。',
      'Nearest is not always best: for current limiting or dividers choose up/down by the required result direction.',
    ),
    [
      [
        'E 系列和容差是不同概念。',
        'E series and tolerance are different concepts.',
      ],
      ['目標值必須大於零。', 'Target value must be positive.'],
    ],
    ['led-resistor', 'resistor-network'],
  ),
};
