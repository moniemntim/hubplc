export const MAX_EMAIL_ROWS = 2_000;
export const MAX_EMAIL_INPUT = 200_000;

export type EmailStatus = 'valid' | 'invalid' | 'review' | 'duplicate';
export type EmailRow = {
  line: number;
  input: string;
  normalized: string;
  status: EmailStatus;
  reason: string;
};

function normaliseDomain(domain: string) {
  if (!domain || /[\s/%?#@:\\]/u.test(domain) || domain.includes('..'))
    return '';
  try {
    return new URL(`http://${domain}`).hostname;
  } catch {
    return '';
  }
}

function inspectEmail(input: string): Omit<EmailRow, 'line' | 'input'> {
  const value = input.trim();
  if (!value) return { normalized: '', status: 'invalid', reason: '空白列' };
  if (value.length > 254)
    return {
      normalized: value,
      status: 'invalid',
      reason: '地址超過 254 個字元',
    };
  if (value.includes('"') || /[()<>,;:]/u.test(value))
    return {
      normalized: value,
      status: 'review',
      reason: '含引號或複雜 RFC 語法，請人工確認',
    };
  const parts = value.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1])
    return { normalized: value, status: 'invalid', reason: '必須有一個 @' };
  const [local, rawDomain] = parts;
  if (
    local.length > 64 ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/iu.test(local)
  )
    return {
      normalized: value,
      status: 'invalid',
      reason: '本機名稱格式不支援',
    };
  const domain = normaliseDomain(rawDomain);
  if (!domain || domain.length > 253 || !domain.includes('.'))
    return { normalized: value, status: 'invalid', reason: '網域格式不完整' };
  const labels = domain.split('.');
  if (
    labels.some(
      (label) =>
        !label ||
        label.length > 63 ||
        label.startsWith('-') ||
        label.endsWith('-') ||
        !/^[a-z0-9-]+$/u.test(label),
    )
  )
    return {
      normalized: value,
      status: 'invalid',
      reason: '網域標籤格式不正確',
    };
  return {
    normalized: `${local}@${domain}`,
    status: 'valid',
    reason: '符合本工具的基本格式規則',
  };
}

/** Checks syntax only. It never connects to SMTP, DNS MX, or a mailbox. */
export function checkEmails(input: string): EmailRow[] {
  if (input.length > MAX_EMAIL_INPUT)
    throw new RangeError(
      `輸入不可超過 ${MAX_EMAIL_INPUT.toLocaleString()} 個字元。`,
    );
  const lines = input.split(/\r?\n/u);
  if (lines.length > MAX_EMAIL_ROWS)
    throw new RangeError(`最多可檢查 ${MAX_EMAIL_ROWS.toLocaleString()} 列。`);
  const seen = new Set<string>();
  return lines.map((input, index) => {
    const checked = inspectEmail(input);
    if (checked.status === 'valid') {
      // The domain is normalized to lowercase by URL.hostname. Keep the local
      // part as supplied because local-part case sensitivity is server-defined.
      const key = checked.normalized;
      if (seen.has(key))
        return {
          line: index + 1,
          input,
          normalized: checked.normalized,
          status: 'duplicate',
          reason: '與前一筆標準化地址重複',
        };
      seen.add(key);
    }
    return { line: index + 1, input, ...checked };
  });
}
