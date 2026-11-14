import { pinyin, polyphonic } from 'pinyin-pro';

const compoundSurnames = [
  '歐陽',
  '司馬',
  '上官',
  '諸葛',
  '夏侯',
  '東方',
  '皇甫',
  '尉遲',
  '公孫',
  '慕容',
];

export type NameFormat = 'surname-first' | 'name-first';
export type NameDraft = {
  surname: string;
  givenName: string;
  surnamePinyin: string[];
  givenPinyin: string[];
  surnameFirst: string;
  nameFirst: string;
  ambiguities: Array<{ character: string; readings: string[] }>;
  unsupported: string[];
};

export const MAX_NAME_CODE_POINTS = 40;

function splitName(input: string) {
  const compact = input.replaceAll(/\s+/gu, '');
  const parts = compact.split(/[，,]/u);
  if (parts.length > 2) throw new Error('姓名最多只能用一個逗號分隔姓、名。');
  if (parts.length === 2 && parts[0] && parts[1])
    return { surname: parts[0], givenName: parts[1] };
  const surname = compoundSurnames.find((item) => compact.startsWith(item));
  if (surname) return { surname, givenName: compact.slice(surname.length) };
  const characters = Array.from(compact);
  return {
    surname: characters[0] ?? '',
    givenName: characters.slice(1).join(''),
  };
}

function words(text: string, surname: 'head' | 'off') {
  return pinyin(text, {
    toneType: 'none',
    type: 'array',
    surname,
    traditional: true,
  });
}

/** Creates a Hanyu Pinyin draft only; official spellings must be confirmed by the person. */
export function transliterateName(input: string): NameDraft {
  if (Array.from(input).length > MAX_NAME_CODE_POINTS)
    throw new RangeError(
      `中文姓名不可超過 ${MAX_NAME_CODE_POINTS} 個 Unicode 碼點。`,
    );
  const { surname, givenName } = splitName(input);
  if (!surname || !givenName)
    throw new Error('請輸入姓與名；也可用逗號分隔姓、名。');
  const source = `${surname}${givenName}`;
  const nonHan = Array.from(source).filter(
    (character) => !/\p{Script=Han}/u.test(character),
  );
  const readings = polyphonic(source, {
    toneType: 'none',
    type: 'array',
    traditional: true,
  });
  const ambiguities = Array.from(source).flatMap((character, index) => {
    const choices = readings[index] ?? [];
    return choices.length > 1 ? [{ character, readings: choices }] : [];
  });
  const surnamePinyin = words(surname, 'head');
  const givenPinyin = words(givenName, 'off');
  const unsupported = Array.from(
    new Set([
      ...nonHan,
      ...[...surnamePinyin, ...givenPinyin].filter(
        (word) => !/^[a-zü]+$/iu.test(word),
      ),
    ]),
  );
  const upperSurname = surnamePinyin.join(' ').toUpperCase();
  const titleGiven = givenPinyin.map(
    (word) => word[0]?.toUpperCase() + word.slice(1),
  );
  return {
    surname,
    givenName,
    surnamePinyin,
    givenPinyin,
    surnameFirst: `${upperSurname}, ${titleGiven.join('-')}`,
    nameFirst: `${titleGiven.join('-')} ${upperSurname}`,
    ambiguities,
    unsupported,
  };
}
