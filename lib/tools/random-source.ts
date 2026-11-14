export type RandomIndex = (maximum: number) => number;

export function secureRandomInt(maximum: number): number {
  if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > 2 ** 32)
    throw new Error('亂數範圍必須是 1 到 2³² 的整數。');
  if (!globalThis.crypto?.getRandomValues)
    throw new Error('瀏覽器無法提供安全亂數。');
  const limit = Math.floor(2 ** 32 / maximum) * maximum;
  const buffer = new Uint32Array(1);
  for (let attempt = 0; attempt < 128; attempt++) {
    globalThis.crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % maximum;
  }
  throw new Error('安全亂數來源無法完成抽樣，請重試。');
}

export function shuffleList<T>(
  values: readonly T[],
  random: RandomIndex = secureRandomInt,
): T[] {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index--) {
    const other = random(index + 1);
    if (!Number.isInteger(other) || other < 0 || other > index)
      throw new Error('亂數索引超出範圍。');
    [output[index], output[other]] = [output[other], output[index]];
  }
  return output;
}
