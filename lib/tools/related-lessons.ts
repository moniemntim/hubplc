import type { ToolSlug } from './registry.ts';
export type RelatedLesson = { slug: string; zh: string; en: string };
export const relatedLessons: Partial<Record<ToolSlug, RelatedLesson[]>> = {
  'base-converter': [
    {
      slug: 'fx5u-sd-bin-read-write',
      zh: '把 HEX、16 位元 WORD 與 BIN 檔案的位元組對照起來',
      en: 'Compare HEX, 16-bit WORDs and BIN bytes (Chinese walkthrough)',
    },
  ],
  'register-converter': [
    {
      slug: 'fx5u-sd-bin-read-write',
      zh: 'FX5U BIN 讀回：核對 WORD 數量、位置與有號數監看',
      en: 'FX5U BIN read-back: WORD counts, position and signed values (Chinese)',
    },
    {
      slug: 'fx5u-sd-csv-read-write',
      zh: 'FX5U CSV 帶符號十進位模式：核對寫出的數值',
      en: 'FX5U signed decimal CSV: check the written values (Chinese)',
    },
  ],
  'byte-encoding': [
    {
      slug: 'fx5u-sd-bin-read-write',
      zh: 'BIN 保存數值不是保存文字：從 FX5U 檔案分清 WORD 與 byte',
      en: 'BIN numbers and text bytes: an FX5U worked example (Chinese)',
    },
  ],
  crypto: [
    {
      slug: 'xca-ecu-https-certificate-setup',
      zh: '如果你要的是設備 HTTPS 連線，改看 XCA 憑證與信任鏈實作',
      en: 'For device HTTPS connections, follow the XCA certificate walkthrough (Chinese)',
    },
  ],
  'length-converter': [
    {
      slug: 'excel-rounddown',
      zh: '把尺寸帶到材料裁切：在 Excel 算完整件數與剩料',
      en: 'Use dimensions to calculate complete cuts and offcuts in Excel (Chinese)',
    },
  ],
  'area-converter': [
    {
      slug: 'excel-roundup',
      zh: '由材料需求換成完整採購包數：Excel 向上取整實作',
      en: 'Convert material requirements into whole purchase packs in Excel (Chinese)',
    },
  ],
  'time-converter': [
    {
      slug: 'excel-minifs',
      zh: '從有效作業紀錄找出最短時間，先排除故障零值',
      en: 'Find the shortest valid recorded duration, excluding fault zeroes (Chinese)',
    },
  ],
  'speed-converter': [
    {
      slug: 'excel-small',
      zh: '比較多次循環的短時段：第 k 小值與有效紀錄檢查',
      en: 'Compare recorded cycles using the kth-smallest valid duration (Chinese)',
    },
  ],
  'power-converter': [
    {
      slug: 'excel-maxifs',
      zh: '把量測紀錄依條件分組，再找出需要追查的峰值',
      en: 'Filter measurement records before investigating a peak value (Chinese)',
    },
  ],
};
export function getPublicRelatedLessons(
  tool: ToolSlug,
  publicArticles: readonly { slug: string }[],
): RelatedLesson[] {
  const published = new Set(publicArticles.map((article) => article.slug));
  return (relatedLessons[tool] ?? []).filter((lesson) =>
    published.has(lesson.slug),
  );
}
