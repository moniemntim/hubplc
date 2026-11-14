'use client';

import { useMemo, useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import { formatNumber } from '@/lib/tools/core';
import { translateToolMessage } from '@/lib/tools/error-i18n';
import { csvRows, downloadText } from '@/lib/tools/text-export';
import { unitWorkflows } from '@/lib/tools/unit-workflows';
import { WorkflowError } from '@/lib/tools/unit-workflows/shared';
import type {
  UnitWorkflow as Definition,
  WorkflowText,
} from '@/lib/tools/unit-workflows/types';
import {
  Choice,
  CopyButton,
  Notice,
  NumberField,
  ResultRows,
  ToolPanel,
} from '../_components/controls';
import './unit-workflow.css';

function initialValues(workflow: Definition) {
  return Object.fromEntries(
    workflow.fields.map((field) => [field.key, field.defaultValue]),
  );
}
export default function UnitWorkflow({ group }: { group: string }) {
  const workflow = unitWorkflows.find((item) => item.group === group);
  return workflow ? <Application key={group} workflow={workflow} /> : null;
}
function Application({ workflow }: { workflow: Definition }) {
  const { tr, locale } = useToolLanguage();
  const text = (value: WorkflowText) => tr(value.zh, value.en);
  const [input, setInput] = useState(() => initialValues(workflow));
  const calculation = useMemo(() => {
    try {
      return { data: workflow.calculate(input), error: '' };
    } catch (error) {
      return {
        data: undefined,
        error:
          error instanceof WorkflowError
            ? tr(error.message, error.en)
            : error instanceof Error
              ? translateToolMessage(error.message, locale)
              : tr(
                  '無法完成應用計算，請檢查輸入。',
                  'Unable to calculate this application. Check the input.',
                ),
      };
    }
  }, [workflow, input, tr, locale]);
  const rows = calculation.data?.map((item) => ({
    label: text(item.label),
    value:
      typeof item.value === 'object'
        ? text(item.value)
        : typeof item.value === 'number'
          ? Number.isSafeInteger(item.value)
            ? item.value.toLocaleString('en-US')
            : formatNumber(item.value)
          : item.value,
    unit: item.unit,
  }));
  const exportText = rows
    ? csvRows([
        [text(workflow.title)],
        [tr('輸入條件', 'Inputs'), tr('數值', 'Value'), tr('單位', 'Unit')],
        ...workflow.fields.map((field) => [
          text(field.label),
          field.options
            ? text(
                field.options.find(
                  (option) => option.value === input[field.key],
                )?.label ?? { zh: input[field.key], en: input[field.key] },
              )
            : Number(input[field.key]),
          field.unit ?? '',
        ]),
        [tr('計算項目', 'Result'), tr('數值', 'Value'), tr('單位', 'Unit')],
        ...calculation.data!.map((item) => [
          text(item.label),
          typeof item.value === 'object' ? text(item.value) : item.value,
          item.unit ?? '',
        ]),
      ])
    : '';
  return (
    <section className="unit-workflow" aria-labelledby="unit-workflow-title">
      <header className="unit-workflow-heading">
        <p className="eyebrow">{tr('應用任務', 'PRACTICAL TASK')}</p>
        <h2 id="unit-workflow-title">{text(workflow.title)}</h2>
        <p>{text(workflow.description)}</p>
      </header>
      <ToolPanel
        inputLabel={tr('應用計算條件', 'Application inputs')}
        resultLabel={tr('應用計算結果', 'Application results')}
        result={
          <div className="workflow-result">
            {rows ? (
              <ResultRows rows={rows} />
            ) : (
              <Notice>{calculation.error}</Notice>
            )}
          </div>
        }
        notes={
          <>
            {workflow.notes.map((note) => (
              <p key={note.en}>{text(note)}</p>
            ))}
            <p className="unit-workflow-sources">
              {tr('定義與計算依據：', 'Definitions and calculation basis: ')}
              {workflow.sources.map((source, index) => (
                <span key={source.url}>
                  {index > 0 && ' · '}
                  <a href={source.url}>{text(source.label)}</a>
                </span>
              ))}
            </p>
          </>
        }
      >
        <div className="fields-grid">
          {workflow.fields.map((field) => (
            <div key={field.key}>
              {field.options ? (
                <Choice
                  label={text(field.label)}
                  value={input[field.key]}
                  onChange={(value) =>
                    setInput((previous) => ({
                      ...previous,
                      [field.key]: value,
                    }))
                  }
                  options={field.options.map((option) => ({
                    value: option.value,
                    label: text(option.label),
                  }))}
                />
              ) : (
                <NumberField
                  label={text(field.label)}
                  value={input[field.key]}
                  unit={field.unit}
                  onChange={(value) =>
                    setInput((previous) => ({
                      ...previous,
                      [field.key]: value,
                    }))
                  }
                />
              )}
              {field.hint && (
                <p className="unit-workflow-hint">{text(field.hint)}</p>
              )}
            </div>
          ))}
        </div>
        <div className="action-row">
          <button
            type="button"
            className="action secondary"
            onClick={() => setInput(initialValues(workflow))}
          >
            {tr('載入應用範例', 'Load application example')}
          </button>
          <button
            type="button"
            className="action secondary"
            onClick={() =>
              setInput(
                Object.fromEntries(
                  workflow.fields.map((field) => [
                    field.key,
                    field.options ? field.defaultValue : '',
                  ]),
                ),
              )
            }
          >
            {tr('清空應用條件', 'Clear application inputs')}
          </button>
          <button
            type="button"
            className="action secondary"
            disabled={!rows}
            onClick={() =>
              downloadText(
                exportText,
                `hubplc-${workflow.group}-application.csv`,
                'text/csv;charset=utf-8',
              )
            }
          >
            {tr('下載應用 CSV', 'Download application CSV')}
          </button>
        </div>
        <CopyButton
          text={exportText}
          label={tr('複製應用結果', 'Copy application results')}
          disabled={!rows}
        />
      </ToolPanel>
    </section>
  );
}
