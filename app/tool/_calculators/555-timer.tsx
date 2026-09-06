'use client';
import { useState } from 'react';
import { QuantityField } from '@/app/tool/_components/quantity';
import {
  electricalFormat,
  timer555Astable,
  timer555AstableInverse,
  timer555Mono,
  timer555MonoInverse,
} from '@/lib/tools/electrical';
import { attempt } from '@/lib/tools/core';
import {
  NumberField,
  Choice,
  ToolPanel,
  ResultRows,
  Notice,
  DiagramPart,
  ToolActions,
} from '@/app/tool/_components/controls';
function Circuit({
  type,
  values,
}: {
  type: string;
  values?: { ra?: number; rb?: number; c?: number };
}) {
  const mono = type === 'mono';
  return (
    <svg
      className="timer-schematic"
      viewBox="0 0 400 285"
      aria-label={mono ? '555 單穩態標準電路' : '555 無穩態標準電路'}
    >
      <title>
        {mono
          ? '單穩態：R 接電源與 7、6 腳，C 接地，2 腳輸入負脈衝'
          : '無穩態：RA 接電源與 7 腳，RB 接 7 與 6、2 腳，C 接地'}
      </title>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="160" y="65" width="140" height="165" rx="5" />
        <path d="M60 40V20H255V65M205 20V65M60 75V115M60 100H160M60 140V180M60 160H160M46 180H74M46 187H74M60 187V250H340V221M326 221H354M326 214H354M340 214V200H300M220 230V260M208 260H232M212 266H228M216 272H224M300 115H378" />
        <rect x="53" y="40" width="14" height="35" />
        {mono ? (
          <path d="M60 115V140M110 200H160" />
        ) : (
          <>
            <rect x="53" y="115" width="14" height="25" />
            <path d="M100 160V200H160" />
          </>
        )}
      </g>
      <g fill="currentColor">
        <circle cx="60" cy="100" r="3" />
        <circle cx="60" cy="160" r="3" />
        {!mono && <circle cx="100" cy="160" r="3" />}
        <circle cx="205" cy="20" r="3" />
      </g>
      <g fontSize="12" fill="currentColor">
        <text x="112" y="14">
          VCC
        </text>
        <DiagramPart field={mono ? 'R' : 'RA'}>
          <text x="77" y="60">
            {mono ? 'R' : 'RA (R1)'}{' '}
            {values?.ra ? `${electricalFormat(values.ra)} Ω` : ''}
          </text>
        </DiagramPart>
        {!mono && (
          <DiagramPart field="RB">
            <text x="77" y="132">
              RB (R2) {values?.rb ? `${electricalFormat(values.rb)} Ω` : ''}
            </text>
          </DiagramPart>
        )}
        <DiagramPart field="C">
          <text x="77" y="190">
            C {values?.c ? `${electricalFormat(values.c)} F` : ''}
          </text>
        </DiagramPart>
        <text x="168" y="104">
          7 DISCH
        </text>
        <text x="168" y="164">
          6 THRES
        </text>
        <text x="168" y="204">
          2 TRIG
        </text>
        <text x="192" y="82">
          8 VCC
        </text>
        <text x="244" y="96">
          4 RESET
        </text>
        <text x="254" y="120">
          3 OUT
        </text>
        <text x="250" y="193">
          5 CONT
        </text>
        <text x="196" y="222">
          1 GND
        </text>
        <text x="207" y="142">
          NE555
        </text>
        {mono && (
          <text x="102" y="221">
            負脈衝
          </text>
        )}
        <text x="344" y="238">
          10 nF
        </text>
        <text x="270" y="278">
          CONT 旁路電容
        </text>
      </g>
    </svg>
  );
}
function Wave({ type, duty }: { type: string; duty?: number }) {
  const h = Number(((150 * (duty ?? 50)) / 100).toFixed(4));
  const path =
    type === 'mono'
      ? 'M10 65H50V25H220V65H380'
      : `M10 65H40V25H${40 + h}V65H190V25H${190 + h}V65H340`;
  return (
    <svg
      viewBox="0 0 400 100"
      aria-label={
        type === 'mono'
          ? '單次高電位輸出脈衝'
          : '兩個週期的輸出波形，占空比依計算結果繪製'
      }
    >
      <title>555 輸出波形</title>
      <DiagramPart field={type === 'mono' ? '目標時間' : '目標頻率'}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
      </DiagramPart>
      <text x="10" y="16">
        OUT
      </text>
      <text x="365" y="90">
        時間 →
      </text>
      {type === 'mono' ? (
        <text x="125" y="90">
          t
        </text>
      ) : (
        <>
          <DiagramPart field="目標占空比">
            <text x={40 + h / 2} y="90">
              tH
            </text>
            <text x={40 + h + (150 - h) / 2} y="90">
              tL
            </text>
          </DiagramPart>
        </>
      )}
    </svg>
  );
}
export default function Timer555() {
  const [type, setType] = useState('astable'),
    [inverse, setInverse] = useState('forward'),
    [ra, setRa] = useState('10000'),
    [rb, setRb] = useState('10000'),
    [c, setC] = useState('0.000001'),
    [time, setTime] = useState('.01'),
    [freq, setFreq] = useState('72'),
    [duty, setDuty] = useState('66.7');
  const example = () => {
    setType('astable');
    setInverse('forward');
    setRa('10000');
    setRb('10000');
    setC('0.000001');
    setTime('.01');
    setFreq('72');
    setDuty('66.7');
  };
  const clear = () => {
    setRa('');
    setRb('');
    setC('');
    setTime('');
    setFreq('');
    setDuty('');
  };
  const monoForward = attempt(() => timer555Mono(ra, c)),
    monoInverse = attempt(() => timer555MonoInverse(time, c)),
    astableForward = attempt(() => timer555Astable(ra, rb, c)),
    astableInverse = attempt(() => timer555AstableInverse(freq, duty, c));
  const active =
    type === 'mono'
      ? inverse === 'forward'
        ? monoForward
        : monoInverse
      : inverse === 'forward'
        ? astableForward
        : astableInverse;
  const result =
    type === 'mono' ? (
      inverse === 'forward' ? (
        monoForward.data ? (
          <ResultRows
            rows={[
              {
                label: '脈衝時間',
                value: electricalFormat(monoForward.data.time),
                unit: 's',
              },
            ]}
          />
        ) : (
          <Notice>{monoForward.error}</Notice>
        )
      ) : monoInverse.data ? (
        <ResultRows
          rows={[
            {
              label: '所需 R',
              value: electricalFormat(monoInverse.data.r),
              unit: 'Ω',
            },
          ]}
        />
      ) : (
        <Notice>{monoInverse.error}</Notice>
      )
    ) : inverse === 'forward' ? (
      astableForward.data ? (
        <ResultRows
          rows={[
            {
              label: '頻率',
              value: electricalFormat(astableForward.data.frequency),
              unit: 'Hz',
            },
            {
              label: '週期',
              value: electricalFormat(astableForward.data.period),
              unit: 's',
            },
            {
              label: '高電位時間',
              value: electricalFormat(astableForward.data.high),
              unit: 's',
            },
            {
              label: '低電位時間',
              value: electricalFormat(astableForward.data.low),
              unit: 's',
            },
            {
              label: '占空比',
              value: electricalFormat(astableForward.data.duty),
              unit: '%',
            },
          ]}
        />
      ) : (
        <Notice>{astableForward.error}</Notice>
      )
    ) : astableInverse.data ? (
      <ResultRows
        rows={[
          {
            label: 'RA',
            value: electricalFormat(astableInverse.data.ra),
            unit: 'Ω',
          },
          {
            label: 'RB',
            value: electricalFormat(astableInverse.data.rb),
            unit: 'Ω',
          },
        ]}
      />
    ) : (
      <Notice>{astableInverse.error}</Notice>
    );
  const waveDuty =
    inverse === 'forward'
      ? astableForward.data?.duty
      : astableInverse.data
        ? Number(duty)
        : undefined;
  return (
    <ToolPanel
      diagram={
        active.data ? (
          <>
            <Circuit
              type={type}
              values={
                type === 'mono'
                  ? inverse === 'forward'
                    ? {
                        ra: monoForward.data?.time ? Number(ra) : undefined,
                        c: monoForward.data?.time ? Number(c) : undefined,
                      }
                    : { ra: monoInverse.data?.r, c: Number(c) }
                  : inverse === 'forward'
                    ? {
                        ra: astableForward.data?.frequency
                          ? Number(ra)
                          : undefined,
                        rb: astableForward.data?.frequency
                          ? Number(rb)
                          : undefined,
                        c: astableForward.data?.frequency
                          ? Number(c)
                          : undefined,
                      }
                    : {
                        ra: astableInverse.data?.ra,
                        rb: astableInverse.data?.rb,
                        c: Number(c),
                      }
              }
            />
            <Wave type={type} duty={waveDuty} />
          </>
        ) : (
          <Circuit type={type} values={{}} />
        )
      }
      notes={
        <>
          {' '}
          <p>
            理論值不含元件容差與晶片誤差。電容以 F 輸入，例如 1 µF = 0.000001
            F。RA／RB 對應 R1／R2。
          </p>{' '}
          {type === 'mono' ? (
            <>單穩態：t = ln(3)RC，輸出是一次高電位脈衝。</>
          ) : (
            <>
              無穩態：tH = ln(2)(RA + RB)C、tL = ln(2)RB C；標準電路占空比介於
              50% 與 100%。
            </>
          )}
          <p>
            電路與公式參考{' '}
            <a
              href="https://www.ti.com/lit/ds/symlink/ne555.pdf"
              target="_blank"
              rel="noreferrer"
            >
              TI NE555 資料表
            </a>
            。接線圖省略電源去耦；實作請依晶片規格配置。
          </p>
        </>
      }
      result={result}
    >
      <Choice
        label="模式"
        value={type}
        onChange={setType}
        options={[
          { value: 'astable', label: '無穩態振盪' },
          { value: 'mono', label: '單穩態' },
        ]}
      />
      <Choice
        label="計算"
        value={inverse}
        onChange={setInverse}
        options={[
          { value: 'forward', label: '由 R、C 計算' },
          { value: 'inverse', label: '反算電阻' },
        ]}
      />
      <div className="fields-grid">
        {inverse === 'forward' ? (
          <>
            <QuantityField
              label={type === 'mono' ? 'R' : 'RA'}
              value={ra}
              onChange={setRa}
              kind="resistance"
              initialUnit="kΩ"
            />
            {type === 'astable' && (
              <QuantityField
                label="RB"
                value={rb}
                onChange={setRb}
                kind="resistance"
                initialUnit="kΩ"
              />
            )}
          </>
        ) : type === 'mono' ? (
          <QuantityField
            label="目標時間"
            value={time}
            onChange={setTime}
            kind="time"
            initialUnit="ms"
          />
        ) : (
          <>
            <QuantityField
              label="目標頻率"
              value={freq}
              onChange={setFreq}
              kind="frequency"
              initialUnit="Hz"
            />
            <NumberField
              label="目標占空比"
              value={duty}
              onChange={setDuty}
              unit="%"
            />
          </>
        )}
        <QuantityField
          label="C"
          value={c}
          onChange={setC}
          kind="capacitance"
          initialUnit="µF"
        />
      </div>
      <ToolActions onExample={example} onClear={clear} />
    </ToolPanel>
  );
}
