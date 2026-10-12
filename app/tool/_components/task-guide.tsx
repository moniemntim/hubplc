'use client';

import { useToolLanguage } from '@/components/tool-language';
import { toolExamples } from '@/lib/tools/registry';
import { toolEnglish } from '@/lib/tools/tool-i18n';
import type { PowerIntent } from '../_calculators/power-intent';

type UnitGuideSlug = Extract<keyof typeof toolExamples, `${string}-converter`>;

type Guide = {
  scenario: string;
  formula: string;
  assumption: string;
  pitfall: string;
  next: string;
};

const powerGuides: Record<PowerIntent, Guide> = {
  'amps-to-watts': {
    scenario: '由量到的單相電流估算設備實功率。',
    formula: 'P(W) = V(V) × I(A) × PF',
    assumption: '電壓、電流與功率因數必須屬於同一負載、同一量測時段。',
    pitfall: 'PF 未知時，不能把 VA 當成 W。',
    next: '若是三相線電流，改用「安培轉千瓦」。',
  },
  'amps-to-kilowatts': {
    scenario: '由平衡三相線電流估算 kW。',
    formula: 'P(kW) = √3 × VL(V) × I(A) × PF ÷ 1000',
    assumption: '此式只適用平衡三相與線電壓。',
    pitfall: '不平衡負載要逐相量測後相加。',
    next: '結果用於估算，選線與保護仍要依設備規格。',
  },
  'amps-to-va': {
    scenario: '由單相電流取得視在功率。',
    formula: 'S(VA) = V(V) × I(A)',
    assumption: '輸入為 RMS 電壓與 RMS 電流。',
    pitfall: 'VA 不是耗電量，也不是實功率。',
    next: '需要實功率時再輸入已確認的 PF。',
  },
  'amps-to-kva': {
    scenario: '由三相線電流估算變壓器或 UPS 的視在容量。',
    formula: 'S(kVA) = √3 × VL(V) × I(A) ÷ 1000',
    assumption: '使用線電壓與平衡三相線電流。',
    pitfall: '不要以單相公式直接乘三。',
    next: '容量選型還要比較啟動電流與設備降額。',
  },
  'watts-to-amps': {
    scenario: '由單相實功率估算工作電流。',
    formula: 'I(A) = P(W) ÷ [V(V) × PF]',
    assumption: '供電方式為單相且 PF 已知。',
    pitfall: 'PF 設為 1 會低估感性負載；穩態 W 也不能預測馬達啟動電流。',
    next: '用量測值核對，再決定保護器件。',
  },
  'kw-to-amps': {
    scenario: '由三相設備額定或運轉 kW 估算線電流。',
    formula: 'I(A) = P(kW) × 1000 ÷ [√3 × VL(V) × PF]',
    assumption: '輸入是三相總實功率與線電壓。',
    pitfall: '不可把相電壓填入線電壓欄。',
    next: '需要視在容量時開啟「千瓦轉 kVA」。',
  },
  'kva-to-amps': {
    scenario: '由三相視在容量估算線電流。',
    formula: 'I(A) = S(kVA) × 1000 ÷ [√3 × VL(V)]',
    assumption: 'kVA 是三相總容量。',
    pitfall: '這個換算不需要 PF；加入 PF 反而改變問題。',
    next: '檢查設備銘牌的連接方式與額定電壓。',
  },
  'mva-to-amps': {
    scenario: '由大型三相系統的 MVA 估算線電流。',
    formula: 'I(A) = S(MVA) × 1,000,000 ÷ [√3 × VL(V)]',
    assumption: '電壓單位要與欄位一致，通常是線電壓。',
    pitfall: 'kV 與 V 混用會造成千倍誤差。',
    next: '確認 CT 比與保護設定由合格工程程序處理。',
  },
  'watts-to-volts': {
    scenario: '由單相功率與電流反推所需電壓。',
    formula: 'V(V) = P(W) ÷ [I(A) × PF]',
    assumption: '電流是同一負載在目標運轉點的數值。',
    pitfall: '此結果不能取代供電規格或耐壓判定。',
    next: '已知實際電壓時，改用「瓦特轉安培」。',
  },
  'kw-to-volts': {
    scenario: '由三相 kW 與線電流反推線電壓。',
    formula: 'VL(V) = P(kW) × 1000 ÷ [√3 × I(A) × PF]',
    assumption: '系統為平衡三相。',
    pitfall: '量到單相支路時不應套用三相總功率。',
    next: '回看配電圖確認線電壓與接法。',
  },
  'va-to-watts': {
    scenario: '由 VA 與 PF 取得實功率。',
    formula: 'P(W) = S(VA) × PF',
    assumption: 'PF 介於 0 與 1，且是同一時段。',
    pitfall: '不同負載的 PF 不能任意平均。',
    next: '若要看電流，再以 VA 與電壓換算。',
  },
  'kva-to-kw': {
    scenario: '由設備視在容量估算實功率。',
    formula: 'P(kW) = S(kVA) × PF',
    assumption: 'kVA 為總視在功率。',
    pitfall: '額定 kVA 不代表設備此刻的 kW。',
    next: '用實測負載與 PF 做運轉核對。',
  },
  'watts-to-va': {
    scenario: '由實功率回推所需視在容量。',
    formula: 'S(VA) = P(W) ÷ PF',
    assumption: 'PF 不可為 0。',
    pitfall: '效率與 PF 不同；只用 W 選 UPS 可能低估容量。',
    next: '將結果與 UPS 的 VA/W 雙額定一起比較。',
  },
  'kw-to-kva': {
    scenario: '由 kW 與 PF 估算視在容量。',
    formula: 'S(kVA) = P(kW) ÷ PF',
    assumption: 'kW 是同一組負載的總實功率。',
    pitfall: 'PF 越低，所需 kVA 越高。',
    next: '與變壓器、發電機或 UPS 容量交叉核對。',
  },
  'va-to-kva': {
    scenario: '將 VA 用較易讀的 kVA 顯示。',
    formula: 'kVA = VA ÷ 1000',
    assumption: '這是純單位換算。',
    pitfall: 'VA、kVA、MVA 相差千倍；單位換算不會得出 W 或電流。',
    next: '保留原始銘牌單位；需要實功率時再提供 PF。',
  },
  'kwh-to-kw': {
    scenario: '由累積電量與時間同時反推平均 W 與 kW。',
    formula: 'P(W) = E(kWh) × 1000 ÷ t(h)；P(kW) = E(kWh) ÷ t(h)',
    assumption: '時間範圍與電表累積範圍完全一致。',
    pitfall: '結果是平均值，不會顯示尖峰負載。',
    next: '尖峰問題要用需量或逐時資料判讀。',
  },
  'energy-consumption': {
    scenario: '以 W、kW 或 MW 與使用時間估算 kWh 用電量。',
    formula: 'E(kWh) = P(kW) × t(h)；W 先÷1000',
    assumption: '運轉排程可用平均值描述。',
    pitfall: '待機與啟動耗電未自動納入。',
    next: '用電表期間讀值驗證估算。',
  },
  'electricity-cost': {
    scenario: '以估算用電量和自訂費率比較成本。',
    formula: 'cost(currency) = E(kWh) × rate(currency/kWh)',
    assumption: '費率由使用者提供，且與計費期間相符。',
    pitfall: '本工具不套用電力公司的分段、需量或稅費規則。',
    next: '正式帳單仍應以供電方計費規則核對。',
  },
};

const unitGuides: Record<string, Guide> = {
  length: {
    scenario: '核對圖面、感測器或機械尺寸的單位。',
    formula: '以固定長度定義換算。',
    assumption: '量測基準點與單位定義相同。',
    pitfall: '英吋與英尺不可混填。',
    next: '保留原始圖面單位與換算值。',
  },
  temperature: {
    scenario: '在感測器、HMI 與規格間轉換溫標。',
    formula: '溫標換算包含比例與零點偏移。',
    assumption: '輸入為溫度值，不是溫差。',
    pitfall: '攝氏與華氏的溫差換算沒有相同零點偏移。',
    next: '低於絕對零的輸入會被拒絕。',
  },
  mass: {
    scenario: '核對物料或銘牌的質量單位。',
    formula: '以公斤作為換算基準。',
    assumption: '這裡的重量指質量，不是力。',
    pitfall: 'kgf 與 kg 不是同一物理量。',
    next: '需要力時改用設備指定的力單位。',
  },
  area: {
    scenario: '換算板材、土地或接觸面積。',
    formula: '長度換算係數需平方。',
    assumption: '面積是平面投影或規格定義的面積。',
    pitfall: '不可直接使用長度倍率。',
    next: '不規則面積需先取得量測方法。',
  },
  volume: {
    scenario: '核對容器、配方或流體容量。',
    formula: '以公升作為換算基準。',
    assumption: '美制與英制 gallon 是不同單位。',
    pitfall: '不要只寫 gallon 而未指明制別。',
    next: '流量問題請使用流量單位。',
  },
  pressure: {
    scenario: '比對壓力表、傳送器與規格的讀值。',
    formula: '以 Pa 作為換算基準。',
    assumption: '所有值使用同一壓力參考基準。',
    pitfall: '表壓與絕壓不能只靠單位換算互換。',
    next: '先確認儀表標示 gauge 或 absolute。',
  },
  power: {
    scenario: '比較設備功率與馬力規格。',
    formula: '以 W 作為換算基準。',
    assumption: '輸入是功率，非能量。',
    pitfall: '機械 hp 與公制 PS 定義不同。',
    next: '需電流時補上電壓、相數與 PF。',
  },
  time: {
    scenario: '統一 PLC、報表與維護記錄的時間單位。',
    formula: '以秒作為換算基準。',
    assumption: '一天固定以 24 小時計。',
    pitfall: '這不是時區或夏令時間換算。',
    next: '日曆問題改用日期計算器。',
  },
  angle: {
    scenario: '換算轉台、編碼器或三角函數角度。',
    formula: '360° = 2π rad = 1 turn。',
    assumption: '輸入為幾何角度。',
    pitfall: '角分與時間分鐘不同。',
    next: '控制器需確認採用 degree 或 radian。',
  },
  capacitance: {
    scenario: '核對電容標示與電路計算的容量。',
    formula: '以 F 作為換算基準。',
    assumption: '只換算電容量。',
    pitfall: 'µF、nF、pF 每級相差一千倍。',
    next: '元件容差要依實物標示判讀。',
  },
  speed: {
    scenario: '換算線速度、車速或氣流速度。',
    formula: '以 m/s 作為換算基準。',
    assumption: '速度方向與參考系一致。',
    pitfall: 'Mach 採固定 343 m/s 參考音速。',
    next: '精確 Mach 要依介質與溫度重新計算。',
  },
  storage: {
    scenario: '核對檔案、記憶體或儲存設備容量。',
    formula: '以 byte 作為換算基準。',
    assumption: 'B 是 byte，b 是 bit。',
    pitfall: 'GB 採 1000，GiB 採 1024。',
    next: '採購或備份容量保留原廠單位。',
  },
};

function englishPowerGuide(intent: PowerIntent, formula: string): Guide {
  if (intent === 'amps-to-watts')
    return {
      scenario: 'Estimate single-phase real power from voltage and current.',
      formula,
      assumption: 'Use RMS readings from the same load and interval.',
      pitfall: 'VA is not W when PF is unknown.',
      next: 'Compare the estimate with a suitable meter.',
    };
  if (['amps-to-kilowatts', 'kw-to-amps', 'kw-to-volts'].includes(intent))
    return {
      scenario: 'Calculate a balanced three-phase line quantity.',
      formula,
      assumption: 'Use line-to-line voltage for a balanced load.',
      pitfall: 'Do not enter phase voltage in a line-voltage formula.',
      next: 'For imbalance, measure each phase and total the results.',
    };
  if (
    ['amps-to-va', 'amps-to-kva', 'kva-to-amps', 'mva-to-amps'].includes(intent)
  )
    return {
      scenario:
        'Convert current or capacity into apparent power or line current.',
      formula,
      assumption: 'Use the equipment voltage and total capacity on one basis.',
      pitfall: 'Apparent power does not state energy use or real power.',
      next: 'Confirm voltage and connection against the nameplate.',
    };
  if (['watts-to-amps', 'watts-to-volts'].includes(intent))
    return {
      scenario: 'Back-calculate a single-phase operating quantity.',
      formula,
      assumption:
        'Power, voltage, current and PF describe one operating point.',
      pitfall: 'Steady-state power cannot predict motor starting current.',
      next: 'Verify before selecting a protective device.',
    };
  if (['va-to-watts', 'kva-to-kw', 'watts-to-va', 'kw-to-kva'].includes(intent))
    return {
      scenario: 'Translate real and apparent power using a confirmed PF.',
      formula,
      assumption: 'PF is between 0 and 1 for this load.',
      pitfall: 'Efficiency and PF are different quantities.',
      next: 'Compare both VA and W ratings of the supply equipment.',
    };
  if (intent === 'va-to-kva')
    return {
      scenario: 'Change the displayed apparent-power unit.',
      formula,
      assumption: 'This is a unit conversion only.',
      pitfall: 'It does not calculate real power or current.',
      next: 'Keep the original nameplate unit in the record.',
    };
  if (intent === 'energy-consumption')
    return {
      scenario: 'Estimate energy from average power and operating time.',
      formula,
      assumption: 'Power represents the stated interval.',
      pitfall: 'kW is power; kWh is accumulated energy.',
      next: 'For varying loads, total interval measurements.',
    };
  if (intent === 'kwh-to-kw')
    return {
      scenario:
        'Calculate average power from energy and its matching interval.',
      formula,
      assumption: 'Energy and duration use exactly the same time range.',
      pitfall: 'The result does not show peak demand.',
      next: 'Use interval data when peak load matters.',
    };
  return {
    scenario: 'Estimate cost from entered energy and rate.',
    formula,
    assumption: 'The rate applies to the same billing period.',
    pitfall: 'Tiered, demand and tax rules are not included.',
    next: 'Check a formal bill against the current tariff.',
  };
}

const englishUnitDetails: Record<string, [string, string, string]> = {
  length: [
    'Compare drawing, sensor or machinery dimensions.',
    'Do not mix inches and feet.',
    'Keep the drawing unit with the converted value.',
  ],
  temperature: [
    'Translate sensor, HMI and specification temperature scales.',
    'Temperature differences do not use the same offsets.',
    'Inputs below absolute zero are rejected.',
  ],
  mass: [
    'Compare material or nameplate mass units.',
    'kgf and kg are different quantities.',
    'Use a force unit for force calculations.',
  ],
  area: [
    'Convert sheet, land or contact area.',
    'A linear multiplier cannot be used directly.',
    'Define a method for irregular shapes.',
  ],
  volume: [
    'Compare container, recipe or fluid volume.',
    'US and imperial gallons differ.',
    'Use flow units for rate questions.',
  ],
  pressure: [
    'Compare gauge, transmitter and specification readings.',
    'Gauge and absolute pressure cannot be interchanged by unit conversion.',
    'Confirm the pressure reference first.',
  ],
  power: [
    'Compare equipment power and horsepower ratings.',
    'Mechanical hp and metric PS differ.',
    'Add voltage, phase and PF to calculate current.',
  ],
  time: [
    'Use one time unit in PLC, report and maintenance records.',
    'This does not convert time zones or daylight saving.',
    'Use the date calculator for calendar questions.',
  ],
  angle: [
    'Convert turntable, encoder or trigonometric angles.',
    'Arcminutes are not time minutes.',
    'Confirm whether the controller expects degrees or radians.',
  ],
  capacitance: [
    'Compare capacitor markings and circuit values.',
    'µF, nF and pF differ by factors of 1,000.',
    'Read tolerance from the actual marking.',
  ],
  speed: [
    'Convert line, vehicle or airflow speed.',
    'Mach uses a fixed 343 m/s reference here.',
    'Recalculate Mach for the actual medium and temperature.',
  ],
  storage: [
    'Compare file, memory and storage capacity.',
    'GB is decimal; GiB is binary.',
    'Keep the vendor unit for purchasing or backup plans.',
  ],
};

const englishUnitFormulas: Record<string, string> = {
  length: 'Uses fixed length definitions.',
  temperature: 'Converts both scale ratio and zero offset.',
  mass: 'Uses kilograms as the reference unit.',
  area: 'Squares the applicable length conversion factor.',
  volume: 'Uses litres as the reference unit.',
  pressure: 'Uses pascals as the reference unit.',
  power: 'Uses watts as the reference unit.',
  time: 'Uses seconds as the reference unit.',
  angle: 'Uses 360° = 2π rad = 1 turn.',
  capacitance: 'Uses farads as the reference unit.',
  speed: 'Uses metres per second as the reference unit.',
  storage: 'Uses bytes as the reference unit.',
};

function englishUnitGuide(group: string): Guide {
  const [scenario, pitfall, next] = englishUnitDetails[group];
  const formula = englishUnitFormulas[group];
  return {
    scenario,
    formula,
    assumption:
      'Use a value and unit that describe the same physical quantity.',
    pitfall,
    next,
  };
}

function GuideBody({
  guide,
  example,
  locale,
}: {
  guide: Guide;
  example: string;
  locale: 'zh-Hant' | 'en';
}) {
  const labels =
    locale === 'en'
      ? [
          'Use case',
          'This calculation',
          'Check before input',
          'Common mistake',
          'Next action',
          'Worked default',
        ]
      : [
          '適用情境',
          '本頁計算',
          '輸入前確認',
          '常見誤判',
          '完成後',
          '預設範例',
        ];
  return (
    <dl>
      <div>
        <dt>{labels[0]}</dt>
        <dd>{guide.scenario}</dd>
      </div>
      <div>
        <dt>{labels[1]}</dt>
        <dd>{guide.formula}</dd>
      </div>
      <div>
        <dt>{labels[2]}</dt>
        <dd>{guide.assumption}</dd>
      </div>
      <div>
        <dt>{labels[3]}</dt>
        <dd>{guide.pitfall}</dd>
      </div>
      <div>
        <dt>{labels[4]}</dt>
        <dd>{guide.next}</dd>
      </div>
      <div>
        <dt>{labels[5]}</dt>
        <dd>{example}</dd>
      </div>
    </dl>
  );
}

export function PowerIntentGuide({ intent }: { intent: PowerIntent }) {
  const { locale } = useToolLanguage();
  const guide = powerGuides[intent];
  const displayed =
    locale === 'en' ? englishPowerGuide(intent, guide.formula) : guide;
  return (
    <section
      className="task-guide"
      data-testid="task-guide"
      aria-labelledby="task-guide-title"
    >
      <p className="eyebrow">{locale === 'en' ? 'TASK GUIDE' : '任務指引'}</p>
      <h2 id="task-guide-title">
        {locale === 'en'
          ? 'Check the input before using the result'
          : '先確認輸入，再使用結果'}
      </h2>
      <GuideBody
        guide={displayed}
        example={
          locale === 'en' ? toolEnglish[intent].example : toolExamples[intent]
        }
        locale={locale}
      />
    </section>
  );
}

export function UnitConversionGuide({ group }: { group: string }) {
  const { locale } = useToolLanguage();
  const guide = unitGuides[group];
  const slug = `${group}-converter` as UnitGuideSlug;
  if (!guide) return null;
  return (
    <section
      className="task-guide"
      data-testid="task-guide"
      aria-labelledby="task-guide-title"
    >
      <p className="eyebrow">{locale === 'en' ? 'TASK GUIDE' : '任務指引'}</p>
      <h2 id="task-guide-title">
        {locale === 'en'
          ? 'Use the unit definition that matches the source'
          : '以來源定義相符的單位換算'}
      </h2>
      <GuideBody
        guide={locale === 'en' ? englishUnitGuide(group) : guide}
        example={
          locale === 'en' ? toolEnglish[slug].example : toolExamples[slug]
        }
        locale={locale}
      />
    </section>
  );
}
