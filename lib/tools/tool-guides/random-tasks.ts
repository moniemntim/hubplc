import type { ToolSlug } from '../registry.ts';
import type { ToolGuideData } from './types.ts';
const t = (zh: string, en: string) => ({ zh, en });
const guide = (
  task: ReturnType<typeof t>,
  scope: ReturnType<typeof t>,
  title: ReturnType<typeof t>,
  inputs: ToolGuideData['cases'][number]['inputs'],
  steps: ReturnType<typeof t>[],
  expected: ReturnType<typeof t>[],
  interpretation: ReturnType<typeof t>,
  pitfalls: ReturnType<typeof t>[],
): ToolGuideData => ({
  task,
  scope,
  cases: [
    {
      title,
      inputs,
      steps,
      expected,
      interpretation,
    },
  ],
  pitfalls,
});
export const randomTaskGuides: Partial<Record<ToolSlug, ToolGuideData>> = {
  'random-draw': guide(
    t('從名單抽出一位或多位結果。', 'Draw one or more results from a list.'),
    t(
      '同名不可重複；加權請以「名稱 | 正整數」輸入。',
      'Names must be unique; weights use “name | positive integer”.',
    ),
    t('抽兩位值日生', 'Draw two duty people'),
    [
      {
        label: t('參與者', 'Participants'),
        value: '王小明\n李小華\n陳小美',
        source: t('現場名單', 'Local list'),
      },
      {
        label: t('抽取數量', 'Pick count'),
        value: '2',
        source: t('需求', 'Requirement'),
      },
    ],
    [
      t('輸入每行一位名稱。', 'Enter one name per line.'),
      t(
        '選不重複並按產生結果。',
        'Select without replacement and generate the result.',
      ),
    ],
    [
      t('結果有兩位不同名稱。', 'The result contains two different names.'),
      t('變更輸入會清除舊結果。', 'Changing input clears the previous result.'),
    ],
    t(
      '結果是當次快照，可複製或下載 CSV。',
      'The result is a one-time snapshot that can be copied or downloaded as CSV.',
    ),
    [
      t(
        '請勿把同一人重複列出；使用權重表示機率差異。',
        'Do not list a person twice; use weights for different chances.',
      ),
    ],
  ),
  'random-groups': guide(
    t(
      '把每位參與者恰好分配到一組。',
      'Put every participant in exactly one group.',
    ),
    t(
      '可指定組數、每組人數或兩兩配對；配對奇數會保留一人。',
      'Choose group count, group size, or pairs; odd pairing leaves one person.',
    ),
    t('六人分成兩組', 'Split six people into two groups'),
    [
      {
        label: t('參與者', 'Participants'),
        value: '王小明\n李小華\n陳小美\n林大同\n張雅婷\n黃志強',
        source: t('班級名單', 'Class list'),
      },
      {
        label: t('組數', 'Group count'),
        value: '2',
        source: t('活動規則', 'Activity rule'),
      },
    ],
    [
      t('選指定組數並輸入 2。', 'Choose group count and enter 2.'),
      t('按產生結果。', 'Generate the result.'),
    ],
    [
      t(
        '總人數仍為 6，沒有重複或遺漏。',
        'All six people appear once, with no duplicates or omissions.',
      ),
      t(
        '兩組人數差最多一人。',
        'The two groups differ in size by at most one.',
      ),
    ],
    t(
      '需要固定搭檔時應另行輸入，不要把隨機分組當作約束排程。',
      'For fixed partners, use a constrained roster rather than random grouping.',
    ),
    [
      t(
        '兩兩配對的人數為奇數時，最後一組會是一人。',
        'With an odd count, the last pair group has one person.',
      ),
    ],
  ),
  'gift-exchange': guide(
    t(
      '建立不自抽、每人送出與收到各一次的交換禮物循環。',
      'Create a gift-exchange cycle: no self-draw and everyone gives/receives once.',
    ),
    t(
      '至少三位且名稱唯一；本工具不寄送 email 或通知。',
      'At least three unique names; the tool sends no email or notifications.',
    ),
    t('四人交換禮物', 'Four-person gift exchange'),
    [
      {
        label: t('參與者', 'Participants'),
        value: '王小明\n李小華\n陳小美\n林大同',
        source: t('活動名單', 'Event list'),
      },
    ],
    [
      t('輸入每行一位名稱。', 'Enter one name per line.'),
      t(
        '按產生結果後，用個人查看選擇自己的名稱。',
        'Generate, then choose a name in Individual view.',
      ),
    ],
    [
      t(
        '切換顯示一人的收禮對象；主辦人仍可展開完整名單。',
        'Individual view shows one recipient; the organizer can still expand the full list.',
      ),
      t(
        '完整名單中沒有任何人送給自己。',
        'No assignment gives a person their own name.',
      ),
    ],
    t(
      '把個人結果私下告知，避免在群組公開完整配對。',
      'Share individual results privately instead of posting the full pairing to a group.',
    ),
    [
      t(
        '新增、刪除或改名後必須重新產生配對。',
        'Adding, removing, or renaming requires a new draw.',
      ),
    ],
  ),
};
