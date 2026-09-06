'use client';

import { useId, useState, type ReactNode } from 'react';
import { formatNumber } from '@/lib/tools/core';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function NumberField({
  label,
  value,
  onChange,
  unit,
}: FieldProps & { unit?: string }) {
  const id = useId();
  return (
    <div className="tool-field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {unit && <span>{unit}</span>}
      </div>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  multiline,
  type = 'text',
}: FieldProps & { multiline?: boolean; type?: string }) {
  const id = useId();
  return (
    <div className="tool-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      )}
    </div>
  );
}

export function Choice({
  label,
  value,
  onChange,
  options,
}: FieldProps & { options: readonly { value: string; label: string }[] }) {
  const id = useId();
  return (
    <div className="tool-field">
      <label id={id}>{label}</label>
      <Select
        value={value}
        items={options}
        onValueChange={(next) => {
          if (typeof next === 'string') onChange(next);
        }}
      >
        <SelectTrigger className="tool-select" aria-labelledby={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="tool-select-popup"
          alignItemWithTrigger={false}
        >
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ToolPanel({
  children,
  result,
  notes,
  diagram,
}: {
  children: ReactNode;
  result: ReactNode;
  notes: ReactNode;
  diagram?: ReactNode;
}) {
  return (
    <div className="calculator">
      <div className="calculator-grid">
        <section className="calculator-inputs" aria-label="輸入條件">
          {children}
        </section>
        <section
          className="result tool-result"
          aria-label="計算結果"
          aria-live="polite"
        >
          <p className="eyebrow">RESULT / 計算結果</p>
          {result}
        </section>
      </div>
      {diagram && <div className="tool-diagram">{diagram}</div>}
      <div className="tool-foot">
        <span>公式與說明</span>
        <div>{notes}</div>
      </div>
    </div>
  );
}

export function ResultRows({
  rows,
}: {
  rows: readonly { label: string; value: string | number; unit?: string }[];
}) {
  return (
    <dl className="output-rows">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>
            {typeof row.value === 'number'
              ? formatNumber(row.value)
              : row.value}
            {row.unit && <small> {row.unit}</small>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <output className="tool-notice">{children}</output>;
}

export function CopyButton({
  text,
  label = '複製結果',
  disabled = false,
}: {
  text: string;
  label?: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }
  return (
    <div className="copy-control">
      <button
        type="button"
        className="action secondary"
        onClick={copy}
        disabled={disabled || !text}
      >
        {copied === text ? '已複製 ✓' : label}
      </button>
      {failed && <output>無法存取剪貼簿，請選取結果後手動複製。</output>}
    </div>
  );
}
