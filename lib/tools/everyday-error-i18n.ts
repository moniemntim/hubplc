export const everydayErrorEnglish: Record<string, string> = {
  '請至少輸入一位參與者。': 'Enter at least one participant.',
  '參與者上限為 2000 位。': 'Use no more than 2,000 participants.',
  '每行請輸入名稱，權重以「名稱 | 整數」表示。':
    'Enter one name per line; use “name | integer” for weights.',
  '未啟用權重時，請移除「| 權重」。': 'Remove “| weight” or enable weights.',
  '權重必須是正整數。': 'Weights must be positive integers.',
  '名稱不可重複；請合併同名項目或使用權重。':
    'Names must be unique. Merge duplicate entries or use weights.',
  '名稱不可重複。': 'Names must be unique.',
  '權重總和不得超過 2³²，請縮小權重。':
    'Total weight must not exceed 2³². Reduce the weights.',
  '抽取數量必須是 1 到 1000 的整數。':
    'Pick count must be an integer from 1 to 1,000.',
  '不重複抽取數量不可超過參與者人數。':
    'A draw without repeats cannot exceed the participant count.',
  '至少需要兩位參與者才能分組。':
    'Grouping requires at least two participants.',
  '組數必須介於 1 與參與者人數。':
    'Group count must be between 1 and the participant count.',
  '每組人數必須介於 1 與參與者人數。':
    'Group size must be between 1 and the participant count.',
  '交換禮物至少需要三位參與者。':
    'Gift exchange requires at least three participants.',
  '產生數量必須是 1 到 1000 的整數。':
    'Count must be an integer from 1 to 1,000.',
  '代碼長度必須是 2 到 32 的整數。':
    'Code length must be an integer from 2 to 32.',
  '前綴限 32 個英數、底線或連字號字元。':
    'The prefix allows up to 32 letters, digits, underscores or hyphens.',
  '請選擇有效的字元集。': 'Select a valid character set.',
  '目前字元集與長度可產生的不同代碼不足，請增加長度或縮小數量。':
    'This alphabet and length cannot produce enough unique codes. Increase the length or reduce the count.',
  '安全亂數重複過多，無法在限制內產生唯一代碼，請重試或增加長度。':
    'Too many collisions to generate unique codes within the limit. Retry or increase the length.',
  '亂數範圍必須是 1 到 2³² 的整數。':
    'The random range must be an integer from 1 to 2³².',
  '瀏覽器無法提供安全亂數。': 'This browser cannot provide secure randomness.',
  '安全亂數來源無法完成抽樣，請重試。':
    'Secure sampling did not complete. Try again.',
  '安全亂數來源回傳無效索引。': 'The random source returned an invalid index.',
  '安全亂數索引超出範圍。':
    'The secure random index is outside the supported range.',
  '亂數索引超出範圍。': 'The random index is outside the supported range.',
  '文字不可超過 100,000 個字元。': 'Text must not exceed 100,000 characters.',
  '自訂文字不可超過 100 筆。': 'Use no more than 100 custom terms.',
  '每筆自訂文字不可超過 200 個字元。':
    'Each custom term must not exceed 200 characters.',
  '輸入不可超過 200,000 個字元。': 'Input must not exceed 200,000 characters.',
  '最多可檢查 2,000 列。': 'Check no more than 2,000 rows.',
  '姓名最多只能用一個逗號分隔姓、名。':
    'Use at most one comma to separate surname and given name.',
  '中文姓名不可超過 40 個 Unicode 碼點。':
    'A Chinese name must not exceed 40 Unicode code points.',
  '請輸入姓與名；也可用逗號分隔姓、名。':
    'Enter surname and given name; you can separate them with a comma.',
};
