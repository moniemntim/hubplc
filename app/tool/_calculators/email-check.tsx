'use client';

import { useMemo, useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import { checkEmails, type EmailRow } from '@/lib/tools/email-check';
import { csvRows, downloadText } from '@/lib/tools/text-export';
import { CopyButton, Notice, ToolPanel } from '../_components/controls';
import './email-check.css';

const example =
  'alice@example.com\nalice@EXAMPLE.com\nAlice@EXAMPLE.com\nuser@例子.测试\nalice@@example.com\n"quoted"@example.com';
const statusLabel = (row: EmailRow, tr: (zh: string, en: string) => string) =>
  ({
    valid: tr('有效格式', 'Valid syntax'),
    invalid: tr('格式錯誤', 'Invalid syntax'),
    review: tr('需人工確認', 'Needs review'),
    duplicate: tr('重複', 'Duplicate'),
  })[row.status];

function reasonLabel(reason: string, tr: (zh: string, en: string) => string) {
  return (
    {
      空白列: tr('空白列', 'Blank row'),
      '地址超過 254 個字元': tr(
        '地址超過 254 個字元',
        'Address exceeds 254 characters',
      ),
      '含引號或複雜 RFC 語法，請人工確認': tr(
        '含引號或複雜 RFC 語法，請人工確認',
        'Contains quotes or complex RFC syntax; review manually',
      ),
      '必須有一個 @': tr('必須有一個 @', 'Must contain one @'),
      本機名稱格式不支援: tr(
        '本機名稱格式不支援',
        'Unsupported local-part syntax',
      ),
      網域格式不完整: tr('網域格式不完整', 'Incomplete domain syntax'),
      網域標籤格式不正確: tr(
        '網域標籤格式不正確',
        'Invalid domain-label syntax',
      ),
      符合本工具的基本格式規則: tr(
        '符合本工具的基本格式規則',
        'Matches this tool’s basic syntax rules',
      ),
      與前一筆標準化地址重複: tr(
        '與前一筆標準化地址重複',
        'Duplicates an earlier normalized address',
      ),
    }[reason] ?? reason
  );
}

export default function EmailCheckCalculator() {
  const { tr } = useToolLanguage();
  const [input, setInput] = useState(example);
  const [submitted, setSubmitted] = useState(false);
  const calculation = useMemo(() => {
    try {
      return { rows: checkEmails(input), error: '' };
    } catch (error) {
      return {
        rows: [],
        error:
          error instanceof Error
            ? error.message
            : tr('無法檢查地址。', 'Unable to check addresses.'),
      };
    }
  }, [input, tr]);
  const { rows, error } = calculation;
  const output = csvRows([
    [
      tr('列', 'Line'),
      tr('輸入', 'Input'),
      tr('標準化', 'Normalized'),
      tr('分類', 'Status'),
      tr('原因', 'Reason'),
    ],
    ...rows.map((row) => [
      row.line,
      row.input,
      row.normalized,
      row.status,
      reasonLabel(row.reason, tr),
    ]),
  ]);
  return (
    <ToolPanel
      notes={
        <Notice>
          {tr(
            '只檢查文字格式與重複；不發送郵件、不查 SMTP 或 MX，也不表示地址存在、可收信或適合寄送。',
            'Checks text syntax and duplicates only. It sends no mail, checks no SMTP or MX, and does not indicate existence, deliverability, or suitability for sending.',
          )}
        </Notice>
      }
      result={
        submitted ? (
          error ? (
            <Notice>{error}</Notice>
          ) : (
            <div>
              <p>
                {tr(
                  `有效 ${rows.filter((row) => row.status === 'valid').length}、重複 ${rows.filter((row) => row.status === 'duplicate').length}、需確認 ${rows.filter((row) => row.status === 'review').length}、錯誤 ${rows.filter((row) => row.status === 'invalid').length}。`,
                  `Valid ${rows.filter((row) => row.status === 'valid').length}, duplicate ${rows.filter((row) => row.status === 'duplicate').length}, review ${rows.filter((row) => row.status === 'review').length}, invalid ${rows.filter((row) => row.status === 'invalid').length}.`,
                )}
              </p>
              <p className="table-scroll-hint">
                {tr(
                  '欄位超出畫面時，可左右捲動表格查看。',
                  'Scroll the table horizontally to see columns beyond the viewport.',
                )}
              </p>
              <div className="email-result-scroll">
                <table
                  className="email-result-table"
                  aria-label={tr('Email 檢查結果', 'Email check results')}
                >
                  <thead>
                    <tr>
                      <th>{tr('列', 'Line')}</th>
                      <th>{tr('輸入', 'Input')}</th>
                      <th>{tr('標準化', 'Normalized')}</th>
                      <th>{tr('分類', 'Status')}</th>
                      <th>{tr('原因', 'Reason')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.line} data-status={row.status}>
                        <td>{row.line}</td>
                        <td>{row.input}</td>
                        <td>{row.normalized}</td>
                        <td>{statusLabel(row, tr)}</td>
                        <td>{reasonLabel(row.reason, tr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="action-row">
                <CopyButton text={output} label={tr('複製 CSV', 'Copy CSV')} />
                <button
                  type="button"
                  className="action secondary"
                  onClick={() =>
                    downloadText(
                      output,
                      'email-check.csv',
                      'text/csv;charset=utf-8',
                    )
                  }
                >
                  {tr('下載 CSV', 'Download CSV')}
                </button>
              </div>
            </div>
          )
        ) : (
          <Notice>
            {tr(
              '貼上每行一個 Email 後按「檢查格式」。',
              'Paste one email per line, then select “Check syntax”.',
            )}
          </Notice>
        )
      }
    >
      {' '}
      <div className="tool-field">
        <label htmlFor="email-check-input">
          {tr('Email 清單（每行一個）', 'Email list (one per line)')}
        </label>
        <textarea
          id="email-check-input"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setSubmitted(false);
          }}
          rows={10}
          spellCheck={false}
        />
      </div>
      <div className="action-row">
        <button
          type="button"
          className="action"
          onClick={() => setSubmitted(true)}
        >
          {tr('檢查格式', 'Check syntax')}
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            setInput(example);
            setSubmitted(false);
          }}
        >
          {tr('載入範例', 'Load example')}
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            setInput('');
            setSubmitted(false);
          }}
        >
          {tr('清空', 'Clear')}
        </button>
      </div>
    </ToolPanel>
  );
}
