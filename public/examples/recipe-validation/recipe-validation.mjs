import { createHash } from 'node:crypto';

export const SCHEMA_VERSION = 'recipe-v3';
export const MAX_RAW_INPUT_BYTES = 2048;
export const MAX_ERRORS = 3;

const REQUIRED_FIELDS = [
  'schema_version',
  'recipe_id',
  'temp',
  'speed',
  'low',
  'high',
];
const FIELD_RULES = {
  temp: { min: -40, max: 180, unit: '°C' },
  speed: { min: 0, max: 3000, unit: 'rpm' },
  low: { min: 0, max: 100, unit: '%' },
  high: { min: 0, max: 100, unit: '%' },
};
const PHASE_ORDER = { required: 0, type: 1, range: 2, cross: 3, unknown: 4 };

const rawDescriptor = (value, missing = false) => {
  if (missing) return { kind: 'missing' };
  if (value === null) return { kind: 'null' };
  if (typeof value === 'string') return { kind: 'string', value };
  if (typeof value === 'number')
    return Number.isFinite(value)
      ? { kind: 'number', value }
      : { kind: 'number', value: String(value) };
  if (typeof value === 'boolean') return { kind: 'boolean', value };
  return { kind: Array.isArray(value) ? 'array' : 'object' };
};

const error = (phase, path, code, value, missing = false) => ({
  code,
  path,
  phase,
  raw: rawDescriptor(value, missing),
});

const byteLength = (value) => Buffer.byteLength(value, 'utf8');
const has = (record, key) => Object.hasOwn(record, key);
const pointer = (key) => `/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;

// Called only after JSON.parse succeeds. Scan top-level keys without treating
// quoted braces, escaped quotes, or nested values as top-level key delimiters.
function duplicateKeys(text) {
  const seen = new Set();
  const duplicates = new Set();
  let depth = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      const start = index++;
      while (text[index] !== '"') {
        if (text[index] === '\\') index++;
        index++;
      }
      let next = index + 1;
      while (/\s/.test(text[next] ?? '') && next < text.length) next++;
      if (depth === 1 && text[next] === ':') {
        const key = JSON.parse(text.slice(start, index + 1));
        if (seen.has(key)) duplicates.add(key);
        seen.add(key);
      }
    } else if (char === '{' || char === '[') depth++;
    else if (char === '}' || char === ']') depth--;
  }
  return [...duplicates].sort(compareText);
}

const capErrors = (errors, maxErrors) => {
  if (errors.length <= maxErrors) return { errors, incomplete: false };
  return {
    errors: [
      ...errors.slice(0, maxErrors - 1),
      {
        code: 'error_limit_reached',
        omittedErrorCount: errors.length - (maxErrors - 1),
        path: '/',
        phase: 'limit',
        raw: { kind: 'summary' },
      },
    ],
    incomplete: true,
  };
};

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const sortErrors = (left, right) =>
  PHASE_ORDER[left.phase] - PHASE_ORDER[right.phase] ||
  compareText(left.path, right.path) ||
  compareText(left.code, right.code);

const canonicalCandidate = (record) =>
  `{"schema_version":"${SCHEMA_VERSION}","recipe_id":${JSON.stringify(record.recipe_id)},"temp":${record.temp},"speed":${record.speed},"low":${record.low},"high":${record.high}}`;

const result = ({ raw, errors, incomplete = false, candidate = null }) => ({
  candidate,
  errors,
  incomplete,
  raw,
  valid: errors.length === 0 && !incomplete,
});

export function validateRawRecipe(rawText, { maxErrors = MAX_ERRORS } = {}) {
  if (typeof rawText !== 'string')
    throw new TypeError('rawText must be a string');
  if (!Number.isSafeInteger(maxErrors) || maxErrors < 1)
    throw new RangeError('maxErrors must be a positive safe integer');
  const bytes = byteLength(rawText);
  if (bytes > MAX_RAW_INPUT_BYTES)
    return result({
      raw: { byteLength: bytes, text: null, truncated: true },
      errors: [
        {
          code: 'raw_input_too_large',
          path: '/',
          phase: 'input',
          raw: { kind: 'not-retained' },
        },
      ],
      incomplete: true,
    });

  const raw = { byteLength: bytes, text: rawText, truncated: false };
  let record;
  try {
    record = JSON.parse(rawText);
  } catch {
    return result({
      raw,
      errors: [
        {
          code: 'invalid_json',
          path: '/',
          phase: 'input',
          raw: { kind: 'text' },
        },
      ],
    });
  }
  if (!record || typeof record !== 'object' || Array.isArray(record))
    return result({
      raw,
      errors: [error('structure', '/', 'top_level_object_required', record)],
    });
  const duplicates = duplicateKeys(rawText);
  if (duplicates.length) {
    const capped = capErrors(
      duplicates.map((key) => ({
        phase: 'input',
        path: pointer(key),
        code: 'duplicate_key',
        raw: { kind: 'ambiguous-duplicate' },
      })),
      maxErrors,
    );
    return result({ raw, ...capped });
  }
  if (!has(record, 'schema_version'))
    return result({
      raw,
      errors: [
        error('required', '/schema_version', 'required', undefined, true),
      ],
    });
  if (record.schema_version !== SCHEMA_VERSION)
    return result({
      raw,
      errors: [
        error(
          'type',
          '/schema_version',
          'unsupported_schema_version',
          record.schema_version,
        ),
      ],
    });

  const errors = [];
  for (const field of REQUIRED_FIELDS.slice(1))
    if (!has(record, field))
      errors.push(error('required', `/${field}`, 'required', undefined, true));

  if (has(record, 'recipe_id')) {
    if (
      typeof record.recipe_id !== 'string' ||
      record.recipe_id.trim().length === 0
    )
      errors.push(
        error(
          'type',
          '/recipe_id',
          'nonempty_string_required',
          record.recipe_id,
        ),
      );
  }
  for (const field of Object.keys(FIELD_RULES)) {
    if (!has(record, field)) continue;
    if (!Number.isFinite(record[field]))
      errors.push(
        error('type', `/${field}`, 'finite_number_required', record[field]),
      );
  }
  for (const [field, rule] of Object.entries(FIELD_RULES)) {
    if (!has(record, field) || !Number.isFinite(record[field])) continue;
    if (record[field] < rule.min || record[field] > rule.max)
      errors.push(error('range', `/${field}`, 'out_of_range', record[field]));
  }
  if (
    Number.isFinite(record.low) &&
    Number.isFinite(record.high) &&
    record.low <= 100 &&
    record.low >= 0 &&
    record.high <= 100 &&
    record.high >= 0 &&
    record.low > record.high
  )
    errors.push(
      error('cross', '/low', 'low_must_not_exceed_high', {
        low: record.low,
        high: record.high,
      }),
    );

  for (const field of Object.keys(record).sort())
    if (!REQUIRED_FIELDS.includes(field))
      errors.push(
        error('unknown', pointer(field), 'unknown_field', record[field]),
      );

  errors.sort(sortErrors);
  const capped = capErrors(errors, maxErrors);
  if (capped.errors.length > 0) return result({ raw, ...capped });
  const canonical = canonicalCandidate(record);
  const hash = createHash('sha256').update(canonical, 'utf8').digest('hex');
  return result({
    raw,
    errors: [],
    candidate: {
      canonical,
      candidateId: `${SCHEMA_VERSION}:${hash}`,
      sha256: hash,
    },
  });
}
