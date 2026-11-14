import { bi, finite, read, requireCondition, row } from './shared.ts';
import type { UnitWorkflow } from './types.ts';
import {
  decimal,
  add,
  subtract,
  multiply,
  divide,
  wholeCount,
} from './decimal-counts.ts';

const nistSiUrl = 'https://www.nist.gov/pml/owm/metric-si/si-units';
const nistTemperatureUrl = 'https://www.nist.gov/pml/owm/si-units-temperature';
const nistPressureUrl =
  'https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9';
const nistAngleUrl = nistPressureUrl;

const lengthNominal = bi(
  '圖面標稱尺寸（mm）',
  'Drawing nominal dimension (mm)',
);
const lengthTolerance = bi('對稱公差（± mm）', 'Symmetric tolerance (± mm)');
const startTemperature = bi('起始溫度（°C）', 'Start temperature (°C)');
const endTemperature = bi('結束溫度（°C）', 'End temperature (°C)');
const pressureReference = bi('輸入壓力基準', 'Input pressure reference');
const pressureValue = bi('輸入壓力（kPa）', 'Input pressure (kPa)');
const localAtmosphere = bi(
  '當地大氣壓範例值（kPa）',
  'Example local atmospheric pressure (kPa)',
);
const encoderPpr = bi(
  '編碼器每轉脈波數（PPR）',
  'Encoder pulses per revolution (PPR)',
);
const quadratureMultiplier = bi('計數倍率', 'Counting multiplier');
const targetAngle = bi('目標角度（°）', 'Target angle (°)');
const travelDistance = bi('皮帶行程距離（mm）', 'Belt travel distance (mm)');
const beltSpeed = bi('皮帶速度（m/min）', 'Belt speed (m/min)');
const productPitch = bi('產品節距（mm）', 'Product pitch (mm)');
const processTime = bi('加工時間（秒）', 'Process time (seconds)');
const transferTime = bi('移載時間（秒）', 'Transfer time (seconds)');
const shiftHours = bi('班別時數（小時）', 'Shift duration (hours)');
const breakMinutes = bi('休息時間（分鐘）', 'Break time (minutes)');

export const engineeringWorkflows: UnitWorkflow[] = [
  {
    group: 'length',
    title: bi('圖面尺寸與對稱公差', 'Drawing size and symmetric tolerance'),
    description: bi(
      '把標稱尺寸與 ± 公差換成英吋的標稱、下限、上限及公差。',
      'Convert a nominal dimension and ± tolerance to inch nominal, limits, and tolerance.',
    ),
    fields: [
      {
        key: 'nominalMm',
        label: lengthNominal,
        defaultValue: '100',
        unit: 'mm',
      },
      {
        key: 'toleranceMm',
        label: lengthTolerance,
        defaultValue: '0.1',
        unit: 'mm',
      },
    ],
    calculate(input) {
      const nominal = read(input, 'nominalMm', lengthNominal, 'positive');
      const tolerance = read(
        input,
        'toleranceMm',
        lengthTolerance,
        'nonnegative',
      );
      requireCondition(
        tolerance < nominal,
        '對稱公差必須小於標稱尺寸，才能得到正的下限尺寸。',
        'Symmetric tolerance must be smaller than the nominal dimension so the lower limit remains positive.',
      );
      const inch = 25.4;
      return [
        row('標稱尺寸', 'Nominal dimension', nominal / inch, 'in'),
        row('下限尺寸', 'Lower limit', (nominal - tolerance) / inch, 'in'),
        row('上限尺寸', 'Upper limit', (nominal + tolerance) / inch, 'in'),
        row('對稱公差', 'Symmetric tolerance', tolerance / inch, '± in'),
      ];
    },
    notes: [
      bi(
        '英吋標稱 = mm 標稱 ÷ 25.4；上下限分別為（標稱 ± 公差）÷ 25.4，公差本身也除以 25.4。',
        'Inch nominal = mm nominal ÷ 25.4; limits are (nominal ± tolerance) ÷ 25.4, and tolerance is also divided by 25.4.',
      ),
      bi(
        '此計算採用 1 in = 25.4 mm 的精確定義；不會替代圖面上的幾何公差或量測判定。',
        'This uses the exact definition 1 in = 25.4 mm; it does not replace GD&T or an inspection decision.',
      ),
    ],
    sources: [
      {
        label: bi(
          'NIST：SI 單位與英吋換算',
          'NIST: SI units and inch conversion',
        ),
        url: 'https://www.nist.gov/pml/owm/si-units-length',
      },
    ],
  },
  {
    group: 'temperature',
    title: bi('溫度區間與溫差', 'Temperature range and delta'),
    description: bi(
      '同時列出兩端的絕對溫度，以及不加 32 偏移的溫差。',
      'Show absolute temperatures at both endpoints and a delta without a 32-degree offset.',
    ),
    fields: [
      {
        key: 'startC',
        label: startTemperature,
        defaultValue: '25',
        unit: '°C',
      },
      { key: 'endC', label: endTemperature, defaultValue: '85', unit: '°C' },
    ],
    calculate(input) {
      const start = read(input, 'startC', startTemperature);
      const end = read(input, 'endC', endTemperature);
      requireCondition(
        start >= -273.15 && end >= -273.15,
        '攝氏溫度不可低於絕對零度 −273.15 °C。',
        'Celsius temperature cannot be below absolute zero, −273.15 °C.',
      );
      const delta = end - start;
      return [
        row('起始絕對溫度', 'Start absolute temperature', start + 273.15, 'K'),
        row(
          '起始華氏溫度',
          'Start Fahrenheit temperature',
          (start * 9) / 5 + 32,
          '°F',
        ),
        row('結束絕對溫度', 'End absolute temperature', end + 273.15, 'K'),
        row(
          '結束華氏溫度',
          'End Fahrenheit temperature',
          (end * 9) / 5 + 32,
          '°F',
        ),
        row('溫差', 'Temperature delta', delta, 'K'),
        row('華氏溫差', 'Fahrenheit delta', (delta * 9) / 5, '°F'),
      ];
    },
    notes: [
      bi(
        'K = °C + 273.15；°F = °C × 9/5 + 32；溫差 ΔK = 結束 °C − 起始 °C，Δ°F = ΔK × 9/5。',
        'K = °C + 273.15; °F = °C × 9/5 + 32; delta ΔK = end °C − start °C, and Δ°F = ΔK × 9/5.',
      ),
      bi(
        '溫差的 °F 只乘 9/5，不能加 32；正值表示升溫，負值表示降溫。',
        'A Fahrenheit delta is multiplied by 9/5 only, with no +32 offset; positive means heating and negative means cooling.',
      ),
    ],
    sources: [
      {
        label: bi('NIST：溫度單位', 'NIST: temperature units'),
        url: nistTemperatureUrl,
      },
    ],
  },
  {
    group: 'pressure',
    title: bi('表壓與絕對壓', 'Gauge and absolute pressure'),
    description: bi(
      '依指定的大氣壓範例值，在表壓與絕對壓之間換算並列出 bar。',
      'Convert between gauge and absolute pressure using a stated atmospheric-pressure example, including bar.',
    ),
    fields: [
      {
        key: 'reference',
        label: pressureReference,
        defaultValue: 'gauge',
        options: [
          {
            value: 'gauge',
            label: bi(
              '表壓（相對當地大氣）',
              'Gauge (relative to local atmosphere)',
            ),
          },
          {
            value: 'absolute',
            label: bi('絕對壓（相對真空）', 'Absolute (relative to vacuum)'),
          },
        ],
      },
      {
        key: 'pressureKpa',
        label: pressureValue,
        defaultValue: '250',
        unit: 'kPa',
      },
      {
        key: 'atmosphereKpa',
        label: localAtmosphere,
        defaultValue: '101.325',
        unit: 'kPa',
        hint: bi(
          '預設值只是示範，不是即時天氣或現場量測值。',
          'The default is an example, not live weather or a site measurement.',
        ),
      },
    ],
    calculate(input) {
      const reference = input.reference;
      requireCondition(
        reference === 'gauge' || reference === 'absolute',
        '請選擇表壓或絕對壓。',
        'Choose gauge or absolute pressure.',
      );
      const pressure = read(input, 'pressureKpa', pressureValue);
      const atmosphere = read(
        input,
        'atmosphereKpa',
        localAtmosphere,
        'positive',
      );
      const absolute = reference === 'gauge' ? pressure + atmosphere : pressure;
      const gauge = reference === 'gauge' ? pressure : pressure - atmosphere;
      requireCondition(
        absolute >= 0,
        '絕對壓不可小於 0 kPa；負表壓最低只能到真空。',
        'Absolute pressure cannot be below 0 kPa; negative gauge pressure cannot go below vacuum.',
      );
      return [
        row('絕對壓', 'Absolute pressure', absolute, 'kPa'),
        row('絕對壓', 'Absolute pressure', absolute / 100, 'bar'),
        row('表壓', 'Gauge pressure', gauge, 'kPa'),
        row('表壓', 'Gauge pressure', gauge / 100, 'bar'),
      ];
    },
    notes: [
      bi(
        '絕對壓 = 表壓 + 當地大氣壓；表壓 = 絕對壓 − 當地大氣壓；bar = kPa ÷ 100。',
        'Absolute = gauge + local atmospheric pressure; gauge = absolute − local atmospheric pressure; bar = kPa ÷ 100.',
      ),
      bi(
        '大氣壓欄位必須填入現場採用的參考值；負表壓可用，但結果不能低於真空。',
        'Enter the reference used at the site for atmospheric pressure; negative gauge pressure is allowed, but the result cannot go below vacuum.',
      ),
    ],
    sources: [
      {
        label: bi('NIST：壓力單位', 'NIST: pressure units'),
        url: nistPressureUrl,
      },
    ],
  },
  {
    group: 'angle',
    title: bi('編碼器角度計數', 'Encoder angle counts'),
    description: bi(
      '依 PPR、計數倍率與目標角度求理想計數、最近整數計數及量化誤差。',
      'Use PPR, counting multiplier, and target angle to find ideal counts, nearest integer counts, and quantization error.',
    ),
    fields: [
      { key: 'ppr', label: encoderPpr, defaultValue: '1000', unit: 'PPR' },
      {
        key: 'multiplier',
        label: quadratureMultiplier,
        defaultValue: '4',
        options: [
          { value: '1', label: bi('×1 計數', '×1 counting') },
          { value: '2', label: bi('×2 計數', '×2 counting') },
          { value: '4', label: bi('×4 計數', '×4 counting') },
        ],
      },
      {
        key: 'targetDegrees',
        label: targetAngle,
        defaultValue: '90',
        unit: '°',
      },
    ],
    calculate(input) {
      const ppr = read(input, 'ppr', encoderPpr, 'integer-positive');
      const multiplier = read(
        input,
        'multiplier',
        quadratureMultiplier,
        'integer-positive',
      );
      requireCondition(
        multiplier === 1 || multiplier === 2 || multiplier === 4,
        '計數倍率只能是 1、2 或 4。',
        'Counting multiplier must be 1, 2, or 4.',
      );
      const target = read(input, 'targetDegrees', targetAngle, 'nonnegative');
      const effective = finite(ppr * multiplier);
      requireCondition(
        Number.isSafeInteger(effective),
        '有效每轉計數超出安全整數範圍。',
        'Effective counts per revolution exceed the safe-integer range.',
      );
      const exact = finite((target / 360) * effective);
      requireCondition(
        Math.abs(exact) <= Number.MAX_SAFE_INTEGER,
        '目標角度對應的計數超出安全整數範圍。',
        'The target angle produces counts outside the safe-integer range.',
      );
      const nearest = Math.round(exact);
      const realized = finite((nearest * 360) / effective);
      return [
        row(
          '有效每轉計數',
          'Effective counts per revolution',
          effective,
          'counts/rev',
        ),
        row('理想計數', 'Exact count', exact, 'counts'),
        row('最近整數計數', 'Nearest integer count', nearest, 'counts'),
        row('實際角度', 'Realized angle', realized, '°'),
        row(
          '量化誤差（實際 − 目標）',
          'Quantization error (realized − target)',
          realized - target,
          '°',
        ),
      ];
    },
    notes: [
      bi(
        '有效每轉計數 = PPR × 倍率；理想計數 = 目標角度 ÷ 360 × 有效計數；取最近整數後，以計數 × 360 ÷ 有效計數回算角度。',
        'Effective counts/rev = PPR × multiplier; exact count = target angle ÷ 360 × effective counts. Round to the nearest integer, then recover angle as count × 360 ÷ effective counts.',
      ),
      bi(
        '此為理想等分計數；不含零點、方向、齒隙、濾波或實際控制器的計數規則。',
        'This assumes ideal equal count spacing; it excludes homing, direction, backlash, filtering, and controller-specific counting rules.',
      ),
    ],
    sources: [
      {
        label: bi('NIST：平面角單位', 'NIST: plane angle units'),
        url: nistAngleUrl,
      },
    ],
  },
  {
    group: 'speed',
    title: bi('皮帶行程與節距節拍', 'Belt travel and pitch cadence'),
    description: bi(
      '在恆速假設下，估算指定行程時間、節距間隔與理論件數率。',
      'Under a constant-speed assumption, estimate travel time, pitch interval, and theoretical part rate.',
    ),
    fields: [
      {
        key: 'distanceMm',
        label: travelDistance,
        defaultValue: '1000',
        unit: 'mm',
      },
      { key: 'speedMMin', label: beltSpeed, defaultValue: '30', unit: 'm/min' },
      { key: 'pitchMm', label: productPitch, defaultValue: '50', unit: 'mm' },
    ],
    calculate(input) {
      const distance = read(input, 'distanceMm', travelDistance, 'positive');
      const speed = read(input, 'speedMMin', beltSpeed, 'positive');
      const pitch = read(input, 'pitchMm', productPitch, 'positive');
      const speedMmSecond = (speed * 1000) / 60;
      return [
        row(
          '指定行程時間',
          'Specified travel time',
          distance / speedMmSecond,
          's',
        ),
        row('每節距通過間隔', 'Interval per pitch', pitch / speedMmSecond, 's'),
        row(
          '指定行程的節距數',
          'Pitch count over specified distance',
          distance / pitch,
          'pitches',
        ),
        row(
          '理論通過率',
          'Theoretical throughput',
          (speed * 1000) / pitch,
          'parts/min',
        ),
      ];
    },
    notes: [
      bi(
        '速度先由 m/min × 1000 ÷ 60 換成 mm/s；行程時間 = 距離 ÷ 速度，節距間隔 = 節距 ÷ 速度，件數率 = m/min × 1000 ÷ 節距。',
        'Convert m/min × 1000 ÷ 60 to mm/s; travel time = distance ÷ speed, pitch interval = pitch ÷ speed, and parts/min = m/min × 1000 ÷ pitch.',
      ),
      bi(
        '僅適用於穩態恆速、每件一個節距；不含加減速、間隙、滑移、剔除或停機。',
        'Applies only to steady constant speed and one part per pitch; it excludes acceleration, gaps, slip, rejects, and downtime.',
      ),
    ],
    sources: [{ label: bi('NIST：SI 單位', 'NIST: SI units'), url: nistSiUrl }],
  },
  {
    group: 'time',
    title: bi('班別循環產能', 'Shift cycle capacity'),
    description: bi(
      '用加工、移載、班別與休息時間估算可完成循環和剩餘秒數。',
      'Use process, transfer, shift, and break times to estimate complete cycles and remaining seconds.',
    ),
    fields: [
      {
        key: 'processSeconds',
        label: processTime,
        defaultValue: '24',
        unit: 's',
      },
      {
        key: 'transferSeconds',
        label: transferTime,
        defaultValue: '6',
        unit: 's',
      },
      { key: 'shiftHours', label: shiftHours, defaultValue: '8', unit: 'h' },
      {
        key: 'breakMinutes',
        label: breakMinutes,
        defaultValue: '30',
        unit: 'min',
      },
    ],
    calculate(input) {
      const process = read(input, 'processSeconds', processTime, 'positive');
      const transfer = read(
        input,
        'transferSeconds',
        transferTime,
        'nonnegative',
      );
      const hours = read(input, 'shiftHours', shiftHours, 'positive');
      const breaks = read(input, 'breakMinutes', breakMinutes, 'nonnegative');
      const available = finite(hours * 3600 - breaks * 60);
      requireCondition(
        available >= 0,
        '休息時間不可超過班別時數。',
        'Break time cannot exceed the shift duration.',
      );
      const cycle = finite(process + transfer);
      const availableDecimal = subtract(
        multiply(decimal(hours), decimal(3600)),
        multiply(decimal(breaks), decimal(60)),
      );
      const cycleDecimal = add(decimal(process), decimal(transfer));
      const complete = wholeCount(
        divide(availableDecimal, cycleDecimal),
        'floor',
      );
      return [
        row('單循環時間', 'Cycle time', cycle, 's'),
        row('可用生產時間', 'Available production time', available, 's'),
        row('可完成循環數', 'Complete cycles', complete, 'cycles'),
        row(
          '剩餘未滿一循環時間',
          'Remaining incomplete-cycle time',
          Math.max(0, available - complete * cycle),
          's',
        ),
      ];
    },
    notes: [
      bi(
        '可用秒數 = 班別小時 × 3600 − 休息分鐘 × 60；循環秒數 = 加工 + 移載；完整循環 = 可用秒數 ÷ 循環秒數後捨去小數。',
        'Available seconds = shift hours × 3600 − break minutes × 60; cycle seconds = process + transfer; complete cycles = available seconds ÷ cycle seconds, rounded down.',
      ),
      bi(
        '僅扣除輸入的休息時間；不含換線、保養、良率、等待、故障與人員可用性。',
        'Only the entered break is deducted; changeovers, maintenance, yield, waiting, faults, and staffing are excluded.',
      ),
    ],
    sources: [{ label: bi('NIST：SI 單位', 'NIST: SI units'), url: nistSiUrl }],
  },
];
