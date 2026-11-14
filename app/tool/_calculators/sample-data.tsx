'use client';

import { useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import {
  generateSampleProfiles,
  generateUniqueCodes,
  type CodeAlphabet,
  type SampleProfile,
} from '@/lib/tools/sample-data';
import { csvRows, downloadText } from '@/lib/tools/text-export';
import {
  Choice,
  CopyButton,
  Notice,
  NumberField,
  ToolActions,
  ToolPanel,
} from '../_components/controls';
import './sample-data.css';

export type SampleDataKind = 'random-codes' | 'sample-data';
type Output = string[] | SampleProfile[];

const codeExample = {
  prefix: 'LAB-',
  length: '6',
  count: '10',
  alphabet: 'alphanumeric' as CodeAlphabet,
};
const profileExample = { count: '3' };

function isProfiles(
  output: Output,
  kind: SampleDataKind,
): output is SampleProfile[] {
  return (
    kind === 'sample-data' && output.length > 0 && typeof output[0] !== 'string'
  );
}

export default function SampleDataCalculator({
  kind,
}: {
  kind: SampleDataKind;
}) {
  const { tr } = useToolLanguage();
  const [prefix, setPrefix] = useState(codeExample.prefix);
  const [length, setLength] = useState(codeExample.length);
  const [count, setCount] = useState(
    kind === 'random-codes' ? codeExample.count : profileExample.count,
  );
  const [alphabet, setAlphabet] = useState<CodeAlphabet>(codeExample.alphabet);
  const [output, setOutput] = useState<Output | null>(null);
  const [error, setError] = useState('');
  const invalidate = () => {
    setOutput(null);
    setError('');
  };
  const run = () => {
    try {
      const next =
        kind === 'random-codes'
          ? generateUniqueCodes({
              prefix,
              length: Number(length),
              count: Number(count),
              alphabet,
            })
          : generateSampleProfiles(Number(count));
      setOutput(next);
      setError('');
    } catch (caught) {
      setOutput(null);
      setError(
        caught instanceof Error
          ? caught.message
          : tr('無法產生測試資料。', 'Unable to generate test data.'),
      );
    }
  };
  const profiles = output && isProfiles(output, kind) ? output : null;
  const codes = output && !profiles ? (output as string[]) : null;
  const csv = codes
    ? csvRows([
        [tr('序號', 'Number'), tr('代碼', 'Code')],
        ...codes.map((code, index) => [index + 1, code]),
      ])
    : profiles
      ? csvRows([
          ['id', 'name', 'role', 'email'],
          ...profiles.map((row) => [row.id, row.name, row.role, row.email]),
        ])
      : '';
  const json = codes
    ? JSON.stringify(codes, null, 2)
    : profiles
      ? JSON.stringify(profiles, null, 2)
      : '';
  const filename =
    kind === 'random-codes' ? 'test-codes' : 'synthetic-test-data';
  const result = output ? (
    <div>
      <p>
        {tr(
          `已產生 ${output.length} 筆；變更任何輸入會清除這次結果。`,
          `Generated ${output.length} row(s); changing any input clears this result.`,
        )}
      </p>
      <p className="table-scroll-hint">
        {tr(
          '欄位超出畫面時，可左右捲動表格查看。',
          'Scroll the table horizontally to see columns beyond the viewport.',
        )}
      </p>
      <div className="sample-data-scroll">
        <table aria-label={tr('產生結果', 'Generated results')}>
          <thead>
            <tr>
              {codes ? (
                <>
                  <th scope="col">{tr('序號', 'Number')}</th>
                  <th scope="col">{tr('代碼', 'Code')}</th>
                </>
              ) : (
                <>
                  <th scope="col">ID</th>
                  <th scope="col">{tr('虛構名稱', 'Synthetic name')}</th>
                  <th scope="col">{tr('用途', 'Purpose')}</th>
                  <th scope="col">Email</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {codes
              ? codes.map((code, index) => (
                  <tr key={code}>
                    <th scope="row">{index + 1}</th>
                    <td>{code}</td>
                  </tr>
                ))
              : profiles?.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.id}</th>
                    <td>{row.name}</td>
                    <td>{row.role}</td>
                    <td>{row.email}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <div className="action-row">
        <CopyButton text={csv} label={tr('複製 CSV', 'Copy CSV')} />
        <CopyButton text={json} label={tr('複製 JSON', 'Copy JSON')} />
        <button
          type="button"
          className="action secondary"
          onClick={() =>
            downloadText(csv, `${filename}.csv`, 'text/csv;charset=utf-8')
          }
        >
          {tr('下載 CSV', 'Download CSV')}
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() =>
            downloadText(
              json,
              `${filename}.json`,
              'application/json;charset=utf-8',
            )
          }
        >
          {tr('下載 JSON', 'Download JSON')}
        </button>
      </div>
    </div>
  ) : error ? (
    <Notice>{error}</Notice>
  ) : (
    <Notice>
      {tr(
        '設定後按「產生資料」。變更輸入後不會保留舊結果。',
        'Set options, then select “Generate data”. Changing input does not retain old results.',
      )}
    </Notice>
  );
  return (
    <ToolPanel
      result={result}
      notes={
        <Notice>
          {kind === 'random-codes'
            ? tr(
                '代碼使用瀏覽器安全亂數產生，僅保證本次結果互不重複；不是密碼、授權碼或可驗證的抽獎紀錄。',
                'Codes use browser secure randomness and are unique only within this generated result; they are not passwords, authorization tokens, or a verifiable draw record.',
              )
            : tr(
                '所有名稱、角色與 Email 都是合成測試資料：ID 一律以 TEST- 開頭，Email 一律使用 example.invalid。本站不查詢真實身分，也不宣稱虛構值不可能與真人或既有資料相同。',
                'All names, roles, and emails are synthetic test data: every ID starts with TEST- and every email uses example.invalid. This site performs no real-person lookup and does not claim that fictional values cannot match a person or existing data.',
              )}
        </Notice>
      }
    >
      {kind === 'random-codes' ? (
        <>
          <div className="fields-grid">
            <NumberField
              label={tr('產生數量（1–1000）', 'Count (1–1000)')}
              value={count}
              onChange={(value) => {
                setCount(value);
                invalidate();
              }}
            />
            <NumberField
              label={tr(
                '代碼長度（不含前綴，2–32）',
                'Code length (without prefix, 2–32)',
              )}
              value={length}
              onChange={(value) => {
                setLength(value);
                invalidate();
              }}
            />
          </div>
          <Choice
            label={tr('字元集', 'Character set')}
            value={alphabet}
            onChange={(value) => {
              setAlphabet(value as CodeAlphabet);
              invalidate();
            }}
            options={[
              {
                value: 'alphanumeric',
                label: tr(
                  '英數（避開易混淆字元）',
                  'Alphanumeric (unambiguous)',
                ),
              },
              {
                value: 'uppercase',
                label: tr('大寫英文', 'Uppercase letters'),
              },
              { value: 'digits', label: tr('數字', 'Digits') },
            ]}
          />
          <div className="tool-field">
            <label htmlFor="code-prefix">
              {tr('前綴（可留空）', 'Prefix (optional)')}
            </label>
            <input
              id="code-prefix"
              value={prefix}
              maxLength={32}
              onChange={(event) => {
                setPrefix(event.target.value);
                invalidate();
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </>
      ) : (
        <NumberField
          label={tr('產生數量（1–1000）', 'Count (1–1000)')}
          value={count}
          onChange={(value) => {
            setCount(value);
            invalidate();
          }}
        />
      )}
      <div className="action-row">
        <button type="button" className="action" onClick={run}>
          {tr('產生資料', 'Generate data')}
        </button>
      </div>
      <ToolActions
        onExample={() => {
          if (kind === 'random-codes') {
            setPrefix(codeExample.prefix);
            setLength(codeExample.length);
            setCount(codeExample.count);
            setAlphabet(codeExample.alphabet);
          } else setCount(profileExample.count);
          invalidate();
        }}
        onClear={() => {
          setPrefix('');
          setLength('');
          setCount('');
          invalidate();
        }}
      />
    </ToolPanel>
  );
}
