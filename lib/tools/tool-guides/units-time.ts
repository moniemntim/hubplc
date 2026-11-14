import type { ToolSlug } from '../registry.ts';
import type { GuideText, ToolGuideData } from './types.ts';

const zhEn = (zh: string, en: string) => ({ zh, en });
const input = (
  labelZh: string,
  labelEn: string,
  value: string | GuideText,
  sourceZh: string,
  sourceEn: string,
) => ({
  label: zhEn(labelZh, labelEn),
  value,
  source: zhEn(sourceZh, sourceEn),
});

export const unitsTimeGuides: Partial<Record<ToolSlug, ToolGuideData>> = {
  stopwatch: {
    task: zhEn(
      '用單圈紀錄比對一段可重複的作業時間。',
      'Use laps to compare a repeatable task duration.',
    ),
    scope: zhEn(
      '以本機裝置時鐘累計，不是校時器；分享連結只帶出當下狀態。',
      'It accumulates device-clock time, not a synchronized clock; a share link only carries the current state.',
    ),
    cases: [
      {
        title: zhEn(
          '固定時鐘下記錄兩個循環',
          'Record two cycles on a fixed clock',
        ),
        inputs: [
          input(
            '操作',
            'Operation',
            zhEn(
              '開始 → 10 秒後單圈 → 再 15 秒後單圈 → 暫停',
              'Start → Lap after 10 s → Lap after another 15 s → Pause',
            ),
            '以固定測試時鐘重現的作業情境',
            'A task scenario reproduced with a fixed test clock',
          ),
        ],
        steps: [
          zhEn(
            '開始後 10 秒按「單圈計時」，再經 15 秒按第二次「單圈計時」。',
            'Start, press “Lap” after 10 seconds, then press it again after another 15 seconds.',
          ),
          zhEn(
            '第二圈後按「暫停」，讀取單圈與累計欄位。',
            'Pause after the second lap and read both lap and elapsed columns.',
          ),
        ],
        expected: [
          zhEn(
            '第一圈為 00:00:10.00；第二圈為 00:00:15.00，第二圈累計為 00:00:25.00。',
            'The first lap is 00:00:10.00; the second lap is 00:00:15.00, with 00:00:25.00 elapsed at lap two.',
          ),
        ],
        interpretation: zhEn(
          '固定時鐘用於驗證操作；實際作業用單圈時間比較循環差異，系統時間被調整時不宜作正式工時依據。',
          'The fixed clock verifies the workflow; in live work compare cycle variation using lap time, and do not use a run as formal timekeeping if the system clock changes.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '暫停後才能重設；重新整理會從同一瀏覽器儲存的狀態接續。',
        'Reset is available only after pausing; reload resumes state saved in the same browser.',
      ),
    ],
  },
  'world-clock': {
    task: zhEn(
      '以 IANA 時區比較跨國會議時間。',
      'Compare international meeting times using IANA zones.',
    ),
    scope: zhEn(
      '顯示取自裝置時間與瀏覽器時區資料，會依顯示日期套用夏令時間。',
      'Display uses device time and browser time-zone data, applying daylight-saving rules for the displayed date.',
    ),
    cases: [
      {
        title: zhEn(
          '固定日期下的台北與紐約冬季時差',
          'Taipei and New York winter difference at a fixed date',
        ),
        inputs: [
          input(
            '固定 UTC 時間',
            'Fixed UTC time',
            '2026-01-01 16:00:00',
            '固定測試時鐘；不是畫面可輸入的資料欄位',
            'Fixed test clock; not a data field in the UI',
          ),
        ],
        steps: [
          zhEn(
            '選擇「台灣・台北」，再搜尋並選擇「美國・紐約」。',
            'Select “Taiwan · Taipei”, then search for and select “United States · New York”.',
          ),
        ],
        expected: [
          zhEn(
            '在此固定日期，台北為 2026-01-02 00:00；紐約為 2026-01-01 11:00，紐約比台北慢 13 小時。',
            'At this fixed date, Taipei is 2026-01-02 00:00; New York is 2026-01-01 11:00, 13 hours behind Taipei.',
          ),
        ],
        interpretation: zhEn(
          '此為條件式範例而非即時承諾：同一 UTC 時刻可跨日，夏季紐約偏移不同，應看當日畫面而非背誦固定時差。',
          'This is a conditional example, not a live-time promise: one UTC instant can cross a date boundary, and New York’s summer offset differs, so use the date shown rather than a memorized difference.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '同一國家可能有多個時區；此工具不會校正錯誤的系統時間。',
        'A country may have several zones; this tool does not correct an incorrect system clock.',
      ),
    ],
  },
  'timestamp-converter': {
    task: zhEn(
      '在 Unix UTC 時間戳與台北本地日期時間間轉換。',
      'Convert between Unix UTC timestamps and Taipei local date-time.',
    ),
    scope: zhEn(
      '日期輸入會視為 Asia/Taipei，秒數與毫秒都必須是整數。',
      'Date input is interpreted as Asia/Taipei; seconds and milliseconds must be integers.',
    ),
    cases: [
      {
        title: zhEn(
          '事件秒數轉台北時間',
          'Convert event seconds to Taipei time',
        ),
        inputs: [
          input(
            'Unix 時間戳',
            'Unix timestamp',
            '1709251200 s',
            '日誌的 UTC 秒數欄位',
            'UTC-seconds field from a log',
          ),
        ],
        steps: [
          zhEn(
            '選「Unix 時間戳 → 台北時間」與「秒（s）」。',
            'Choose “Unix timestamp → Taipei time” and “Seconds (s)”.',
          ),
        ],
        expected: [
          zhEn(
            '台北日期時間為 2024-03-01 08:00:00；毫秒為 1709251200000。',
            'Taipei date-time is 2024-03-01 08:00:00; milliseconds are 1709251200000.',
          ),
        ],
        interpretation: zhEn(
          'Unix 時間戳本身以 UTC 表示，畫面日期是轉換後的台北民用時間。',
          'The Unix timestamp itself is UTC; the displayed date is converted Taipei civil time.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '不要在日期欄加 Z 或其他時區尾碼；無效日期（如 2 月 30 日）會被拒絕。',
        'Do not append Z or another time-zone suffix to the date field; invalid dates such as February 30 are rejected.',
      ),
    ],
  },
  'date-calculator': {
    task: zhEn(
      '按曆法日計算日期差或加減整數天。',
      'Calculate calendar-day differences or add/subtract whole days.',
    ),
    scope: zhEn(
      '使用 UTC 日曆座標，非 24 小時的時長計算，因此不受 DST 影響。',
      'Uses UTC calendar coordinates, not a 24-hour duration calculation, so DST does not affect it.',
    ),
    cases: [
      {
        title: zhEn('跨閏日並含首尾', 'Cross a leap day and include both ends'),
        inputs: [
          input(
            '開始日期',
            'Start date',
            '2024-02-28',
            '排程日期',
            'Schedule date',
          ),
          input(
            '結束日期',
            'End date',
            '2024-03-01',
            '排程日期',
            'Schedule date',
          ),
        ],
        steps: [
          zhEn(
            '選「計算兩日期相差天數」，勾選「含開始日與結束日」。',
            'Choose “Difference between dates” and check “Include start and end dates”.',
          ),
        ],
        expected: [
          zhEn(
            '相差曆法日為 2；含首尾計數為 3。',
            'Calendar-day difference is 2; including both dates is 3.',
          ),
        ],
        interpretation: zhEn(
          '2024 為閏年，2 月 29 日存在；「含首尾」用於以日期格計數的排程，不等於經過的 48 小時以外加一天。',
          '2024 is a leap year and February 29 exists; “include both” is for date-slot counting, not adding a day to elapsed 48 hours.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '增減天數只接受正負整數；日期範圍為 1900-01-01 至 9999-12-31。',
        'Days to add/subtract accepts only signed integers; valid dates run from 1900-01-01 to 9999-12-31.',
      ),
    ],
  },
  'length-converter': {
    task: zhEn(
      '換算固定定義的工程長度單位。',
      'Convert fixed-definition engineering length units.',
    ),
    scope: zhEn(
      '只換算幾何長度，不替代量測公差或熱膨脹修正。',
      'Converts geometric length only; it does not replace measurement tolerance or thermal-expansion correction.',
    ),
    cases: [
      {
        title: zhEn('公尺轉英尺', 'Metres to feet'),
        inputs: [
          input(
            '輸入數值',
            'Input value',
            '1 m',
            '圖面尺寸',
            'Drawing dimension',
          ),
        ],
        steps: [
          zhEn('來源選 m，目標選 ft。', 'Set source to m and target to ft.'),
        ],
        expected: [
          zhEn('結果約為 3.28084 ft。', 'Result is about 3.28084 ft.'),
        ],
        interpretation: zhEn(
          '此為精確單位比例；報告時仍應依原圖面指定的小數位與公差取捨。',
          'This is an exact unit ratio; report rounding still follows the drawing’s required precision and tolerance.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '海里是 1852 m；不要把角度或面積的平方比例當成長度比例。',
        'A nautical mile is 1852 m; do not apply area’s squared ratio to length.',
      ),
    ],
  },
  'temperature-converter': {
    task: zhEn(
      '處理含零點偏移的溫標轉換。',
      'Convert temperature scales that include zero-point offsets.',
    ),
    scope: zhEn(
      '溫度不是單純倍率；輸入不得低於 0 K。',
      'Temperature is not a simple scale factor; input cannot be below 0 K.',
    ),
    cases: [
      {
        title: zhEn('攝氏轉華氏', 'Celsius to Fahrenheit'),
        inputs: [
          input(
            '輸入數值',
            'Input value',
            '25 °C',
            '環境量測',
            'Ambient measurement',
          ),
        ],
        steps: [
          zhEn('來源選 °C，目標選 °F。', 'Set source to °C and target to °F.'),
        ],
        expected: [zhEn('結果為 77 °F。', 'Result is 77 °F.')],
        interpretation: zhEn(
          '此結果包含 32 °F 的零點偏移，不能把 25 直接乘 9/5。',
          'This result includes the 32 °F zero-point offset; do not merely multiply 25 by 9/5.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '低於絕對零度會顯示錯誤；製程規格請確認使用的是 °C、K 或其他溫標。',
        'Below-absolute-zero input is rejected; verify whether a process specification uses °C, K, or another scale.',
      ),
    ],
  },
  'mass-converter': {
    task: zhEn('換算質量單位。', 'Convert mass units.'),
    scope: zhEn(
      '此處「重量」指質量，不把 kg 直接當作力或 kgf。',
      'Here “weight” means mass; kg is not treated as force or kgf.',
    ),
    cases: [
      {
        title: zhEn('公斤轉磅', 'Kilograms to pounds'),
        inputs: [
          input(
            '輸入數值',
            'Input value',
            '10 kg',
            '物料秤重',
            'Material weighing',
          ),
        ],
        steps: [
          zhEn('來源選 kg，目標選 lb。', 'Set source to kg and target to lb.'),
        ],
        expected: [
          zhEn('結果約為 22.0462 lb。', 'Result is about 22.0462 lb.'),
        ],
        interpretation: zhEn(
          '用於包材或規格單的質量對照；受重力影響的載荷應另以力單位處理。',
          'Use for mass comparison on packaging or specifications; gravity-dependent load should use force units separately.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '公噸為 1000 kg；oz 為質量盎司，非液量盎司。',
        'A metric tonne is 1000 kg; oz here is mass ounce, not fluid ounce.',
      ),
    ],
  },
  'area-converter': {
    task: zhEn(
      '將平面面積在平方單位間換算。',
      'Convert planar areas between square units.',
    ),
    scope: zhEn(
      '面積倍率是長度倍率的平方。',
      'Area ratios are the square of length ratios.',
    ),
    cases: [
      {
        title: zhEn('平方公尺轉平方英尺', 'Square metres to square feet'),
        inputs: [
          input(
            '輸入數值',
            'Input value',
            '1 m²',
            '地坪或板材面積',
            'Floor or panel area',
          ),
        ],
        steps: [
          zhEn(
            '來源選 m²，目標選 ft²。',
            'Set source to m² and target to ft².',
          ),
        ],
        expected: [
          zhEn('結果約為 10.7639 ft²。', 'Result is about 10.7639 ft².'),
        ],
        interpretation: zhEn(
          '不能以 1 m = 3.28084 ft 直接當成面積結果；必須平方。',
          'Do not use 1 m = 3.28084 ft directly as an area result; the ratio must be squared.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        'ha 為 10,000 m²；請確認圖面尺寸是否已扣除開孔或損耗。',
        'A hectare is 10,000 m²; verify whether openings or waste are already excluded from drawing dimensions.',
      ),
    ],
  },
  'volume-converter': {
    task: zhEn('換算容積單位。', 'Convert volume units.'),
    scope: zhEn(
      '加侖區分美制與英制；不處理液體密度。',
      'US and imperial gallons are distinct; liquid density is not handled.',
    ),
    cases: [
      {
        title: zhEn('公升轉美制加侖', 'Litres to US gallons'),
        inputs: [
          input(
            '輸入數值',
            'Input value',
            '10 L',
            '槽體標示容積',
            'Tank labelled capacity',
          ),
        ],
        steps: [
          zhEn(
            '來源選 L，目標選「美制 gallon」。',
            'Set source to L and target to “US gallon”.',
          ),
        ],
        expected: [
          zhEn(
            '結果約為 2.64172 美制 gallon。',
            'Result is about 2.64172 US gallons.',
          ),
        ],
        interpretation: zhEn(
          '若規格沒有寫 US 或 imperial，需先確認來源，兩者不可混用。',
          'If a specification omits US or imperial, confirm the source first; the two must not be mixed.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        'mL 與 cm³ 等值；容積轉質量需另有密度與溫度條件。',
        'mL and cm³ are equivalent; converting volume to mass additionally requires density and temperature conditions.',
      ),
    ],
  },
  'pressure-converter': {
    task: zhEn(
      '在相同壓力基準下換算壓力單位。',
      'Convert pressure units only when their pressure reference is the same.',
    ),
    scope: zhEn(
      '不把表壓與絕對壓互換；mmH₂O 採標準重力。',
      'Does not convert gauge pressure to absolute pressure; mmH₂O uses standard gravity.',
    ),
    cases: [
      {
        title: zhEn('bar 轉 kPa', 'bar to kPa'),
        inputs: [
          input(
            '輸入數值',
            'Input value',
            '1 bar',
            '儀表讀值（基準已確認）',
            'Gauge reading with reference confirmed',
          ),
        ],
        steps: [
          zhEn(
            '來源選 bar，目標選 kPa。',
            'Set source to bar and target to kPa.',
          ),
        ],
        expected: [zhEn('結果為 100 kPa。', 'Result is 100 kPa.')],
        interpretation: zhEn(
          '換算前應先確認讀值是 barg、bara 或其他基準；數值單位相同不代表壓力基準相同。',
          'Before conversion, confirm whether the reading is barg, bara, or another reference; matching unit labels do not imply matching reference pressure.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '不要把 psi 與 psig/psia 的基準差異交給單位換算器處理。',
        'Do not expect a unit converter to resolve the reference difference between psi, psig, and psia.',
      ),
    ],
  },
  'power-converter': {
    task: zhEn(
      '換算功率，並區分馬力定義。',
      'Convert power while distinguishing horsepower definitions.',
    ),
    scope: zhEn(
      '機械 hp 與公制 PS 是不同單位；不表示耗電量。',
      'Mechanical hp and metric PS are different units; power is not energy consumption.',
    ),
    cases: [
      {
        title: zhEn('比較 hp 與 PS', 'Compare hp and PS'),
        inputs: [
          input(
            '輸入數值',
            'Input value',
            '1 機械 hp',
            '馬達銘牌或規格',
            'Motor nameplate or specification',
          ),
        ],
        steps: [
          zhEn(
            '來源選「機械 hp」，目標選 W；再改來源為「公制 PS」重算。',
            'Set source to “mechanical hp” and target to W, then recalculate with “metric PS”.',
          ),
        ],
        expected: [
          zhEn(
            '1 hp 約 745.700 W；1 PS 約 735.499 W。',
            '1 hp is about 745.700 W; 1 PS is about 735.499 W.',
          ),
        ],
        interpretation: zhEn(
          '馬力縮寫不足以決定定義；採購或選型要保留原規格所寫的 hp 或 PS。',
          'The horsepower abbreviation alone does not identify the definition; preserve the original hp or PS notation for procurement and selection.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        'kW × 時間才是能量；不要將 kW 直接當作 kWh。',
        'kW multiplied by time is energy; do not treat kW as kWh.',
      ),
    ],
  },
  'time-converter': {
    task: zhEn(
      '換算固定長度的時間單位。',
      'Convert fixed-duration time units.',
    ),
    scope: zhEn(
      'day 固定為 24 h，與日期、時區和夏令時間不同。',
      'A day is fixed at 24 h, unlike calendar dates, time zones, and daylight saving time.',
    ),
    cases: [
      {
        title: zhEn('分鐘轉小時', 'Minutes to hours'),
        inputs: [
          input(
            '輸入數值',
            'Input value',
            '90 min',
            '設備計時器設定',
            'Equipment timer setting',
          ),
        ],
        steps: [
          zhEn('來源選 min，目標選 h。', 'Set source to min and target to h.'),
        ],
        expected: [zhEn('結果為 1.5 h。', 'Result is 1.5 h.')],
        interpretation: zhEn(
          '用於持續時間；跨日期排程應使用日期計算器，跨地區排程應使用世界時鐘。',
          'Use for elapsed duration; use the date calculator for calendar schedules and the world clock for cross-region schedules.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        'μs、ms、s 的前綴差距很大，請先確認資料記錄單位。',
        'μs, ms, and s differ greatly; verify the unit used in the record first.',
      ),
    ],
  },
  'angle-converter': {
    task: zhEn(
      '在角度、弧度與一圈等角度單位間換算。',
      'Convert among degrees, radians, and turns.',
    ),
    scope: zhEn(
      '處理平面角，不是斜率百分比或三角函數的輸入驗證。',
      'Handles plane angle, not slope percentage or trigonometric-input validation.',
    ),
    cases: [
      {
        title: zhEn('半圈轉弧度', 'Half turn to radians'),
        inputs: [
          input(
            '輸入數值',
            'Input value',
            '180 度 °',
            '旋轉行程規格',
            'Rotation-travel specification',
          ),
        ],
        steps: [
          zhEn(
            '來源選「度 °」，目標選「弧度 rad」。',
            'Set source to “degree °” and target to “radian rad”.',
          ),
        ],
        expected: [
          zhEn('結果約為 3.14159 rad。', 'Result is about 3.14159 rad.'),
        ],
        interpretation: zhEn(
          '180°、π rad 與 0.5 turn 表示同一平面角。',
          '180°, π rad, and 0.5 turn represent the same plane angle.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '角分與時間的分鐘不同；控制器函式預期 rad 時不可直接輸入度數。',
        'Arcminutes are not time minutes; do not pass degrees where a controller function expects radians.',
      ),
    ],
  },
  'capacitance-converter': {
    task: zhEn('換算電容量單位。', 'Convert capacitance units.'),
    scope: zhEn(
      '只處理額定電容量，不推導容抗、耐壓或偏壓特性。',
      'Handles nominal capacitance only; it does not derive reactance, voltage rating, or bias behavior.',
    ),
    cases: [
      {
        title: zhEn('微法轉奈法', 'Microfarads to nanofarads'),
        inputs: [
          input(
            '輸入數值',
            'Input value',
            '1 μF',
            '電容標示',
            'Capacitor marking',
          ),
        ],
        steps: [
          zhEn('來源選 μF，目標選 nF。', 'Set source to μF and target to nF.'),
        ],
        expected: [zhEn('結果為 1,000 nF。', 'Result is 1,000 nF.')],
        interpretation: zhEn(
          '每往下一個 SI 前綴通常相差 1000 倍；選料時仍要比對容差、耐壓與介質。',
          'Adjacent SI prefixes normally differ by 1000; component selection still requires tolerance, voltage rating, and dielectric checks.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        'pF、nF、μF 很容易誤讀三個數量級；符號 μ 不是 m。',
        'pF, nF, and μF are easy to misread by three orders of magnitude; μ is not m.',
      ),
    ],
  },
  'speed-converter': {
    task: zhEn(
      '換算線速度與指定參考音速下的 Mach。',
      'Convert linear speed and Mach at the stated reference sound speed.',
    ),
    scope: zhEn(
      'Mach 固定以 343 m/s 換算，非現場溫度或介質的實際馬赫數。',
      'Mach uses a fixed 343 m/s reference, not the actual sound speed of the local temperature or medium.',
    ),
    cases: [
      {
        title: zhEn(
          '公里每小時轉公尺每秒',
          'Kilometres per hour to metres per second',
        ),
        inputs: [
          input(
            '輸入數值',
            'Input value',
            '36 km/h',
            '輸送線速度設定',
            'Conveyor speed setting',
          ),
        ],
        steps: [
          zhEn(
            '來源選 km/h，目標選 m/s。',
            'Set source to km/h and target to m/s.',
          ),
        ],
        expected: [zhEn('結果為 10 m/s。', 'Result is 10 m/s.')],
        interpretation: zhEn(
          '此換算適合固定速度單位；Mach 1 在此工具顯示為 343 m/s，僅為參考值。',
          'This suits fixed speed units; Mach 1 appears as 343 m/s here only as a reference value.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '節 kn 以海里每小時計；實際聲速需使用當地條件另算。',
        'A knot is a nautical mile per hour; actual sound speed needs separate local-condition calculation.',
      ),
    ],
  },
  'storage-converter': {
    task: zhEn(
      '辨別十進位與二進位資料容量。',
      'Distinguish decimal and binary data capacities.',
    ),
    scope: zhEn(
      'GB 為 10^9 B，GiB 為 2^30 B；B 與 b 不同。',
      'GB is 10^9 B and GiB is 2^30 B; B and b differ.',
    ),
    cases: [
      {
        title: zhEn('GB 轉 GiB', 'GB to GiB'),
        inputs: [
          input(
            '輸入數值',
            'Input value',
            '1 GB（十進位）',
            '磁碟標示容量',
            'Disk labelled capacity',
          ),
        ],
        steps: [
          zhEn(
            '來源選「GB（十進位）」，目標選「GiB（二進位）」。',
            'Set source to “GB (decimal)” and target to “GiB (binary)”.',
          ),
        ],
        expected: [
          zhEn('結果約為 0.931323 GiB。', 'Result is about 0.931323 GiB.'),
        ],
        interpretation: zhEn(
          '容量標示看似變小是基數不同，不是資料遺失。',
          'The apparently smaller capacity comes from a different base, not lost data.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        'byte (B) 等於 8 bit (b)；傳輸速率常用 b/s，儲存容量常用 B。',
        'One byte (B) equals 8 bits (b); transfer rates often use b/s while storage capacity often uses B.',
      ),
    ],
  },
  'currency-converter': {
    task: zhEn(
      '用明示的匯率換算金額，並區分示範、每日參考與實際成交價。',
      'Convert amounts using an explicit rate while distinguishing examples, daily references, and executable prices.',
    ),
    scope: zhEn(
      '手動模式完全在瀏覽器計算；每日參考匯率不是銀行買賣價或即時報價。',
      'Manual mode calculates entirely in the browser; daily reference rates are not bank buy/sell prices or live quotes.',
    ),
    cases: [
      {
        title: zhEn('手動 USD 對 TWD 報價', 'Manual USD-to-TWD quote'),
        inputs: [
          input(
            '金額',
            'Amount',
            '100 USD',
            '教學固定條件',
            'Fixed tutorial condition',
          ),
          input(
            '每 1 USD 可換多少 TWD',
            'TWD per 1 USD',
            '32',
            '教學固定匯率，非即時報價',
            'Tutorial rate, not a live quote',
          ),
        ],
        steps: [
          zhEn(
            '匯率來源選「手動輸入匯率」，來源 USD、目標 TWD，輸入匯率 32。',
            'Choose “Manual exchange rate”, set USD to TWD, and enter rate 32.',
          ),
        ],
        expected: [
          zhEn(
            '換算金額為 3,200.00 TWD；畫面會標示使用手動匯率。',
            'Converted amount is 3,200.00 TWD; the page identifies it as a manual rate.',
          ),
        ],
        interpretation: zhEn(
          '這是可重現的試算；實際付款前須以銀行、券商或合約報價及費用為準。',
          'This is a reproducible estimate; actual payment must use the bank, broker, or contract quote and fees.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '線上模式需先按鈕取得資料，且各幣別資料日期可能不同；小數位只影響顯示。',
        'Online mode needs an explicit fetch and currencies can have different data dates; display decimals affect presentation only.',
      ),
    ],
  },
  'dbm-watts': {
    task: zhEn(
      '在以 1 mW 為參考的 dBm 與線性功率間換算。',
      'Convert between dBm referenced to 1 mW and linear power.',
    ),
    scope: zhEn(
      'dBm 是功率比的對數表示，不是 dBV、dBu 或訊號振幅。',
      'dBm is a logarithmic power representation, not dBV, dBu, or signal amplitude.',
    ),
    cases: [
      {
        title: zhEn('30 dBm 轉瓦特', '30 dBm to watts'),
        inputs: [
          input(
            'dBm',
            'dBm',
            '30 dBm',
            'RF 功率設定或量測',
            'RF power setting or measurement',
          ),
        ],
        steps: [
          zhEn(
            '轉換方向選「dBm 轉瓦特」，輸入 30。',
            'Choose “dBm to watts” and enter 30.',
          ),
        ],
        expected: [
          zhEn(
            '結果為 1 W、1,000 mW，且為 0 dBW。',
            'Result is 1 W, 1,000 mW, and 0 dBW.',
          ),
        ],
        interpretation: zhEn(
          '每增加 10 dB，線性功率增加 10 倍；0 dBm 則是 1 mW。',
          'Each additional 10 dB increases linear power tenfold; 0 dBm is 1 mW.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '瓦特轉 dBm 時功率必須大於 0；阻抗或電壓換算需使用不同工具與已知條件。',
        'When converting watts to dBm, power must be greater than 0; impedance or voltage conversion needs a different tool and known conditions.',
      ),
    ],
  },
  'unit-converter': {
    task: zhEn(
      '以「流量與批次單位換算」處理流量，或一次將多筆同單位資料批次轉換。',
      'Use “Flow & Batch Unit Converter” for flow or to batch-convert multiple values with the same units.',
    ),
    scope: zhEn(
      '預設為單筆 L/min → m³/h；批次最多 200 筆非空白列且每列共用同一來源／目標單位。體積與質量流量不可直接換算。',
      'The default is a single L/min → m³/h conversion; batch mode accepts up to 200 non-empty rows sharing one source/target pair. Volumetric and mass flow cannot be directly converted.',
    ),
    cases: [
      {
        title: zhEn('L/min 批次轉 m³/h', 'Batch L/min to m³/h'),
        inputs: [
          input(
            '換算方式',
            'Conversion mode',
            zhEn('批次換算', 'Batch values'),
            '需將多筆同單位數值一起換算時選用',
            'Use when multiple values with the same units need conversion',
          ),
          input(
            '批次數值（每行一筆）',
            'Batch values (one per line)',
            '1\n10\n12',
            '三台設備的瞬時流量紀錄',
            'Instantaneous flow records from three machines',
          ),
          input(
            '來源／目標單位',
            'Source/target units',
            'L/min → m³/h',
            '同一批次的已確認單位',
            'Confirmed common batch units',
          ),
        ],
        steps: [
          zhEn(
            '物理量選「流量」、換算方式選「批次換算」，將 1、10、12 以每行一筆貼入「批次數值（每行一筆）」，來源選 L/min、目標選 m³/h。',
            'Choose “Flow” and “Batch values”; paste 1, 10, and 12 one per line into “Batch values (one per line)”, with L/min as source and m³/h as target.',
          ),
        ],
        expected: [
          zhEn(
            '各行結果依序為 0.06、0.6、0.72 m³/h；確認沒有錯誤列後，按「複製結果」取得表格。12 L/min 的單筆結果同為 0.72 m³/h。',
            'The line results are 0.06, 0.6, and 0.72 m³/h; after confirming there are no invalid rows, select “Copy result” to obtain the table. The single-value result for 12 L/min is also 0.72 m³/h.',
          ),
        ],
        interpretation: zhEn(
          '這避免對多筆資料逐筆重複操作；若來源中混有 kg/h，必須先用密度等製程條件另行處理。',
          'This avoids repeating a single-value workflow for each record; if kg/h is mixed in, handle it separately with density and process conditions.',
        ),
      },
    ],
    pitfalls: [
      zhEn(
        '批次內容應每行一個有效數字；US gpm 是美制液量加侖每分鐘，不能和英制 gallon 混用。',
        'Batch input should contain one valid number per line; US gpm uses US liquid gallons and must not be mixed with imperial gallons.',
      ),
    ],
  },
};
