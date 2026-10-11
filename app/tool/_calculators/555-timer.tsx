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
import { useToolLanguage } from '@/components/tool-language';
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
  tr,
}: {
  type: string;
  values?: { ra?: number; rb?: number; c?: number };
  tr: (zh: string, en: string) => string;
}) {
  const mono = type === 'mono';
  return (
    <svg
      className="timer-schematic"
      viewBox="0 0 400 285"
      aria-label={
        mono
          ? tr('555 單穩態標準電路', '555 monostable standard circuit')
          : tr('555 無穩態標準電路', '555 astable standard circuit')
      }
    >
      <title>
        {mono
          ? tr(
              '單穩態：R 接電源與 7、6 腳，C 接地，2 腳輸入負脈衝',
              'Monostable: R connects supply to pins 7 and 6, C to ground, with a negative pulse at pin 2',
            )
          : tr(
              '無穩態：RA 接電源與 7 腳，RB 接 7 與 6、2 腳，C 接地',
              'Astable: RA connects supply to pin 7, RB connects pin 7 to pins 6 and 2, C to ground',
            )}
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
            {tr('負脈衝', 'Negative pulse')}
          </text>
        )}
        <text x="344" y="238">
          10 nF
        </text>
        <text x="270" y="278">
          {tr('CONT 旁路電容', 'CONT bypass capacitor')}
        </text>
      </g>
    </svg>
  );
}
function Wave({
  type,
  duty,
  tr,
}: {
  type: string;
  duty?: number;
  tr: (zh: string, en: string) => string;
}) {
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
          ? tr('單次高電位輸出脈衝', 'Single high-level output pulse')
          : tr(
              '兩個週期的輸出波形，占空比依計算結果繪製',
              'Two output cycles drawn from the calculated duty cycle',
            )
      }
    >
      <title>{tr('555 輸出波形', '555 output waveform')}</title>
      <DiagramPart
        field={
          type === 'mono'
            ? tr('目標時間', 'Target time')
            : tr('目標頻率', 'Target frequency')
        }
      >
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
      </DiagramPart>
      <text x="10" y="16">
        OUT
      </text>
      <text x="365" y="90">
        {tr('時間 →', 'Time →')}
      </text>
      {type === 'mono' ? (
        <text x="125" y="90">
          t
        </text>
      ) : (
        <>
          <DiagramPart field={tr('目標占空比', 'Target duty cycle')}>
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
  const { tr } = useToolLanguage();
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
                label: tr('脈衝時間', 'Pulse time'),
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
              label: tr('所需 R', 'Required R'),
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
              label: tr('頻率', 'Frequency'),
              value: electricalFormat(astableForward.data.frequency),
              unit: 'Hz',
            },
            {
              label: tr('週期', 'Period'),
              value: electricalFormat(astableForward.data.period),
              unit: 's',
            },
            {
              label: tr('高電位時間', 'High time'),
              value: electricalFormat(astableForward.data.high),
              unit: 's',
            },
            {
              label: tr('低電位時間', 'Low time'),
              value: electricalFormat(astableForward.data.low),
              unit: 's',
            },
            {
              label: tr('占空比', 'Duty cycle'),
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
              tr={tr}
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
            <Wave type={type} duty={waveDuty} tr={tr} />
          </>
        ) : (
          <Circuit type={type} values={{}} tr={tr} />
        )
      }
      notes={
        <>
          {' '}
          <p>
            {tr(
              '理論值不含元件容差與晶片誤差。電容以 F 輸入，例如 1 µF = 0.000001 F。RA／RB 對應 R1／R2。',
              'Theoretical values exclude component tolerance and IC error. Enter capacitance in F; for example, 1 µF = 0.000001 F. RA/RB correspond to R1/R2.',
            )}
          </p>{' '}
          {type === 'mono' ? (
            <>
              {tr(
                '單穩態：t = ln(3)RC，輸出是一次高電位脈衝。',
                'Monostable: t = ln(3)RC, producing one high-level output pulse.',
              )}
            </>
          ) : (
            <>
              {tr(
                '無穩態：tH = ln(2)(RA + RB)C、tL = ln(2)RB C；標準電路占空比介於 50% 與 100%。',
                'Astable: tH = ln(2)(RA + RB)C and tL = ln(2)RB C; the standard circuit duty cycle is between 50% and 100%.',
              )}
            </>
          )}
          <p>
            {tr('電路與公式參考', 'Circuit and formula reference:')}{' '}
            <a
              href="https://www.ti.com/lit/ds/symlink/ne555.pdf"
              target="_blank"
              rel="noreferrer"
            >
              {tr('TI NE555 資料表', 'TI NE555 datasheet')}
            </a>
            {tr(
              '。接線圖省略電源去耦；實作請依晶片規格配置。',
              '. The diagram omits supply decoupling; implement it according to the IC specification.',
            )}
          </p>
        </>
      }
      result={result}
    >
      <Choice
        label={tr('模式', 'Mode')}
        value={type}
        onChange={setType}
        options={[
          { value: 'astable', label: tr('無穩態振盪', 'Astable oscillator') },
          { value: 'mono', label: tr('單穩態', 'Monostable') },
        ]}
      />
      <Choice
        label={tr('計算', 'Calculation')}
        value={inverse}
        onChange={setInverse}
        options={[
          {
            value: 'forward',
            label: tr('由 R、C 計算', 'Calculate from R and C'),
          },
          { value: 'inverse', label: tr('反算電阻', 'Solve resistance') },
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
            label={tr('目標時間', 'Target time')}
            value={time}
            onChange={setTime}
            kind="time"
            initialUnit="ms"
          />
        ) : (
          <>
            <QuantityField
              label={tr('目標頻率', 'Target frequency')}
              value={freq}
              onChange={setFreq}
              kind="frequency"
              initialUnit="Hz"
            />
            <NumberField
              label={tr('目標占空比', 'Target duty cycle')}
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
