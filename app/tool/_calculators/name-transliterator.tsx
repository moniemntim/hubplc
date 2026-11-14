'use client';

import { useMemo, useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import {
  transliterateName,
  type NameFormat,
} from '@/lib/tools/name-transliterator';
import { Choice, CopyButton, Notice, ToolPanel } from '../_components/controls';

export default function NameTransliteratorCalculator() {
  const { tr } = useToolLanguage();
  const [name, setName] = useState('王小明');
  const [existing, setExisting] = useState('Wang Hsiao-Ming');
  const [format, setFormat] = useState<NameFormat>('surname-first');
  const [submitted, setSubmitted] = useState(false);
  const draft = useMemo(() => {
    try {
      return { data: transliterateName(name), error: '' };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : tr('無法產生拼音草稿。', 'Unable to draft pinyin.'),
      };
    }
  }, [name, tr]);
  const output = draft.data
    ? format === 'surname-first'
      ? draft.data.surnameFirst
      : draft.data.nameFirst
    : '';
  return (
    <ToolPanel
      notes={
        <Notice>
          {tr(
            '這是漢語拼音草稿，不是護照或其他證件核准拼法。既有證件或本人指定的英文拼寫優先；複姓、多音字與罕見字都要確認。',
            'This is a Hanyu Pinyin draft, not a passport or other document-approved spelling. Existing document or person-provided spelling takes priority; confirm compound surnames, polyphonic characters, and uncommon characters.',
          )}
        </Notice>
      }
      result={
        submitted ? (
          draft.error ? (
            <Notice>{draft.error}</Notice>
          ) : draft.data ? (
            <div>
              <dl className="output-rows">
                <div>
                  <dt>{tr('姓氏／名字', 'Surname / given name')}</dt>
                  <dd>
                    {draft.data.surname}／{draft.data.givenName}
                  </dd>
                </div>
                <div>
                  <dt>{tr('漢語拼音草稿', 'Hanyu Pinyin draft')}</dt>
                  <dd>{output}</dd>
                </div>
                <div>
                  <dt>{tr('既有英文拼寫', 'Existing English spelling')}</dt>
                  <dd>{existing || tr('未提供', 'Not provided')}</dd>
                </div>
              </dl>
              {draft.data.ambiguities.length > 0 && (
                <Notice>
                  <span>
                    {tr(
                      `多音字請確認：${draft.data.ambiguities.map((item) => `${item.character}（${item.readings.join('／')}）`).join('；')}`,
                      `Confirm polyphonic characters: ${draft.data.ambiguities.map((item) => `${item.character} (${item.readings.join(' / ')})`).join('; ')}`,
                    )}
                  </span>
                </Notice>
              )}
              {draft.data.unsupported.length > 0 && (
                <Notice>
                  <span>
                    {tr(
                      `無法作為中文姓名拼音的字元：${draft.data.unsupported.join('、')}`,
                      `Characters not supported as Chinese-name pinyin: ${draft.data.unsupported.join(', ')}`,
                    )}
                  </span>
                </Notice>
              )}
              <CopyButton
                text={output}
                label={tr('複製拼音草稿', 'Copy pinyin draft')}
              />
            </div>
          ) : null
        ) : (
          <Notice>
            {tr(
              '輸入姓名後按「產生草稿」。',
              'Enter a name, then select “Create draft”.',
            )}
          </Notice>
        )
      }
    >
      <div className="tool-field">
        <label htmlFor="name-transliterator-input">
          {tr('中文姓名', 'Chinese name')}
        </label>
        <input
          id="name-transliterator-input"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSubmitted(false);
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <p>
          {tr(
            '可輸入「歐陽娜娜」自動辨識常見複姓，或以「歐陽,娜娜」明確分隔。',
            'Enter “歐陽娜娜” for common compound-surname detection, or use “歐陽,娜娜” to separate explicitly.',
          )}
        </p>
      </div>
      <div className="tool-field">
        <label htmlFor="name-transliterator-existing">
          {tr('既有英文拼寫（可編輯）', 'Existing English spelling (editable)')}
        </label>
        <input
          id="name-transliterator-existing"
          value={existing}
          onChange={(event) => setExisting(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <Choice
        label={tr('輸出格式', 'Output format')}
        value={format}
        onChange={(value) => {
          setFormat(value as NameFormat);
          setSubmitted(false);
        }}
        options={[
          {
            value: 'surname-first',
            label: tr('姓氏在前、大寫姓氏', 'Surname first, uppercase surname'),
          },
          {
            value: 'name-first',
            label: tr(
              '名字在前、大寫姓氏',
              'Given name first, uppercase surname',
            ),
          },
        ]}
      />
      <div className="action-row">
        <button
          type="button"
          className="action"
          onClick={() => setSubmitted(true)}
        >
          {tr('產生草稿', 'Create draft')}
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            setName('王小明');
            setExisting('Wang Hsiao-Ming');
            setFormat('surname-first');
            setSubmitted(false);
          }}
        >
          {tr('載入範例', 'Load example')}
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            setName('');
            setExisting('');
            setSubmitted(false);
          }}
        >
          {tr('清空', 'Clear')}
        </button>
      </div>
    </ToolPanel>
  );
}
