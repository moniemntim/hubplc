import type { ToolSlug } from '../registry.ts';
import type { GuideText, ToolGuideData } from './types.ts';

const bi = (zh: string, en: string): GuideText => ({ zh, en });
const input = (
  labelZh: string,
  labelEn: string,
  value: string,
  sourceZh: string,
  sourceEn: string,
) => ({ label: bi(labelZh, labelEn), value, source: bi(sourceZh, sourceEn) });
const step = (zh: string, en: string) => bi(zh, en);

export const materialsApplicationGuides: Partial<
  Record<ToolSlug, ToolGuideData>
> = {
  'mass-converter': {
    task: bi(
      '把秤重紀錄轉為淨重與可追溯的估算件數。',
      'Turn a weighing record into net mass and a traceable estimated piece count.',
    ),
    scope: bi(
      '「估算件數」依標準單件質量換算，不能替代點數或批次追溯。',
      '“Estimated pieces” is derived from standard piece mass and does not replace a physical count or batch traceability.',
    ),
    cases: [
      {
        title: bi(
          '扣皮重後估算包裝件數',
          'Estimate packaged pieces after tare',
        ),
        inputs: [
          input('毛重', 'Gross mass', '12.6 kg', '秤重紀錄', 'Scale record'),
          input(
            '皮重',
            'Tare mass',
            '0.6 kg',
            '空箱量測',
            'Empty-box measurement',
          ),
          input(
            '單件標準質量',
            'Standard mass per item',
            '45 g',
            '已核准料件規格',
            'Approved part specification',
          ),
        ],
        steps: [
          step(
            '開啟應用計算後，在「毛重」填入 12.6、在「皮重」填入 0.6。',
            'Open Application results, enter 12.6 in “Gross mass” and 0.6 in “Tare mass”.',
          ),
          step(
            '在「單件標準質量」填入 45，讀取應用計算結果。',
            'Enter 45 in “Standard mass per item” and read Application results.',
          ),
        ],
        expected: [
          step(
            '淨重為 12 kg；估算等效件數約為 266.666667，刻意不取整。',
            'Net mass is 12 kg; estimated equivalent pieces are approximately 266.666667 and deliberately not rounded to an integer.',
          ),
        ],
        interpretation: step(
          '可用來發現與標準包裝數的差距；若需正式庫存數，應實際點數。',
          'Use this to spot a difference from a standard pack count; physically count for formal inventory.',
        ),
      },
      {
        title: bi('皮重大於毛重的輸入拒絕', 'Reject tare greater than gross'),
        inputs: [
          input(
            '毛重',
            'Gross mass',
            '0.5 kg',
            '同一次秤重',
            'Same weighing record',
          ),
          input(
            '皮重',
            'Tare mass',
            '0.6 kg',
            '同一次秤重',
            'Same weighing record',
          ),
          input(
            '單件標準質量',
            'Standard mass per item',
            '45 g',
            '固定測試條件',
            'Fixed test condition',
          ),
        ],
        steps: [
          step(
            '在「毛重」填入 0.5，在「皮重」填入 0.6，並在「單件標準質量」填入 45。',
            'Enter 0.5 in “Gross mass”, 0.6 in “Tare mass”, and 45 in “Standard mass per item”.',
          ),
          step(
            '確認應用計算結果顯示錯誤。',
            'Confirm Application results shows the validation error.',
          ),
        ],
        expected: [
          step(
            '畫面顯示「皮重不可大於毛重」，不產生負淨重。',
            'The page shows “Tare mass cannot exceed gross mass” and produces no negative net mass.',
          ),
        ],
        interpretation: step(
          '這通常表示欄位對調或秤重紀錄不一致，應先回查來源。',
          'This usually means swapped fields or an inconsistent record; check the source first.',
        ),
      },
    ],
    pitfalls: [
      step(
        '單件實際質量若有分布，估算值不能直接當實際件數。',
        'If individual mass varies, the estimate cannot be used as the actual count.',
      ),
    ],
    sources: [
      {
        label: bi('NIST：SI 單位', 'NIST: SI units'),
        url: 'https://www.nist.gov/pml/owm/metric-si/si-units',
      },
    ],
  },
  'area-converter': {
    task: bi(
      '從矩形圖面尺寸建立可審核的用料面積與板數下限。',
      'Build auditable material area and a sheet-count lower bound from rectangular drawing dimensions.',
    ),
    scope: bi(
      '不做排版最佳化；板數不保證能避開鋸縫、紋向、邊料或開孔。',
      'This is not nesting optimization; sheet count does not guarantee kerf, grain direction, trim, or opening constraints.',
    ),
    cases: [
      {
        title: bi(
          '十片矩形板含 10% 預留',
          'Ten rectangular panels with 10% allowance',
        ),
        inputs: [
          input(
            '單件長度',
            'Length per part',
            '1200 mm',
            '圖面尺寸',
            'Drawing dimension',
          ),
          input(
            '單件寬度',
            'Width per part',
            '600 mm',
            '圖面尺寸',
            'Drawing dimension',
          ),
          input('件數', 'Quantity', '10', '生產數量', 'Production quantity'),
          input(
            '預留損耗',
            'Allowance',
            '10%',
            '採購預留',
            'Purchasing allowance',
          ),
          input(
            '標準板材面積',
            'Standard sheet area',
            '1.22 m²',
            '板材規格',
            'Sheet specification',
          ),
        ],
        steps: [
          step(
            '在「單件長度」填入 1200、「單件寬度」填入 600、「件數」填入 10。',
            'Enter 1200 in “Length per part”, 600 in “Width per part”, and 10 in “Quantity”.',
          ),
          step(
            '在「預留損耗」填入 10，於「標準板材面積」填入 1.22，讀取應用計算結果。',
            'Enter 10 in “Allowance” and 1.22 in “Standard sheet area”, then read Application results.',
          ),
        ],
        expected: [
          step(
            '淨用料為 7.2 m²；含預留為 7.92 m²；理論下限為 7 張。',
            'Net material is 7.2 m²; with allowance it is 7.92 m²; theoretical minimum is 7 sheets.',
          ),
        ],
        interpretation: step(
          '7 張是 7.92 ÷ 1.22 後向上取整，實際採購仍要經排版確認。',
          'Seven is 7.92 ÷ 1.22 rounded up; confirm nesting before actual purchasing.',
        ),
      },
      {
        title: bi('零件數拒絕', 'Reject zero quantity'),
        inputs: [
          input(
            '單件長度',
            'Length per part',
            '1200 mm',
            '固定測試條件',
            'Fixed test condition',
          ),
          input(
            '單件寬度',
            'Width per part',
            '600 mm',
            '固定測試條件',
            'Fixed test condition',
          ),
          input(
            '件數',
            'Quantity',
            '0',
            '尚未確認的需求量',
            'Unconfirmed demand',
          ),
          input(
            '預留損耗',
            'Allowance',
            '10%',
            '固定測試條件',
            'Fixed test condition',
          ),
          input(
            '標準板材面積',
            'Standard sheet area',
            '1.22 m²',
            '固定測試條件',
            'Fixed test condition',
          ),
        ],
        steps: [
          step(
            '依序填入「單件長度」1200、「單件寬度」600、「件數」0、「預留損耗」10 與「標準板材面積」1.22。',
            'Enter 1200 for “Length per part”, 600 for “Width per part”, 0 for “Quantity”, 10 for “Allowance”, and 1.22 for “Standard sheet area”.',
          ),
        ],
        expected: [
          step(
            '畫面拒絕輸入，要求件數大於 0。',
            'The page rejects the input and requires quantity greater than zero.',
          ),
        ],
        interpretation: step(
          '零件需求沒有可估算的板材用量；先確認批量。',
          'There is no material requirement to estimate for zero parts; confirm the batch first.',
        ),
      },
    ],
    pitfalls: [
      step(
        'mm 尺寸轉 m² 時需除以 1,000,000，不是 1,000。',
        'Converting mm dimensions to m² requires division by 1,000,000, not 1,000.',
      ),
    ],
    sources: [
      {
        label: bi('NIST：SI 單位', 'NIST: SI units'),
        url: 'https://www.nist.gov/pml/owm/metric-si/si-units',
      },
    ],
  },
  'volume-converter': {
    task: bi(
      '依槽體內部尺寸與液位估算可用容積。',
      'Estimate usable volume from internal tank dimensions and fill height.',
    ),
    scope: bi(
      '只適用直壁長方體槽，並拒絕液位高於內部高度。',
      'Applies only to a straight-sided rectangular tank and rejects fill height above internal height.',
    ),
    cases: [
      {
        title: bi('槽體容量與目前餘量', 'Tank capacity and remaining volume'),
        inputs: [
          input(
            '槽內長度',
            'Internal length',
            '120 cm',
            '槽體內部量測',
            'Internal tank measurement',
          ),
          input(
            '槽內寬度',
            'Internal width',
            '50 cm',
            '槽體內部量測',
            'Internal tank measurement',
          ),
          input(
            '槽內高度',
            'Internal height',
            '80 cm',
            '槽體內部量測',
            'Internal tank measurement',
          ),
          input(
            '目前液位高度',
            'Current fill height',
            '65 cm',
            '液位讀值',
            'Level reading',
          ),
        ],
        steps: [
          step(
            '在「槽內長度」填入 120、「槽內寬度」填入 50，並在「槽內高度」填入 80。',
            'Enter 120 in “Internal length”, 50 in “Internal width”, and 80 in “Internal height”.',
          ),
          step(
            '在「目前液位高度」填入 65，讀取應用計算結果。',
            'Enter 65 in “Current fill height” and read Application results.',
          ),
        ],
        expected: [
          step(
            '容量 480 L；內容量 390 L；餘量 90 L；填充率 81.25%。',
            'Capacity is 480 L; contents 390 L; free volume 90 L; fill level 81.25%.',
          ),
        ],
        interpretation: step(
          '內容量以內部截面積乘液位計算，未包含液位計與幾何誤差。',
          'Contents are cross-sectional internal area times fill height, excluding sensor and geometric error.',
        ),
      },
      {
        title: bi('超過槽高的液位拒絕', 'Reject fill above tank height'),
        inputs: [
          input(
            '槽內長度',
            'Internal length',
            '120 cm',
            '固定測試條件',
            'Fixed test condition',
          ),
          input(
            '槽內寬度',
            'Internal width',
            '50 cm',
            '固定測試條件',
            'Fixed test condition',
          ),
          input(
            '槽內高度',
            'Internal height',
            '100 cm',
            '槽體尺寸',
            'Tank dimension',
          ),
          input(
            '目前液位高度',
            'Current fill height',
            '101 cm',
            '液位讀值',
            'Level reading',
          ),
        ],
        steps: [
          step(
            '依序在「槽內長度」、「槽內寬度」、「槽內高度」填入 120、50、100。',
            'Enter 120, 50, and 100 in “Internal length”, “Internal width”, and “Internal height”.',
          ),
          step(
            '在「目前液位高度」填入 101，確認應用計算結果顯示錯誤。',
            'Enter 101 in “Current fill height” and confirm Application results shows the validation error.',
          ),
        ],
        expected: [
          step(
            '畫面顯示液位不可高於槽內高度。',
            'The page reports that fill height cannot exceed internal height.',
          ),
        ],
        interpretation: step(
          '先檢查單位、量測基準或是否為溢流／非長方體槽。',
          'Check units, measurement reference, or whether this is an overflow/non-rectangular tank.',
        ),
      },
    ],
    pitfalls: [
      step(
        '外部尺寸、內襯厚度與斜底都會使此幾何估算失準。',
        'Outside dimensions, liner thickness, and sloped bottoms make this geometric estimate inaccurate.',
      ),
    ],
    sources: [
      {
        label: bi('NIST：SI 單位', 'NIST: SI units'),
        url: 'https://www.nist.gov/pml/owm/metric-si/si-units',
      },
    ],
  },
  'power-converter': {
    task: bi(
      '用軸扭矩、轉速與效率建立馬達負載的透明試算。',
      'Create a transparent motor-load estimate from shaft torque, speed, and efficiency.',
    ),
    scope: bi(
      '功率因數不是效率，不能據此推算電流或 VA。',
      'Power factor is not efficiency; this tool cannot infer current or VA from these inputs.',
    ),
    cases: [
      {
        title: bi(
          '10 N·m、1450 rpm 的軸功率',
          'Shaft power at 10 N·m and 1450 rpm',
        ),
        inputs: [
          input(
            '軸扭矩',
            'Shaft torque',
            '10 N·m',
            '機械負載',
            'Mechanical load',
          ),
          input(
            '轉速',
            'Rotational speed',
            '1450 rpm',
            '轉速設定',
            'Speed setting',
          ),
          input(
            '系統效率',
            'System efficiency',
            '90%',
            '效率假設',
            'Efficiency assumption',
          ),
        ],
        steps: [
          step(
            '在「軸扭矩」填入 10、在「轉速」填入 1450。',
            'Enter 10 in “Shaft torque” and 1450 in “Rotational speed”.',
          ),
          step(
            '在「系統效率」填入 90，讀取應用計算結果。',
            'Enter 90 in “System efficiency” and read Application results.',
          ),
        ],
        expected: [
          step(
            '機械功率約 1518.436 W（1.518 kW、2.036 hp）；估算輸入約 1687.151 W，損失約 168.715 W。',
            'Mechanical power is about 1518.436 W (1.518 kW, 2.036 hp); estimated input is 1687.151 W and loss 168.715 W.',
          ),
        ],
        interpretation: step(
          '輸入值來自機械功率除以效率；它不是銘牌實測功率。',
          'Input is mechanical power divided by efficiency; it is not a nameplate measurement.',
        ),
      },
      {
        title: bi('效率 100% 仍顯示零損失', '100% efficiency shows zero loss'),
        inputs: [
          input(
            '軸扭矩',
            'Shaft torque',
            '10 N·m',
            '理想化邊界條件',
            'Idealized boundary condition',
          ),
          input(
            '轉速',
            'Rotational speed',
            '60 rpm',
            '理想化邊界條件',
            'Idealized boundary condition',
          ),
          input(
            '系統效率',
            'System efficiency',
            '100%',
            '理想化邊界條件',
            'Idealized boundary condition',
          ),
        ],
        steps: [
          step(
            '在「軸扭矩」填入 10、在「轉速」填入 60。',
            'Enter 10 in “Shaft torque” and 60 in “Rotational speed”.',
          ),
          step(
            '在「系統效率」填入 100，讀取應用計算結果。',
            'Enter 100 in “System efficiency” and read Application results.',
          ),
        ],
        expected: [
          step(
            '機械功率與估算輸入同為約 62.832 W，損失為 0 W。',
            'Mechanical power and estimated input are both about 62.832 W, with 0 W loss.',
          ),
        ],
        interpretation: step(
          '這是數學邊界，不應視為實機效率宣告。',
          'This is a mathematical boundary, not a real-machine efficiency claim.',
        ),
      },
    ],
    pitfalls: [
      step(
        '若效率為 0 或大於 100%，計算會拒絕；功率因數需要電氣量測。',
        'Efficiency of 0 or above 100% is rejected; power factor needs electrical measurement.',
      ),
    ],
    sources: [
      {
        label: bi('NIST：SI 單位', 'NIST: SI units'),
        url: 'https://www.nist.gov/pml/owm/metric-si/si-units',
      },
    ],
  },
  'capacitance-converter': {
    task: bi(
      '以資料表選定的額定容差檢視實測電容量。',
      'Check measured capacitance against the nominal tolerance selected from the datasheet.',
    ),
    scope: bi(
      '容差結果不等於完整良品判定；量測頻率、偏壓、溫度與 ESR 等仍要符合資料表。',
      'A tolerance result is not a complete good-part decision; measurement frequency, bias, temperature, ESR, and more must still meet the datasheet.',
    ),
    cases: [
      {
        title: bi(
          '100 nF ±10% 的實測 108 nF',
          '100 nF ±10% measured at 108 nF',
        ),
        inputs: [
          input(
            '額定電容量',
            'Nominal capacitance',
            '100 nF',
            '元件標示',
            'Part marking',
          ),
          input(
            '選定容差',
            'Selected tolerance',
            '10%',
            '資料表容差',
            'Datasheet tolerance',
          ),
          input(
            '實測電容量',
            'Measured capacitance',
            '108 nF',
            '量測儀器',
            'Measurement instrument',
          ),
        ],
        steps: [
          step(
            '在「額定電容量」填入 100、在「選定容差」填入 10。',
            'Enter 100 in “Nominal capacitance” and 10 in “Selected tolerance”.',
          ),
          step(
            '在「實測電容量」填入 108，讀取應用計算結果。',
            'Enter 108 in “Measured capacitance” and read Application results.',
          ),
        ],
        expected: [
          step(
            '下限 90 nF、上限 110 nF；結果為在選定容差內。',
            'Lower limit is 90 nF and upper limit 110 nF; the result is within the selected tolerance.',
          ),
        ],
        interpretation: step(
          '結果只回答該項容差，不能代表耐壓、ESR 或偏壓特性通過。',
          'The result answers only this tolerance check, not voltage rating, ESR, or bias behaviour.',
        ),
      },
      {
        title: bi('下限邊界包含在內', 'Inclusive lower boundary'),
        inputs: [
          input(
            '額定電容量',
            'Nominal capacitance',
            '100 nF',
            '固定邊界測試',
            'Fixed boundary test',
          ),
          input(
            '選定容差',
            'Selected tolerance',
            '10%',
            '固定邊界測試',
            'Fixed boundary test',
          ),
          input(
            '實測電容量',
            'Measured capacitance',
            '90 nF',
            '固定邊界測試',
            'Fixed boundary test',
          ),
        ],
        steps: [
          step(
            '在「額定電容量」填入 100、在「選定容差」填入 10。',
            'Enter 100 in “Nominal capacitance” and 10 in “Selected tolerance”.',
          ),
          step(
            '在「實測電容量」填入 90，讀取應用計算結果。',
            'Enter 90 in “Measured capacitance” and read Application results.',
          ),
        ],
        expected: [
          step(
            '90 nF 等於下限，因此顯示在選定容差內（含邊界）。',
            '90 nF equals the lower limit, so it is within selected tolerance (inclusive).',
          ),
        ],
        interpretation: step(
          '邊界包含是本工具明示規則；不同規範若另有判定條件，應採其規範。',
          'Inclusive boundaries are this tool’s stated rule; use another specification if it defines different acceptance conditions.',
        ),
      },
    ],
    pitfalls: [
      step(
        '不要把「在容差內」寫成「元件一定良好」。',
        'Do not write “within tolerance” as “the component is definitely good.”',
      ),
    ],
    sources: [
      {
        label: bi('Murata：電容產品', 'Murata: capacitor products'),
        url: 'https://www.murata.com/en-global/products/capacitor',
      },
    ],
  },
  'storage-converter': {
    task: bi(
      '用明確的容量基數和有效吞吐率估算檔案傳輸時間。',
      'Estimate file-transfer time with an explicit capacity base and useful throughput.',
    ),
    scope: bi(
      'Mbps 是 bit/s，MB/s 與 MiB/s 是 byte/s；估算不保證網路或磁碟實際時間。',
      'Mbps is bit/s while MB/s and MiB/s are byte/s; an estimate does not guarantee actual network or disk time.',
    ),
    cases: [
      {
        title: bi(
          '10 GB 經 100 Mbps、80% 吞吐率',
          '10 GB at 100 Mbps and 80% throughput',
        ),
        inputs: [
          input(
            '檔案大小',
            'File size',
            '10',
            '十進位檔案大小',
            'Decimal file size',
          ),
          input(
            '檔案大小單位',
            'File-size unit',
            'GB（十進位）',
            '檔案容量標示',
            'File-capacity label',
          ),
          input(
            '標示傳輸速率',
            'Advertised transfer rate',
            '100',
            '網路標示速率',
            'Advertised network rate',
          ),
          input(
            '傳輸速率單位',
            'Transfer-rate unit',
            'Mbps（megabits/s）',
            '網路標示單位',
            'Advertised network unit',
          ),
          input(
            '有效吞吐率',
            'Useful throughput',
            '80%',
            '保守吞吐率假設',
            'Conservative throughput assumption',
          ),
        ],
        steps: [
          step(
            '在「檔案大小」填入 10，並在「檔案大小單位」選擇「GB（十進位）」。',
            'Enter 10 in “File size” and choose “GB (decimal)” for “File-size unit”.',
          ),
          step(
            '在「標示傳輸速率」填入 100、在「傳輸速率單位」選擇「Mbps（megabits/s）」，並在「有效吞吐率」填入 80。',
            'Enter 100 in “Advertised transfer rate”, choose “Mbps (megabits/s)” for “Transfer-rate unit”, and enter 80 in “Useful throughput”.',
          ),
        ],
        expected: [
          step(
            '檔案為 10,000,000,000 B；理想時間 800 s；調整後 1000 s，即 16 分 40 秒。',
            'The file is 10,000,000,000 B; ideal time is 800 s; adjusted time is 1000 s, or 16 min 40 s.',
          ),
        ],
        interpretation: step(
          '100 Mbps 先除以 8 成 12.5 MB/s；80% 使有效速率降為其八成。',
          '100 Mbps is first divided by 8 to 12.5 MB/s; 80% reduces effective rate to four-fifths.',
        ),
      },
      {
        title: bi(
          'GiB 與 MiB/s 的二進位條件',
          'Binary GiB and MiB/s conditions',
        ),
        inputs: [
          input(
            '檔案大小',
            'File size',
            '1',
            '系統顯示容量',
            'System-reported capacity',
          ),
          input(
            '檔案大小單位',
            'File-size unit',
            'GiB（二進位）',
            '系統顯示單位',
            'System-reported unit',
          ),
          input(
            '標示傳輸速率',
            'Advertised transfer rate',
            '100',
            '本機複製測試條件',
            'Local-copy test condition',
          ),
          input(
            '傳輸速率單位',
            'Transfer-rate unit',
            'MiB/s（mebibytes/s）',
            '本機複製測試條件',
            'Local-copy test condition',
          ),
          input(
            '有效吞吐率',
            'Useful throughput',
            '100%',
            '本機複製測試條件',
            'Local-copy test condition',
          ),
        ],
        steps: [
          step(
            '在「檔案大小」填入 1，並在「檔案大小單位」選擇「GiB（二進位）」。',
            'Enter 1 in “File size” and choose “GiB (binary)” for “File-size unit”.',
          ),
          step(
            '在「標示傳輸速率」填入 100、在「傳輸速率單位」選擇「MiB/s（mebibytes/s）」，並在「有效吞吐率」填入 100。',
            'Enter 100 in “Advertised transfer rate”, choose “MiB/s (mebibytes/s)” for “Transfer-rate unit”, and enter 100 in “Useful throughput”.',
          ),
        ],
        expected: [
          step(
            '理想與調整後時間均為 10.24 s。',
            'Ideal and adjusted time are both 10.24 s.',
          ),
        ],
        interpretation: step(
          '相同名稱的 G 與 Gi 不是同一基數，需保留來源單位。',
          'G and Gi are not the same base even when names look similar; preserve the source unit.',
        ),
      },
    ],
    pitfalls: [
      step(
        '把 MB/s 誤當 Mbps 會差 8 倍；協定與儲存裝置也會降低有效吞吐率。',
        'Mistaking MB/s for Mbps causes an eightfold error; protocol and storage also reduce useful throughput.',
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
};
