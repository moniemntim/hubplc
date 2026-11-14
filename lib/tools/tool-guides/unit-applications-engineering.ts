import type { ToolSlug } from '../registry.ts';
import type { GuideText, ToolGuideData } from './types.ts';

const text = (zh: string, en: string): GuideText => ({ zh, en });
const input = (
  labelZh: string,
  labelEn: string,
  value: string | GuideText,
  sourceZh: string,
  sourceEn: string,
) => ({
  label: text(labelZh, labelEn),
  value,
  source: text(sourceZh, sourceEn),
});
const nistSi = {
  label: text('NIST：SI 單位', 'NIST: SI units'),
  url: 'https://www.nist.gov/pml/owm/metric-si/si-units',
};

export const engineeringApplicationGuides: Partial<
  Record<ToolSlug, ToolGuideData>
> = {
  'length-converter': {
    task: text(
      '將圖面標稱尺寸與對稱公差換成可用於英制溝通的尺寸上下限。',
      'Convert a drawing nominal dimension and symmetric tolerance into inch limits for communication.',
    ),
    scope: text(
      '採用 1 in = 25.4 mm；輸出不是量測判定，也不處理幾何公差。',
      'Uses 1 in = 25.4 mm; output is not an inspection decision and does not handle GD&T.',
    ),
    cases: [
      {
        title: text(
          '100 ± 0.1 mm 的英吋上下限',
          'Inch limits for 100 ± 0.1 mm',
        ),
        inputs: [
          input(
            '圖面標稱尺寸（mm）',
            'Drawing nominal dimension (mm)',
            '100',
            '圖面尺寸',
            'Drawing dimension',
          ),
          input(
            '對稱公差（± mm）',
            'Symmetric tolerance (± mm)',
            '0.1',
            '圖面公差',
            'Drawing tolerance',
          ),
        ],
        steps: [
          text(
            '在「圖面標稱尺寸（mm）」輸入 100。',
            'Enter 100 in “Drawing nominal dimension (mm)”.',
          ),
          text(
            '在「對稱公差（± mm）」輸入 0.1，讀取應用計算結果。',
            'Enter 0.1 in “Symmetric tolerance (± mm)” and read Application results.',
          ),
        ],
        expected: [
          text(
            '標稱尺寸為 3.93700787402 in；下限約 3.93307086614 in；上限約 3.94094488189 in。',
            'Nominal is 3.93700787402 in; lower limit is about 3.93307086614 in; upper limit is about 3.94094488189 in.',
          ),
        ],
        interpretation: text(
          '對稱公差輸出為 ±0.00393700787402 in，適合在明確說明公制原始圖面的前提下做換算溝通。',
          'The symmetric tolerance is ±0.00393700787402 in, suitable for communication when the original metric drawing is clearly identified.',
        ),
      },
      {
        title: text(
          '公差達到標稱尺寸時停止計算',
          'Stop when tolerance reaches the nominal size',
        ),
        inputs: [
          input(
            '圖面標稱尺寸（mm）',
            'Drawing nominal dimension (mm)',
            '0.1',
            '測試邊界值',
            'Boundary test value',
          ),
          input(
            '對稱公差（± mm）',
            'Symmetric tolerance (± mm)',
            '0.1',
            '測試邊界值',
            'Boundary test value',
          ),
        ],
        steps: [
          text(
            '輸入標稱 0.1 與對稱公差 0.1。',
            'Enter nominal 0.1 and symmetric tolerance 0.1.',
          ),
          text(
            '確認應用計算結果顯示公差必須小於標稱尺寸的錯誤。',
            'Confirm Application results shows the error that tolerance must be smaller than nominal.',
          ),
        ],
        expected: [
          text(
            '不顯示英吋結果，避免把 0 或負的下限尺寸當作有效圖面尺寸。',
            'No inch results are shown, preventing a zero or negative lower limit from being treated as a valid drawing size.',
          ),
        ],
        interpretation: text(
          '先回查圖面是單向公差、上下限尺寸或輸入單位錯誤，再重填。',
          'Check whether the drawing uses unilateral tolerance, limit dimensions, or a wrong input unit before retrying.',
        ),
      },
    ],
    pitfalls: [
      text(
        '不要把量測讀值直接當成標稱尺寸；輸入的是圖面指定值。',
        'Do not enter a measurement reading as the nominal dimension; enter the drawing value.',
      ),
    ],
    sources: [nistSi],
  },
  'temperature-converter': {
    task: text(
      '比較製程起訖溫度的絕對溫度與真正溫差。',
      'Compare absolute temperatures and the true delta across a process range.',
    ),
    scope: text(
      '可處理升溫或降溫；溫差的 °F 不加 32。',
      'Handles heating or cooling; a Fahrenheit delta does not add 32.',
    ),
    cases: [
      {
        title: text('25 °C 升至 85 °C', 'Heat from 25 °C to 85 °C'),
        inputs: [
          input(
            '起始溫度（°C）',
            'Start temperature (°C)',
            '25',
            '製程設定',
            'Process setting',
          ),
          input(
            '結束溫度（°C）',
            'End temperature (°C)',
            '85',
            '製程設定',
            'Process setting',
          ),
        ],
        steps: [
          text(
            '在「起始溫度（°C）」輸入 25。',
            'Enter 25 in “Start temperature (°C)”.',
          ),
          text(
            '在「結束溫度（°C）」輸入 85，讀取應用計算結果。',
            'Enter 85 in “End temperature (°C)” and read Application results.',
          ),
        ],
        expected: [
          text(
            '起始為 298.15 K／77 °F，結束為 358.15 K／185 °F；溫差為 60 K 與 108 °F。',
            'Start is 298.15 K / 77 °F, end is 358.15 K / 185 °F; delta is 60 K and 108 °F.',
          ),
        ],
        interpretation: text(
          '108 °F 是溫差，不是把 60 °C 轉成絕對華氏溫度後的 140 °F。',
          '108 °F is a temperature difference, not 140 °F from converting 60 °C as an absolute temperature.',
        ),
      },
      {
        title: text(
          '低於絕對零度的輸入被拒絕',
          'Reject input below absolute zero',
        ),
        inputs: [
          input(
            '起始溫度（°C）',
            'Start temperature (°C)',
            '-274',
            '邊界測試',
            'Boundary test',
          ),
          input(
            '結束溫度（°C）',
            'End temperature (°C)',
            '20',
            '對照值',
            'Comparison value',
          ),
        ],
        steps: [
          text(
            '在「起始溫度（°C）」輸入 -274。',
            'Enter -274 in “Start temperature (°C)”.',
          ),
          text(
            '在「結束溫度（°C）」輸入 20，再讀取應用計算結果。',
            'Enter 20 in “End temperature (°C)”, then read Application results.',
          ),
          text(
            '確認應用計算結果顯示不可低於 −273.15 °C 的錯誤。',
            'Confirm Application results shows the error that temperature cannot be below −273.15 °C.',
          ),
        ],
        expected: [
          text('不顯示 K 或 °F 結果。', 'No K or °F results are shown.'),
        ],
        interpretation: text(
          '請先確認感測器資料是否是攝氏、是否缺少負號，或是否為不適合直接換算的訊號值。',
          'Confirm whether sensor data is Celsius, has a missing sign, or is a signal value unsuitable for direct conversion.',
        ),
      },
    ],
    pitfalls: [
      text(
        '將兩個 °F 絕對值相減時才會得到 °F 溫差；不要在溫差公式額外加 32。',
        'Subtract the two absolute °F values to obtain a °F delta; do not add 32 in a delta formula.',
      ),
    ],
    sources: [
      {
        label: text('NIST：溫度單位', 'NIST: temperature units'),
        url: 'https://www.nist.gov/pml/owm/si-units-temperature',
      },
    ],
  },
  'pressure-converter': {
    task: text(
      '以明示的大氣壓參考值在表壓與絕對壓間換算。',
      'Convert between gauge and absolute pressure with an explicit atmospheric reference.',
    ),
    scope: text(
      '預設 101.325 kPa 僅為範例，不是現場或即時氣象讀值。',
      'The default 101.325 kPa is only an example, not a site or live-weather reading.',
    ),
    cases: [
      {
        title: text(
          '250 kPa 表壓換絕對壓',
          'Convert 250 kPa gauge to absolute',
        ),
        inputs: [
          input(
            '輸入壓力基準',
            'Input pressure reference',
            text(
              '表壓（相對當地大氣）',
              'Gauge (relative to local atmosphere)',
            ),
            '儀表標示',
            'Gauge marking',
          ),
          input(
            '輸入壓力（kPa）',
            'Input pressure (kPa)',
            '250',
            '壓力儀表',
            'Pressure gauge',
          ),
          input(
            '當地大氣壓範例值（kPa）',
            'Example local atmospheric pressure (kPa)',
            '101.325',
            '此案例的指定參考值',
            'Specified reference for this case',
          ),
        ],
        steps: [
          text(
            '在「輸入壓力基準」選擇「表壓（相對當地大氣）」。',
            'Choose “Gauge (relative to local atmosphere)” for “Input pressure reference”.',
          ),
          text(
            '輸入 250 與 101.325，讀取應用計算結果。',
            'Enter 250 and 101.325, then read Application results.',
          ),
        ],
        expected: [
          text(
            '絕對壓為 351.325 kPa（3.51325 bar）；表壓為 250 kPa（2.5 bar）。',
            'Absolute pressure is 351.325 kPa (3.51325 bar); gauge pressure is 250 kPa (2.5 bar).',
          ),
        ],
        interpretation: text(
          '若現場基準不同，絕對壓會改變；記錄時需同時保留壓力基準與大氣壓來源。',
          'If the site reference differs, absolute pressure changes; record both the pressure reference and atmospheric-pressure source.',
        ),
      },
      {
        title: text(
          '允許低於大氣壓但不可低於真空',
          'Allow below atmosphere but not below vacuum',
        ),
        inputs: [
          input(
            '輸入壓力基準',
            'Input pressure reference',
            text('絕對壓（相對真空）', 'Absolute (relative to vacuum)'),
            '真空系統規格',
            'Vacuum-system specification',
          ),
          input(
            '輸入壓力（kPa）',
            'Input pressure (kPa)',
            '90',
            '真空系統規格',
            'Vacuum-system specification',
          ),
          input(
            '當地大氣壓範例值（kPa）',
            'Example local atmospheric pressure (kPa)',
            '101.325',
            '此案例的指定參考值',
            'Specified reference for this case',
          ),
        ],
        steps: [
          text(
            '選擇「絕對壓（相對真空）」並輸入 90 與 101.325。',
            'Choose “Absolute (relative to vacuum)” and enter 90 and 101.325.',
          ),
          text(
            '確認表壓為負值；再把「輸入壓力（kPa）」改為 -1。',
            'Confirm gauge pressure is negative, then change “Input pressure (kPa)” to -1.',
          ),
          text(
            '確認負絕對壓時應用計算結果顯示錯誤。',
            'Confirm Application results shows an error for negative absolute pressure.',
          ),
        ],
        expected: [
          text(
            '90 kPa 絕對壓對應 -11.325 kPa 表壓；-1 kPa 絕對壓不會產生結果。',
            '90 kPa absolute corresponds to -11.325 kPa gauge; −1 kPa absolute produces no result.',
          ),
        ],
        interpretation: text(
          '負表壓是可能的；負絕對壓不是。',
          'Negative gauge pressure is possible; negative absolute pressure is not.',
        ),
      },
    ],
    pitfalls: [
      text(
        '不要把 bar 與 kPa 混用：1 bar = 100 kPa。',
        'Do not mix bar and kPa: 1 bar = 100 kPa.',
      ),
    ],
    sources: [
      {
        label: text('NIST：壓力單位', 'NIST: pressure units'),
        url: 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9',
      },
    ],
  },
  'angle-converter': {
    task: text(
      '將目標機械角度換成控制器可用的整數編碼器計數。',
      'Convert a target mechanical angle into an integer encoder count usable by a controller.',
    ),
    scope: text(
      '假設理想等分計數；不含原點、方向、齒隙或控制器濾波。',
      'Assumes ideal equal count spacing; excludes home, direction, backlash, and controller filtering.',
    ),
    cases: [
      {
        title: text(
          '1000 PPR 的 ×4 計數轉 90°',
          '90° with 1000 PPR ×4 counting',
        ),
        inputs: [
          input(
            '編碼器每轉脈波數（PPR）',
            'Encoder pulses per revolution (PPR)',
            '1000',
            '編碼器規格書',
            'Encoder datasheet',
          ),
          input(
            '計數倍率',
            'Counting multiplier',
            text('×4 計數', '×4 counting'),
            '控制器計數設定',
            'Controller count setting',
          ),
          input(
            '目標角度（°）',
            'Target angle (°)',
            '90',
            '定位需求',
            'Positioning requirement',
          ),
        ],
        steps: [
          text(
            '輸入 1000，並在「計數倍率」選擇「×4 計數」。',
            'Enter 1000 and choose “×4 counting” for “Counting multiplier”.',
          ),
          text(
            '在「目標角度（°）」輸入 90，讀取應用計算結果。',
            'Enter 90 in “Target angle (°)” and read Application results.',
          ),
        ],
        expected: [
          text(
            '有效每轉計數為 4000，理想與最近整數計數皆為 1000，實際角度 90°、誤差 0°。',
            'Effective counts per revolution is 4000; exact and nearest counts are both 1000, with 90° realized and 0° error.',
          ),
        ],
        interpretation: text(
          '此案例剛好整除；仍須確認實機的計數模式與原點定義。',
          'This case divides exactly; still verify the actual controller counting mode and home definition.',
        ),
      },
      {
        title: text(
          '非整數計數時讀取量化誤差',
          'Read quantization error for a non-integer count',
        ),
        inputs: [
          input(
            '編碼器每轉脈波數（PPR）',
            'Encoder pulses per revolution (PPR)',
            '1024',
            '編碼器規格書',
            'Encoder datasheet',
          ),
          input(
            '計數倍率',
            'Counting multiplier',
            text('×4 計數', '×4 counting'),
            '控制器計數設定',
            'Controller count setting',
          ),
          input(
            '目標角度（°）',
            'Target angle (°)',
            '1',
            '定位需求',
            'Positioning requirement',
          ),
        ],
        steps: [
          text(
            '輸入 1024，選擇「×4 計數」，並輸入目標 1°。',
            'Enter 1024, choose “×4 counting”, and enter target 1°.',
          ),
          text(
            '比較「理想計數」、「最近整數計數」與「量化誤差」。',
            'Compare “Exact count”, “Nearest integer count”, and “Quantization error”.',
          ),
        ],
        expected: [
          text(
            '理想計數約 11.3777777778，最近整數為 11，實際角度約 0.966796875°，誤差約 -0.033203125°。',
            'Exact count is about 11.3777777778, nearest integer is 11, realized angle is about 0.966796875°, and error is about −0.033203125°.',
          ),
        ],
        interpretation: text(
          '誤差來自整數計數量化，不代表機械精度或回授誤差。',
          'The error comes from integer-count quantization; it does not represent mechanical accuracy or feedback error.',
        ),
      },
    ],
    pitfalls: [
      text(
        'PPR 必須是正整數，倍率只可選 ×1、×2 或 ×4。',
        'PPR must be a positive integer, and the multiplier may only be ×1, ×2, or ×4.',
      ),
    ],
    sources: [
      {
        label: text('NIST：平面角單位', 'NIST: plane angle units'),
        url: 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9',
      },
    ],
  },
  'speed-converter': {
    task: text(
      '在穩態恆速條件下估算皮帶行程、節距時間與理論通過率。',
      'Estimate belt travel, pitch timing, and theoretical throughput at steady constant speed.',
    ),
    scope: text(
      '每個產品假設占一個節距；不含加減速、滑移、空隙或停機。',
      'Each product is assumed to occupy one pitch; acceleration, slip, gaps, and downtime are excluded.',
    ),
    cases: [
      {
        title: text(
          '30 m/min、50 mm 節距的理論節拍',
          'Theoretical cadence at 30 m/min and 50 mm pitch',
        ),
        inputs: [
          input(
            '皮帶行程距離（mm）',
            'Belt travel distance (mm)',
            '1000',
            '輸送距離',
            'Conveyor distance',
          ),
          input(
            '皮帶速度（m/min）',
            'Belt speed (m/min)',
            '30',
            '驅動器設定',
            'Drive setting',
          ),
          input(
            '產品節距（mm）',
            'Product pitch (mm)',
            '50',
            '治具或產品間距',
            'Fixture or product spacing',
          ),
        ],
        steps: [
          text('依序輸入 1000、30、50。', 'Enter 1000, 30, and 50 in order.'),
          text(
            '讀取應用計算結果中的行程時間、節距間隔與理論通過率。',
            'Read travel time, pitch interval, and theoretical throughput in Application results.',
          ),
        ],
        expected: [
          text(
            '行程時間為 2 s，每節距間隔為 0.1 s，理論通過率為 600 parts/min。',
            'Travel time is 2 s, interval per pitch is 0.1 s, and theoretical throughput is 600 parts/min.',
          ),
        ],
        interpretation: text(
          '600 parts/min 是純運動學上限；實際產能仍須扣除停機與製程限制。',
          '600 parts/min is a kinematic upper bound; actual capacity still needs downtime and process constraints deducted.',
        ),
      },
      {
        title: text(
          '不整除行程顯示節距數而非整件數',
          'Show pitch count, not whole parts, for a non-divisible travel',
        ),
        inputs: [
          input(
            '皮帶行程距離（mm）',
            'Belt travel distance (mm)',
            '125',
            '短距離確認',
            'Short-distance check',
          ),
          input(
            '皮帶速度（m/min）',
            'Belt speed (m/min)',
            '30',
            '驅動器設定',
            'Drive setting',
          ),
          input(
            '產品節距（mm）',
            'Product pitch (mm)',
            '50',
            '治具或產品間距',
            'Fixture or product spacing',
          ),
        ],
        steps: [
          text(
            '在「皮帶行程距離（mm）」填入 125、「皮帶速度（m/min）」填入 30。',
            'Enter 125 in “Belt travel distance (mm)” and 30 in “Belt speed (m/min)”.',
          ),
          text(
            '在「產品節距（mm）」填入 50，讀取應用計算結果。',
            'Enter 50 in “Product pitch (mm)” and read Application results.',
          ),
          text(
            '確認「指定行程的節距數」為小數，不把它當成完成件數。',
            'Confirm “Pitch count over specified distance” is fractional and do not treat it as complete parts.',
          ),
        ],
        expected: [
          text(
            '行程時間為 0.25 s，指定行程的節距數為 2.5。',
            'Travel time is 0.25 s and pitch count over the specified distance is 2.5.',
          ),
        ],
        interpretation: text(
          '若要算完成件數，還需要起始相位與進出料規則；本工具刻意不臆測。',
          'Completed parts also require start phase and infeed/outfeed rules; this tool intentionally does not assume them.',
        ),
      },
    ],
    pitfalls: [
      text(
        '速度、距離與節距都必須大於 0；零速不是可估算有限時間的情境。',
        'Speed, distance, and pitch must all be greater than zero; zero speed cannot produce a finite travel time.',
      ),
    ],
    sources: [nistSi],
  },
  'time-converter': {
    task: text(
      '以固定加工與移載時間估算單一班別的可完成循環。',
      'Estimate complete cycles in one shift from fixed process and transfer times.',
    ),
    scope: text(
      '只扣除輸入的休息時間；不代表含良率、換線或停機的實際排程。',
      'Only deducts the entered break; it is not an actual schedule including yield, changeovers, or downtime.',
    ),
    cases: [
      {
        title: text(
          '8 小時班別扣 30 分鐘休息',
          'Eight-hour shift with a 30-minute break',
        ),
        inputs: [
          input(
            '加工時間（秒）',
            'Process time (seconds)',
            '24',
            '製程秒表或規格',
            'Process timing or specification',
          ),
          input(
            '移載時間（秒）',
            'Transfer time (seconds)',
            '6',
            '製程秒表或規格',
            'Process timing or specification',
          ),
          input(
            '班別時數（小時）',
            'Shift duration (hours)',
            '8',
            '排班設定',
            'Shift schedule',
          ),
          input(
            '休息時間（分鐘）',
            'Break time (minutes)',
            '30',
            '排班設定',
            'Shift schedule',
          ),
        ],
        steps: [
          text('依序輸入 24、6、8、30。', 'Enter 24, 6, 8, and 30 in order.'),
          text('讀取應用計算結果。', 'Read Application results.'),
        ],
        expected: [
          text(
            '單循環 30 s，可用生產時間 27000 s，可完成 900 cycles，剩餘 0 s。',
            'Cycle time is 30 s, available production time is 27000 s, complete cycles are 900, and remainder is 0 s.',
          ),
        ],
        interpretation: text(
          '這是可用時間恰好整除時的理論值，不應直接視為良品數。',
          'This is a theoretical value when available time divides exactly; do not treat it directly as good-part count.',
        ),
      },
      {
        title: text(
          '休息超過班別時數時阻止計算',
          'Block breaks longer than the shift',
        ),
        inputs: [
          input(
            '加工時間（秒）',
            'Process time (seconds)',
            '24',
            '測試值',
            'Test value',
          ),
          input(
            '移載時間（秒）',
            'Transfer time (seconds)',
            '6',
            '測試值',
            'Test value',
          ),
          input(
            '班別時數（小時）',
            'Shift duration (hours)',
            '1',
            '測試值',
            'Test value',
          ),
          input(
            '休息時間（分鐘）',
            'Break time (minutes)',
            '61',
            '測試值',
            'Test value',
          ),
        ],
        steps: [
          text(
            '在「加工時間（秒）」填入 24、在「移載時間（秒）」填入 6。',
            'Enter 24 in “Process time (seconds)” and 6 in “Transfer time (seconds)”.',
          ),
          text(
            '在「班別時數（小時）」填入 1、在「休息時間（分鐘）」填入 61。',
            'Enter 1 in “Shift duration (hours)” and 61 in “Break time (minutes)”.',
          ),
          text(
            '確認應用計算結果顯示休息不可超過班別的錯誤。',
            'Confirm Application results shows the error that breaks cannot exceed the shift.',
          ),
        ],
        expected: [
          text(
            '不顯示負的可用生產時間或負循環數。',
            'No negative available production time or negative cycle count is shown.',
          ),
        ],
        interpretation: text(
          '先確認班別跨日、休息累計方式與輸入單位，再重新估算。',
          'Confirm whether the shift spans days, how breaks are accumulated, and the input units before recalculating.',
        ),
      },
    ],
    pitfalls: [
      text(
        '加工時間須大於 0；移載可以是 0，但仍應確認現場是否真的無等待。',
        'Process time must be greater than zero; transfer may be zero, but verify that the line really has no waiting.',
      ),
    ],
    sources: [nistSi],
  },
};
