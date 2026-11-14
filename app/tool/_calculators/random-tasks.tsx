'use client';

import { useMemo, useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import { csvRows, downloadText } from '@/lib/tools/text-export';
import { attempt } from '@/lib/tools/core';
import {
  drawParticipants,
  makeGiftExchange,
  makeGroups,
  parseParticipants,
} from '@/lib/tools/random-tasks';
import {
  Choice,
  CopyButton,
  Notice,
  NumberField,
  ResultRows,
  TextField,
  ToolActions,
  ToolPanel,
} from '../_components/controls';

export type RandomTaskKind = 'random-draw' | 'random-groups' | 'gift-exchange';
const exampleNames = '王小明\n李小華\n陳小美\n林大同\n張雅婷\n黃志強';

export default function RandomTasks({ kind }: { kind: RandomTaskKind }) {
  const { tr } = useToolLanguage();
  const [names, setNames] = useState(exampleNames),
    [count, setCount] = useState('1'),
    [repeat, setRepeat] = useState('no'),
    [weighted, setWeighted] = useState('no'),
    [groupMode, setGroupMode] = useState<'count' | 'size' | 'pairs'>('count'),
    [groupAmount, setGroupAmount] = useState('2'),
    [snapshot, setSnapshot] = useState<string[][] | null>(null),
    [gift, setGift] = useState<{ giver: string; receiver: string }[] | null>(
      null,
    ),
    [person, setPerson] = useState(''),
    [runError, setRunError] = useState('');
  const parsed = useMemo(
    () =>
      attempt(() =>
        parseParticipants(names, kind === 'random-draw' && weighted === 'yes'),
      ),
    [names, kind, weighted],
  );
  const invalidate = (value: string) => {
    setNames(value);
    setSnapshot(null);
    setGift(null);
    setRunError('');
  };
  const run = () => {
    if (!parsed.data) return;
    try {
      setRunError('');
      if (kind === 'random-draw') {
        const picks = drawParticipants(
          parsed.data,
          Number(count),
          repeat === 'yes',
        );
        setSnapshot(picks.map((pick) => [pick.name]));
        setGift(null);
      } else if (kind === 'random-groups') {
        setSnapshot(
          makeGroups(
            parsed.data.map((entry) => entry.name),
            groupMode,
            Number(groupAmount),
          ),
        );
        setGift(null);
      } else {
        const assignments = makeGiftExchange(
          parsed.data.map((entry) => entry.name),
        );
        setGift(assignments);
        setSnapshot(null);
        setPerson(assignments[0]?.giver ?? '');
      }
    } catch (error) {
      setSnapshot(null);
      setGift(null);
      setRunError(error instanceof Error ? error.message : '無法產生結果。');
    }
  };
  const rows =
    snapshot?.map((group, index) => [
      kind === 'random-draw'
        ? `${tr('第', 'Pick ')}${index + 1}`
        : `${tr('第', 'Group ')}${index + 1}${kind === 'random-groups' ? tr(' 組', '') : ''}`,
      group.join('、'),
    ]) ?? [];
  const exportRows = gift
    ? [
        ['giver', 'receiver'],
        ...gift.map((item) => [item.giver, item.receiver]),
      ]
    : kind === 'random-groups'
      ? [
          ['group', 'member'],
          ...(snapshot ?? []).flatMap((group, index) =>
            group.map((name) => [String(index + 1), name]),
          ),
        ]
      : [['result', 'names'], ...rows];
  const result =
    parsed.error || runError ? (
      <Notice>{parsed.error ?? runError}</Notice>
    ) : gift ? (
      <>
        <ResultRows
          rows={
            person
              ? [
                  { label: tr('目前查看', 'Viewing'), value: person },
                  {
                    label: tr('你的收禮對象', 'Your recipient'),
                    value:
                      gift.find((item) => item.giver === person)?.receiver ??
                      '',
                  },
                ]
              : []
          }
        />
        <div className="fields-grid">
          <Choice
            label={tr(
              '個別查看（非身分驗證）',
              'Individual view (not identity-verified)',
            )}
            value={person}
            onChange={setPerson}
            options={gift.map((item) => ({
              value: item.giver,
              label: item.giver,
            }))}
          />
        </div>
        <details>
          <summary>{tr('主辦人完整名單', 'Organizer full list')}</summary>
          <ResultRows
            rows={gift.map((item) => ({
              label: item.giver,
              value: item.receiver,
            }))}
          />
        </details>
      </>
    ) : snapshot ? (
      <ResultRows rows={rows.map(([label, value]) => ({ label, value }))} />
    ) : (
      <Notice>
        {tr(
          '設定後按「產生結果」。每次輸入變更都會清除舊結果。',
          'Set options and select Generate. Changing input clears the previous result.',
        )}
      </Notice>
    );
  return (
    <ToolPanel
      result={result}
      notes={
        <>
          {tr(
            '使用瀏覽器的安全亂數產生結果；名稱與結果只留在目前瀏覽器工作階段。結果是一次抽樣快照，不主張可驗證的公平性。',
            'Results use browser secure randomness; names and results remain in this browser session. A result is a one-time snapshot and is not a verifiable fairness claim.',
          )}
        </>
      }
    >
      <TextField
        label={tr('參與者（每行一位）', 'Participants (one per line)')}
        value={names}
        onChange={invalidate}
        multiline
      />
      {kind === 'random-draw' && (
        <>
          <Choice
            label={tr('啟用權重', 'Use weights')}
            value={weighted}
            onChange={(value) => {
              setWeighted(value);
              setSnapshot(null);
            }}
            options={[
              { value: 'no', label: tr('否', 'No') },
              {
                value: 'yes',
                label: tr('是；名稱 | 正整數', 'Yes; name | positive integer'),
              },
            ]}
          />
          <NumberField
            label={tr('抽取數量', 'Pick count')}
            value={count}
            onChange={(value) => {
              setCount(value);
              setSnapshot(null);
            }}
          />
          <Choice
            label={tr('重複抽取', 'Allow repeats')}
            value={repeat}
            onChange={(value) => {
              setRepeat(value);
              setSnapshot(null);
            }}
            options={[
              { value: 'no', label: tr('不重複', 'Without replacement') },
              { value: 'yes', label: tr('可重複', 'With replacement') },
            ]}
          />
        </>
      )}
      {kind === 'random-groups' && (
        <>
          <Choice
            label={tr('分組方式', 'Grouping mode')}
            value={groupMode}
            onChange={(value) => {
              setGroupMode(value as typeof groupMode);
              setSnapshot(null);
            }}
            options={[
              { value: 'count', label: tr('指定組數', 'Number of groups') },
              { value: 'size', label: tr('指定每組人數', 'Group size') },
              {
                value: 'pairs',
                label: tr(
                  '兩兩配對（奇數最後一組一人）',
                  'Pairs (odd participant is left over)',
                ),
              },
            ]}
          />
          {groupMode !== 'pairs' && (
            <NumberField
              label={
                groupMode === 'count'
                  ? tr('組數', 'Group count')
                  : tr('每組人數', 'Group size')
              }
              value={groupAmount}
              onChange={(value) => {
                setGroupAmount(value);
                setSnapshot(null);
              }}
            />
          )}
        </>
      )}
      {kind === 'gift-exchange' && (
        <Notice>
          {tr(
            '每位參與者恰好送出一次、收到一次，且不會抽到自己；可切換顯示一人的收禮對象，但這不是身分驗證或私密傳遞，本頁也不寄送通知。',
            'Everyone gives once, receives once, and never draws themselves. Individual view is not identity verification or private delivery, and this page sends no notifications.',
          )}
        </Notice>
      )}
      <div className="tool-actions">
        <button type="button" className="action" onClick={run}>
          {tr('產生結果', 'Generate result')}
        </button>
        {(snapshot || gift) && (
          <button
            type="button"
            className="action secondary"
            onClick={() =>
              downloadText(
                csvRows(exportRows),
                `${kind}.csv`,
                'text/csv;charset=utf-8',
              )
            }
          >
            {tr('下載 CSV', 'Download CSV')}
          </button>
        )}
      </div>
      <CopyButton
        text={csvRows(exportRows)}
        label={tr('複製 CSV', 'Copy CSV')}
        disabled={!snapshot && !gift}
      />
      <ToolActions
        onExample={() => {
          invalidate(exampleNames);
          setCount('1');
          setRepeat('no');
          setWeighted('no');
          setGroupMode('count');
          setGroupAmount('2');
        }}
        onClear={() => {
          invalidate('');
          setGift(null);
        }}
      />
    </ToolPanel>
  );
}
