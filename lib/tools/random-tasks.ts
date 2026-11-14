import {
  secureRandomInt,
  shuffleList,
  type RandomIndex,
} from './random-source.ts';

export type Participant = { name: string; weight: number };
export type DrawResult = Participant[];

export function parseParticipants(
  raw: string,
  weighted = false,
): Participant[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) throw new Error('請至少輸入一位參與者。');
  if (lines.length > 2000) throw new Error('參與者上限為 2000 位。');
  const entries = lines.map((line) => {
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length > 2 || !parts[0])
      throw new Error('每行請輸入名稱，權重以「名稱 | 整數」表示。');
    if (!weighted && parts.length > 1)
      throw new Error('未啟用權重時，請移除「| 權重」。');
    const weight = parts.length === 2 ? Number(parts[1]) : 1;
    if (!Number.isSafeInteger(weight) || weight < 1)
      throw new Error('權重必須是正整數。');
    return { name: parts[0], weight };
  });
  if (new Set(entries.map((entry) => entry.name)).size !== entries.length)
    throw new Error('名稱不可重複；請合併同名項目或使用權重。');
  return entries;
}

function weightedPick(
  values: readonly Participant[],
  random: RandomIndex,
): number {
  const total = values.reduce((sum, value) => sum + value.weight, 0);
  if (!Number.isSafeInteger(total) || total > 2 ** 32)
    throw new Error('權重總和不得超過 2³²，請縮小權重。');
  let cursor = random(total);
  for (let index = 0; index < values.length; index++) {
    cursor -= values[index].weight;
    if (cursor < 0) return index;
  }
  throw new Error('安全亂數索引超出範圍。');
}

export function drawParticipants(
  values: readonly Participant[],
  count: number,
  repeat: boolean,
  random: RandomIndex = secureRandomInt,
): DrawResult {
  if (!Number.isSafeInteger(count) || count < 1 || count > 1000)
    throw new Error('抽取數量必須是 1 到 1000 的整數。');
  if (!repeat && count > values.length)
    throw new Error('不重複抽取數量不可超過參與者人數。');
  const pool = [...values];
  const output: Participant[] = [];
  for (let index = 0; index < count; index++) {
    const picked = weightedPick(pool, random);
    output.push(pool[picked]);
    if (!repeat) pool.splice(picked, 1);
  }
  return output;
}

export type GroupMode = 'count' | 'size' | 'pairs';
export function makeGroups(
  names: readonly string[],
  mode: GroupMode,
  amount: number,
  random: RandomIndex = secureRandomInt,
): string[][] {
  if (names.length < 2) throw new Error('至少需要兩位參與者才能分組。');
  if (new Set(names).size !== names.length) throw new Error('名稱不可重複。');
  const ordered = shuffleList(names, random);
  if (mode === 'pairs')
    return Array.from({ length: Math.ceil(ordered.length / 2) }, (_, i) =>
      ordered.slice(i * 2, i * 2 + 2),
    );
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > names.length)
    throw new Error(
      mode === 'count'
        ? '組數必須介於 1 與參與者人數。'
        : '每組人數必須介於 1 與參與者人數。',
    );
  if (mode === 'size')
    return Array.from(
      { length: Math.ceil(names.length / amount) },
      (_, group) => ordered.slice(group * amount, (group + 1) * amount),
    );
  const groups = amount;
  return Array.from({ length: groups }, (_, group) => {
    const base = Math.floor(names.length / groups);
    const extra = names.length % groups;
    const start = group * base + Math.min(group, extra);
    return ordered.slice(start, start + base + (group < extra ? 1 : 0));
  });
}

export type GiftAssignment = { giver: string; receiver: string };
export function makeGiftExchange(
  names: readonly string[],
  random: RandomIndex = secureRandomInt,
): GiftAssignment[] {
  if (names.length < 3) throw new Error('交換禮物至少需要三位參與者。');
  if (new Set(names).size !== names.length) throw new Error('名稱不可重複。');
  const cycle = shuffleList(names, random);
  return cycle.map((giver, index) => ({
    giver,
    receiver: cycle[(index + 1) % cycle.length],
  }));
}
