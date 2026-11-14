'use client';

import { useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import { maskData, type MaskSummary } from '@/lib/tools/data-mask';
import { downloadText } from '@/lib/tools/text-export';
import { CopyButton, Notice, ToolPanel } from '../_components/controls';

const example =
  '聯絡人：王小明\nEmail：alice@example.com\n電話：0912-345-678\n識別碼：A123456789\n專案：專案甲';

export default function DataMaskCalculator() {
  const { tr } = useToolLanguage();
  const [text, setText] = useState(example);
  const [customTerms, setCustomTerms] = useState('王小明\n專案甲');
  const [emails, setEmails] = useState(true);
  const [phones, setPhones] = useState(true);
  const [identifiers, setIdentifiers] = useState(true);
  const [result, setResult] = useState<MaskSummary | null>(null);
  const [error, setError] = useState('');
  function preview() {
    try {
      setResult(maskData(text, { emails, phones, identifiers, customTerms }));
      setError('');
    } catch (error) {
      setResult(null);
      setError(
        error instanceof Error
          ? error.message
          : tr('無法遮罩文字。', 'Unable to mask text.'),
      );
    }
  }
  function clear() {
    setText('');
    setCustomTerms('');
    setResult(null);
    setError('');
  }
  return (
    <ToolPanel
      notes={
        <Notice>
          {tr(
            '遮罩只依選定規則尋找可辨識模式，請在分享前逐行人工覆核。它不是完整匿名化、法律合規或風險評估。',
            'Masking only finds recognisable patterns under the selected rules. Review every line before sharing; it is not complete anonymisation, legal compliance, or a risk assessment.',
          )}
        </Notice>
      }
      result={
        result ? (
          <div>
            <p>
              {tr(
                `已遮罩：Email ${result.emails}、電話 ${result.phones}、識別碼 ${result.identifiers}、自訂文字 ${result.custom}。`,
                `Masked: ${result.emails} email, ${result.phones} phone, ${result.identifiers} identifier, ${result.custom} custom term.`,
              )}
            </p>
            <label htmlFor="data-mask-output">
              {tr('預覽結果', 'Preview result')}
            </label>
            <textarea
              id="data-mask-output"
              readOnly
              value={result.text}
              rows={8}
            />
            <div className="action-row">
              <CopyButton
                text={result.text}
                label={tr('複製遮罩結果', 'Copy masked result')}
              />
              <button
                type="button"
                className="action secondary"
                onClick={() => downloadText(result.text, 'masked-text.txt')}
              >
                {tr('下載文字檔', 'Download text file')}
              </button>
            </div>
          </div>
        ) : error ? (
          <Notice>{error}</Notice>
        ) : (
          <Notice>
            {tr(
              '設定規則後按「預覽遮罩」。',
              'Set rules, then select “Preview masking”.',
            )}
          </Notice>
        )
      }
    >
      <div className="tool-field">
        <label htmlFor="data-mask-input">{tr('原始文字', 'Source text')}</label>
        <textarea
          id="data-mask-input"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setResult(null);
          }}
          rows={8}
          spellCheck={false}
        />
      </div>
      <fieldset className="password-choices">
        <legend>{tr('遮罩規則', 'Masking rules')}</legend>
        <label>
          <input
            type="checkbox"
            checked={emails}
            onChange={(event) => {
              setEmails(event.target.checked);
              setResult(null);
            }}
          />
          {tr('遮罩 Email', 'Mask email')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={phones}
            onChange={(event) => {
              setPhones(event.target.checked);
              setResult(null);
            }}
          />
          {tr('遮罩電話', 'Mask phone')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={identifiers}
            onChange={(event) => {
              setIdentifiers(event.target.checked);
              setResult(null);
            }}
          />
          {tr('遮罩識別碼', 'Mask identifiers')}
        </label>
      </fieldset>
      <div className="tool-field">
        <label htmlFor="data-mask-custom">
          {tr(
            '自訂要遮罩的文字（每行一筆）',
            'Custom text to mask (one per line)',
          )}
        </label>
        <textarea
          id="data-mask-custom"
          value={customTerms}
          onChange={(event) => {
            setCustomTerms(event.target.value);
            setResult(null);
          }}
          rows={4}
          spellCheck={false}
        />
      </div>
      <div className="action-row">
        <button type="button" className="action" onClick={preview}>
          {tr('預覽遮罩', 'Preview masking')}
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            setText(example);
            setCustomTerms('王小明\n專案甲');
            setResult(null);
          }}
        >
          {tr('載入範例', 'Load example')}
        </button>
        <button type="button" className="action secondary" onClick={clear}>
          {tr('清空', 'Clear')}
        </button>
      </div>
    </ToolPanel>
  );
}
