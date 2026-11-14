import type { UnitWorkflow } from './types.ts';
import { bi, finite, read, requireCondition, row } from './shared.ts';
import {
  decimal,
  add,
  multiply,
  divide,
  wholeCount,
} from './decimal-counts.ts';

const nistSi = {
  label: bi('NIST：SI 單位與前綴', 'NIST: SI units and prefixes'),
  url: 'https://www.nist.gov/pml/owm/metric-si/si-units',
};

const label = (zh: string, en: string) => bi(zh, en);
const duration = (seconds: number) => {
  requireCondition(
    seconds <= Number.MAX_SAFE_INTEGER,
    '傳輸時間超出可顯示的整數秒範圍，請縮小容量或提高速率。',
    'Transfer time exceeds the supported whole-second range. Reduce file size or increase the rate.',
  );
  if (seconds > 0 && seconds < 1) return bi('少於 1 秒', 'Less than 1 second');
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainder = rounded % 60;
  return bi(
    `${hours ? `${hours} 小時 ` : ''}${minutes ? `${minutes} 分 ` : ''}${remainder} 秒`.trim(),
    `${hours ? `${hours} h ` : ''}${minutes ? `${minutes} min ` : ''}${remainder} s`.trim(),
  );
};

export const materialsWorkflows: UnitWorkflow[] = [
  {
    group: 'mass',
    title: label('淨重與估算件數', 'Net mass and estimated piece count'),
    description: label(
      '從毛重扣除皮重，估算等效件數。',
      'Subtract tare from gross mass and estimate equivalent pieces.',
    ),
    fields: [
      {
        key: 'grosskg',
        label: label('毛重', 'Gross mass'),
        defaultValue: '12.6',
        unit: 'kg',
      },
      {
        key: 'tarekg',
        label: label('皮重', 'Tare mass'),
        defaultValue: '0.6',
        unit: 'kg',
      },
      {
        key: 'itemg',
        label: label('單件標準質量', 'Standard mass per item'),
        defaultValue: '45',
        unit: 'g',
      },
    ],
    calculate(input) {
      const gross = read(
        input,
        'grosskg',
        label('毛重', 'Gross mass'),
        'nonnegative',
      );
      const tare = read(
        input,
        'tarekg',
        label('皮重', 'Tare mass'),
        'nonnegative',
      );
      const item = read(
        input,
        'itemg',
        label('單件標準質量', 'Standard mass per item'),
        'positive',
      );
      requireCondition(
        tare <= gross,
        '皮重不可大於毛重。',
        'Tare mass cannot exceed gross mass.',
      );
      const net = finite(gross - tare);
      const pieces = finite((net * 1000) / item);
      requireCondition(
        net === 0 || pieces > 0,
        '換算結果過小，請調整輸入範圍。',
        'The converted result is too small. Adjust the input range.',
      );
      return [
        row('淨重', 'Net mass', net, 'kg'),
        row(
          '估算等效件數（未取整）',
          'Estimated equivalent pieces (not rounded)',
          pieces,
          'items',
        ),
      ];
    },
    notes: [
      label(
        '淨重（kg）= 毛重 − 皮重；估算等效件數 = 淨重 × 1000 ÷ 單件質量（g）。',
        'Net mass (kg) = gross − tare; estimated equivalent pieces = net kg × 1000 ÷ standard item mass (g).',
      ),
      label(
        '件數是依「單件標準質量」換算的估計值；不能取代實際點數。',
        'The piece count is an estimate based on the stated standard mass; it does not replace an actual count.',
      ),
    ],
    sources: [nistSi],
  },
  {
    group: 'area',
    title: label(
      '矩形用料與板材下限',
      'Rectangular material and sheet lower bound',
    ),
    description: label(
      '以圖面矩形尺寸估算用料與理論板數。',
      'Estimate material and a theoretical sheet count from rectangular dimensions.',
    ),
    fields: [
      {
        key: 'lengthmm',
        label: label('單件長度', 'Length per part'),
        defaultValue: '1200',
        unit: 'mm',
      },
      {
        key: 'widthmm',
        label: label('單件寬度', 'Width per part'),
        defaultValue: '600',
        unit: 'mm',
      },
      {
        key: 'quantity',
        label: label('件數', 'Quantity'),
        defaultValue: '10',
        unit: 'items',
      },
      {
        key: 'allowancepct',
        label: label('預留損耗', 'Allowance'),
        defaultValue: '10',
        unit: '%',
      },
      {
        key: 'sheetm2',
        label: label('標準板材面積', 'Standard sheet area'),
        defaultValue: '1.22',
        unit: 'm²',
      },
    ],
    calculate(input) {
      const length = read(
        input,
        'lengthmm',
        label('單件長度', 'Length per part'),
        'positive',
      );
      const width = read(
        input,
        'widthmm',
        label('單件寬度', 'Width per part'),
        'positive',
      );
      const quantity = read(
        input,
        'quantity',
        label('件數', 'Quantity'),
        'integer-positive',
      );
      const allowance = read(
        input,
        'allowancepct',
        label('預留損耗', 'Allowance'),
        'nonnegative',
      );
      const sheet = read(
        input,
        'sheetm2',
        label('標準板材面積', 'Standard sheet area'),
        'positive',
      );
      const net = finite((length * width * quantity) / 1_000_000);
      const withAllowance = finite(net * (1 + allowance / 100));
      requireCondition(
        net > 0 && withAllowance > 0,
        '面積結果過小，請調整尺寸或單位。',
        'The area is too small to represent. Adjust dimensions or units.',
      );
      const areaDecimal = divide(
        multiply(multiply(decimal(length), decimal(width)), decimal(quantity)),
        decimal(1_000_000),
      );
      const allowanceDecimal = add(
        decimal(1),
        divide(decimal(allowance), decimal(100)),
      );
      const sheets = wholeCount(
        divide(multiply(areaDecimal, allowanceDecimal), decimal(sheet)),
        'ceil',
      );
      return [
        row('淨用料面積', 'Net material area', net, 'm²'),
        row('含預留面積', 'Area including allowance', withAllowance, 'm²'),
        row(
          '理論標準板數下限',
          'Theoretical minimum sheet count',
          sheets,
          'sheets',
        ),
      ];
    },
    notes: [
      label(
        '淨面積（m²）= 長（mm）× 寬（mm）× 件數 ÷ 1,000,000；含預留面積 = 淨面積 ×（1 + 損耗% ÷ 100）；板數下限為含預留面積 ÷ 每板面積後向上取整。',
        'Net area (m²) = length mm × width mm × quantity ÷ 1,000,000; area including allowance = net area × (1 + allowance% ÷ 100). Round that area ÷ sheet area up for the lower-bound count.',
      ),
      label(
        '板數只是不含排版、鋸縫、紋向與邊料的理論下限，不能保證可切割。',
        'The sheet count is only a theoretical lower bound; it does not guarantee a feasible cutting layout, kerf, grain direction, or trim allowance.',
      ),
    ],
    sources: [nistSi],
  },
  {
    group: 'volume',
    title: label('長方體槽內容量', 'Rectangular tank contents'),
    description: label(
      '用槽體內部尺寸與液位計算容量、內容量與餘量。',
      'Calculate capacity, contents, and free volume from internal dimensions and fill height.',
    ),
    fields: [
      {
        key: 'lengthcm',
        label: label('槽內長度', 'Internal length'),
        defaultValue: '120',
        unit: 'cm',
      },
      {
        key: 'widthcm',
        label: label('槽內寬度', 'Internal width'),
        defaultValue: '50',
        unit: 'cm',
      },
      {
        key: 'heightcm',
        label: label('槽內高度', 'Internal height'),
        defaultValue: '80',
        unit: 'cm',
      },
      {
        key: 'fillheightcm',
        label: label('目前液位高度', 'Current fill height'),
        defaultValue: '65',
        unit: 'cm',
      },
    ],
    calculate(input) {
      const length = read(
        input,
        'lengthcm',
        label('槽內長度', 'Internal length'),
        'positive',
      );
      const width = read(
        input,
        'widthcm',
        label('槽內寬度', 'Internal width'),
        'positive',
      );
      const height = read(
        input,
        'heightcm',
        label('槽內高度', 'Internal height'),
        'positive',
      );
      const fill = read(
        input,
        'fillheightcm',
        label('目前液位高度', 'Current fill height'),
        'nonnegative',
      );
      requireCondition(
        fill <= height,
        '液位高度不可高於槽內高度。',
        'Fill height cannot exceed internal height.',
      );
      const capacity = finite((length * width * height) / 1000);
      const content = finite((length * width * fill) / 1000);
      requireCondition(
        capacity > 0 && (fill === 0 || content > 0),
        '容量結果過小，請調整尺寸或單位。',
        'The volume is too small to represent. Adjust dimensions or units.',
      );
      return [
        row('槽體容量', 'Tank capacity', capacity, 'L'),
        row('目前內容量', 'Current contents', content, 'L'),
        row('可用餘量', 'Free volume', finite(capacity - content), 'L'),
        row('填充率', 'Fill level', finite((content / capacity) * 100), '%'),
      ];
    },
    notes: [
      label(
        '容量（L）= 內長（cm）× 內寬（cm）× 內高（cm）÷ 1000；目前內容量以液位高度代替內高，餘量 = 容量 − 內容量。',
        'Capacity (L) = internal length cm × width cm × height cm ÷ 1000. Replace height with fill height for current contents; free volume = capacity − contents.',
      ),
      label(
        '僅適用直壁長方體槽的內部幾何容量；不含液位計誤差、斜底與安全液位。',
        'This is internal geometric volume for a straight-sided rectangular tank only; it excludes level-sensor error, sloped bottoms, and operating safety level.',
      ),
    ],
    sources: [nistSi],
  },
  {
    group: 'power',
    title: label('軸功率與估算輸入', 'Shaft power and estimated input'),
    description: label(
      '由扭矩、轉速與效率估算機械功率和電力輸入。',
      'Estimate mechanical shaft power and electrical input from torque, speed, and efficiency.',
    ),
    fields: [
      {
        key: 'torquenm',
        label: label('軸扭矩', 'Shaft torque'),
        defaultValue: '10',
        unit: 'N·m',
      },
      {
        key: 'rpm',
        label: label('轉速', 'Rotational speed'),
        defaultValue: '1450',
        unit: 'rpm',
      },
      {
        key: 'efficiencypct',
        label: label('系統效率', 'System efficiency'),
        defaultValue: '90',
        unit: '%',
      },
    ],
    calculate(input) {
      const torque = read(
        input,
        'torquenm',
        label('軸扭矩', 'Shaft torque'),
        'nonnegative',
      );
      const rpm = read(
        input,
        'rpm',
        label('轉速', 'Rotational speed'),
        'nonnegative',
      );
      const efficiency = read(
        input,
        'efficiencypct',
        label('系統效率', 'System efficiency'),
        'positive',
      );
      requireCondition(
        efficiency <= 100,
        '系統效率不可大於 100%。',
        'System efficiency cannot exceed 100%.',
      );
      const mechanical = finite((torque * 2 * Math.PI * rpm) / 60);
      const inputPower = finite(mechanical / (efficiency / 100));
      return [
        row('機械軸功率', 'Mechanical shaft power', mechanical, 'W'),
        row(
          '機械軸功率',
          'Mechanical shaft power',
          finite(mechanical / 1000),
          'kW',
        ),
        row(
          '機械馬力',
          'Mechanical horsepower',
          finite(mechanical / 745.6998715822702),
          'hp',
        ),
        row('估算電力輸入', 'Estimated electrical input', inputPower, 'W'),
        row(
          '估算效率損失',
          'Estimated efficiency loss',
          finite(inputPower - mechanical),
          'W',
        ),
      ];
    },
    notes: [
      label(
        '機械功率（W）= 扭矩（N·m）× 2π × rpm ÷ 60；估算電力輸入 = 機械功率 ÷（效率% ÷ 100），效率損失 = 輸入 − 機械功率。',
        'Shaft power (W) = torque (N·m) × 2π × rpm ÷ 60; estimated electrical input = shaft power ÷ (efficiency% ÷ 100), and efficiency loss = input − shaft power.',
      ),
      label(
        '效率需對應輸入的負載點；此簡化模型未包含空載耗損。功率因數是另一個關係，不能由機械效率推得。',
        'Efficiency must apply to the entered load point; this simplified model excludes no-load losses. Power factor is a separate relationship and cannot be inferred from mechanical efficiency.',
      ),
    ],
    sources: [nistSi],
  },
  {
    group: 'capacitance',
    title: label('電容容差檢核', 'Capacitance tolerance check'),
    description: label(
      '比對實測值是否落在選定的額定容差範圍內。',
      'Compare a measured value with the selected nominal tolerance range.',
    ),
    fields: [
      {
        key: 'nominalnf',
        label: label('額定電容量', 'Nominal capacitance'),
        defaultValue: '100',
        unit: 'nF',
      },
      {
        key: 'tolerancepct',
        label: label('選定容差', 'Selected tolerance'),
        defaultValue: '10',
        unit: '%',
      },
      {
        key: 'measurednf',
        label: label('實測電容量', 'Measured capacitance'),
        defaultValue: '108',
        unit: 'nF',
      },
    ],
    calculate(input) {
      const nominal = read(
        input,
        'nominalnf',
        label('額定電容量', 'Nominal capacitance'),
        'positive',
      );
      const tolerance = read(
        input,
        'tolerancepct',
        label('選定容差', 'Selected tolerance'),
        'nonnegative',
      );
      const measured = read(
        input,
        'measurednf',
        label('實測電容量', 'Measured capacitance'),
        'nonnegative',
      );
      requireCondition(
        tolerance <= 100,
        '選定容差不可大於 100%。',
        'Selected tolerance cannot exceed 100%.',
      );
      const lower = finite(nominal * (1 - tolerance / 100));
      const upper = finite(nominal * (1 + tolerance / 100));
      const arithmeticSlack =
        Math.max(Math.abs(lower), Math.abs(upper), Math.abs(measured)) *
        Number.EPSILON *
        4;
      return [
        row('容差下限', 'Tolerance lower limit', lower, 'nF'),
        row('容差上限', 'Tolerance upper limit', upper, 'nF'),
        row(
          '實測值是否在選定容差內',
          'Measured value within selected tolerance',
          measured >= lower - arithmeticSlack &&
            measured <= upper + arithmeticSlack
            ? bi('是（含邊界）', 'Yes (inclusive)')
            : bi('否', 'No'),
        ),
      ];
    },
    notes: [
      label(
        '下限 = 額定值 ×（1 − 容差% ÷ 100），上限 = 額定值 ×（1 + 容差% ÷ 100）；實測值介於兩者之間（含邊界）才在選定容差內。',
        'Lower = nominal × (1 − tolerance% ÷ 100); upper = nominal × (1 + tolerance% ÷ 100). A measured value is within the selected tolerance when it lies between those inclusive limits.',
      ),
      label(
        '「在容差內」不等於元件可判定良品；仍須依資料表條件確認量測頻率、偏壓、溫度、ESR、耐壓等。',
        '“Within tolerance” is not a blanket good-part decision; verify measurement frequency, bias, temperature, ESR, voltage rating, and other datasheet conditions.',
      ),
    ],
    sources: [
      {
        label: bi(
          'Murata：電容產品與規格考量',
          'Murata: capacitor products and specification considerations',
        ),
        url: 'https://www.murata.com/en-global/products/capacitor',
      },
    ],
  },
  {
    group: 'storage',
    title: label('檔案傳輸時間估算', 'File transfer time estimate'),
    description: label(
      '依容量基數、傳輸單位與有效吞吐率比較理想與調整後時間。',
      'Compare ideal and adjusted transfer time using capacity base, rate units, and useful throughput.',
    ),
    fields: [
      {
        key: 'filevalue',
        label: label('檔案大小', 'File size'),
        defaultValue: '10',
        unit: '',
      },
      {
        key: 'fileunit',
        label: label('檔案大小單位', 'File-size unit'),
        defaultValue: 'GB',
        options: [
          { value: 'GB', label: label('GB（十進位）', 'GB (decimal)') },
          { value: 'GiB', label: label('GiB（二進位）', 'GiB (binary)') },
        ],
      },
      {
        key: 'transfervalue',
        label: label('標示傳輸速率', 'Advertised transfer rate'),
        defaultValue: '100',
        unit: '',
      },
      {
        key: 'transferunit',
        label: label('傳輸速率單位', 'Transfer-rate unit'),
        defaultValue: 'Mbps',
        options: [
          {
            value: 'Mbps',
            label: label('Mbps（megabits/s）', 'Mbps (megabits/s)'),
          },
          {
            value: 'MBps',
            label: label('MB/s（megabytes/s）', 'MB/s (megabytes/s)'),
          },
          {
            value: 'MiBps',
            label: label('MiB/s（mebibytes/s）', 'MiB/s (mebibytes/s)'),
          },
        ],
      },
      {
        key: 'usefulpct',
        label: label('有效吞吐率', 'Useful throughput'),
        defaultValue: '80',
        unit: '%',
      },
    ],
    calculate(input) {
      const file = read(
        input,
        'filevalue',
        label('檔案大小', 'File size'),
        'positive',
      );
      const rate = read(
        input,
        'transfervalue',
        label('標示傳輸速率', 'Advertised transfer rate'),
        'positive',
      );
      const useful = read(
        input,
        'usefulpct',
        label('有效吞吐率', 'Useful throughput'),
        'positive',
      );
      requireCondition(
        useful <= 100,
        '有效吞吐率不可大於 100%。',
        'Useful throughput cannot exceed 100%.',
      );
      const fileUnit = input.fileunit;
      const transferUnit = input.transferunit;
      requireCondition(
        fileUnit === 'GB' || fileUnit === 'GiB',
        '請選擇檔案大小單位。',
        'Choose a file-size unit.',
      );
      requireCondition(
        ['Mbps', 'MBps', 'MiBps'].includes(transferUnit),
        '請選擇傳輸速率單位。',
        'Choose a transfer-rate unit.',
      );
      const bytes = finite(file * (fileUnit === 'GB' ? 1e9 : 2 ** 30));
      const bytesPerSecond = finite(
        rate *
          (transferUnit === 'Mbps'
            ? 1e6 / 8
            : transferUnit === 'MBps'
              ? 1e6
              : 2 ** 20),
      );
      const ideal = finite(bytes / bytesPerSecond);
      const adjusted = finite(ideal / (useful / 100));
      requireCondition(
        bytes > 0 && bytesPerSecond > 0 && ideal > 0 && adjusted > 0,
        '傳輸換算結果過小，請調整容量或速率。',
        'The transfer calculation is too small to represent. Adjust file size or rate.',
      );
      return [
        row('檔案位元組數', 'File bytes', bytes, 'B'),
        row('理想傳輸時間', 'Ideal transfer time', ideal, 's'),
        row('調整後傳輸時間', 'Adjusted transfer time', adjusted, 's'),
        row(
          '調整後可讀時間（約，取整秒）',
          'Adjusted readable time (rounded to seconds)',
          duration(adjusted),
        ),
      ];
    },
    notes: [
      label(
        '先把檔案大小換成 B、速率換成 B/s；理想秒數 = B ÷（B/s）；調整後秒數 = 理想秒數 ÷（有效吞吐率% ÷ 100）。',
        'Convert file size to B and rate to B/s; ideal seconds = B ÷ (B/s); adjusted seconds = ideal seconds ÷ (useful throughput% ÷ 100).',
      ),
      label(
        'B 是 byte、b 是 bit；GB 為 10⁹ B，GiB 為 2³⁰ B。有效吞吐率用於涵蓋協定、磁碟與網路等損耗，不是保證時間。',
        'B means byte and b means bit; GB is 10⁹ B while GiB is 2³⁰ B. Useful throughput captures protocol, disk, and network overhead; it is not a guaranteed duration.',
      ),
    ],
    sources: [
      {
        label: bi(
          'NIST：十進位與二進位容量前綴',
          'NIST: decimal and binary capacity prefixes',
        ),
        url: 'https://physics.nist.gov/cuu/Units/binary.html',
      },
    ],
  },
];
