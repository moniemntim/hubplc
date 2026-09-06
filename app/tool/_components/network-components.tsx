'use client';
import { DiagramPart } from './controls';
import { formatNumber } from '@/lib/tools/core';
const val = (n: number | undefined, u: string) =>
  n !== undefined && Number.isFinite(n) ? formatNumber(n) + ' ' + u : '—';
function Ground({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x - 14} ${y}h28m-23 6h18m-13 6h8`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  );
}
export function NetworkDiagram({
  mode,
  values,
  symbol = 'R',
  currents,
  sourceField,
  sourceText,
}: {
  mode: 'series' | 'parallel';
  values: readonly number[];
  symbol?: 'R' | 'C';
  currents?: readonly number[];
  sourceField?: string;
  sourceText?: string;
}) {
  const h = values.length * 84 + 80;
  return (
    <section
      className="network-visual"
      aria-label="完整電路圖，可捲動查看所有元件"
    >
      <svg
        className="network-schematic"
        viewBox={`0 0 420 ${h}`}
        aria-label={`${symbol} ${mode === 'series' ? '串聯' : '並聯'}，${values.length} 顆`}
      >
        <title>{`完整 ${values.length} 顆元件電路`}</title>
        {sourceField && (
          <DiagramPart field={sourceField}>
            <text x="35" y="22" fontSize="14">
              {sourceText || sourceField}
            </text>
          </DiagramPart>
        )}
        {mode === 'parallel' && (
          <path
            d={`M40 42V${h - 30}M380 42V${h - 30}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        )}
        {values.map((v, i) => {
          const y = 60 + i * 84,
            label = symbol + (i + 1);
          return (
            <DiagramPart key={label} field={label}>
              {mode === 'series' ? (
                <>
                  <path
                    d={`M100 ${y - 24}V${y}M100 ${y + 40}v20`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  {symbol === 'R' ? (
                    <rect
                      x="89"
                      y={y}
                      width="22"
                      height="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  ) : (
                    <path
                      d={`M100 ${y}v12m-20 0h40m-40 14h40m-20 0v14`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  )}
                  <text x="145" y={y + 16} fontSize="16">
                    {label}
                  </text>
                  <text x="145" y={y + 38} fontSize="14">
                    {val(v, symbol === 'R' ? 'Ω' : 'F')}
                  </text>
                </>
              ) : (
                <>
                  <path
                    d={`M40 ${y}H150M220 ${y}H380`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  {symbol === 'R' ? (
                    <rect
                      x="150"
                      y={y - 11}
                      width="70"
                      height="22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  ) : (
                    <path
                      d={`M150 ${y}h25m0-18v36m18-36v36m0-18h27`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  )}
                  <text x="145" y={y - 22} fontSize="16">
                    {label}
                  </text>
                  <text x="65" y={y + 34} fontSize="14">
                    {val(v, symbol === 'R' ? 'Ω' : 'F')}
                  </text>
                  {currents && (
                    <>
                      <path
                        d={`M265 ${y - 9}h28m-7-4 7 4-7 4`}
                        fill="none"
                        stroke="#08755d"
                        strokeWidth="2"
                      />
                      <text x="245" y={y + 34} fontSize="14">
                        {val(currents[i], 'A')}
                      </text>
                    </>
                  )}
                </>
              )}
            </DiagramPart>
          );
        })}
      </svg>
    </section>
  );
}
export function ShuntDiagram({
  data,
  measured = false,
}: {
  data?: {
    resistance: number;
    voltage: number;
    current: number;
    power: number;
  };
  measured?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 420 240"
      aria-label="電流流經分流電阻，電壓表跨接電阻兩端"
    >
      <title>分流電阻量測位置</title>
      <path
        d="M30 135H140M280 135H390"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <DiagramPart field={measured ? '額定電流' : '電流'}>
        <path
          d="M65 122h35m-7-5 7 5-7 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="25" y="106" fontSize="14">
          I {val(data?.current, 'A')}
        </text>
      </DiagramPart>
      <DiagramPart field={measured ? '額定壓降' : '電阻'}>
        <rect
          x="140"
          y="123"
          width="140"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="210" y="177" textAnchor="middle" fontSize="15">
          R {val(data?.resistance, 'Ω')}
        </text>
      </DiagramPart>
      <DiagramPart field={measured ? '實測壓降' : '壓降'}>
        <path
          d="M140 135V55H190M230 55H280V135"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="210"
          cy="55"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="210" y="61" textAnchor="middle">
          V
        </text>
        <text x="210" y="22" textAnchor="middle" fontSize="14">
          壓降 {val(data?.voltage, 'V')}
        </text>
      </DiagramPart>
      <text x="210" y="211" textAnchor="middle" fontSize="14">
        功耗 {val(data?.power, 'W')}
      </text>
    </svg>
  );
}
export function RcDiagram({
  type,
  resistance,
  capacitance,
}: {
  type: 'lowpass' | 'highpass';
  resistance?: number;
  capacitance?: number;
}) {
  const high = type === 'highpass';
  return (
    <svg viewBox="0 0 420 250" aria-label={`RC ${high ? '高通' : '低通'}電路`}>
      <title>{`一階 RC ${high ? '高通' : '低通'}`}</title>
      <path
        d="M35 70H110M190 70H370M280 70V105"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="280" cy="70" r="3" fill="currentColor" />
      <DiagramPart field={high ? 'C' : 'R'}>
        {high ? (
          <path
            d="M110 70h30m0-18v36m20-36v36m0-18h30"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        ) : (
          <rect
            x="110"
            y="59"
            width="80"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        )}
        <text x="150" y="32" textAnchor="middle" fontSize="14">
          {high ? 'C ' + val(capacitance, 'F') : 'R ' + val(resistance, 'Ω')}
        </text>
      </DiagramPart>
      <DiagramPart field={high ? 'R' : 'C'}>
        {high ? (
          <>
            <rect
              x="269"
              y="105"
              width="22"
              height="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M280 153V192" stroke="currentColor" strokeWidth="2" />
          </>
        ) : (
          <path
            d="M280 105v12m-20 0h40m-40 16h40m-20 0v59"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        )}
        <text x="205" y="223" textAnchor="middle" fontSize="14">
          {high ? 'R ' + val(resistance, 'Ω') : 'C ' + val(capacitance, 'F')}
        </text>
      </DiagramPart>
      <Ground x={280} y={192} />
      <text x="35" y="99" fontSize="14">
        Vin
      </text>
      <text x="326" y="99" fontSize="14">
        Vout
      </text>
    </svg>
  );
}
export function ReactanceDiagram({
  kind,
  component,
  frequency,
  inverse = false,
}: {
  kind: 'capacitor' | 'inductor';
  component?: number;
  frequency?: number;
  inverse?: boolean;
}) {
  const cap = kind === 'capacitor';
  return (
    <svg
      viewBox="0 0 420 145"
      aria-label={cap ? '電容交流電抗' : '電感交流電抗'}
    >
      <title>{cap ? '容抗 −jXc' : '感抗 +jXL'}</title>
      <path
        d="M35 80H145M253 80H385"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <DiagramPart field={inverse ? '目標電抗' : cap ? 'C' : 'L'}>
        {cap ? (
          <path
            d="M145 80h38m0-22v44m30-44v44m0-22h40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        ) : (
          <path
            d="M145 80c0-30 27-30 27 0s27 30 27 0s27-30 27 0s27 30 27 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        )}
        <text x="210" y="28" textAnchor="middle" fontSize="15">
          {cap ? 'C' : 'L'} {val(component, cap ? 'F' : 'H')}
        </text>
      </DiagramPart>
      <DiagramPart field="頻率">
        <text x="210" y="126" textAnchor="middle" fontSize="14">
          f {val(frequency, 'Hz')}
        </text>
      </DiagramPart>
    </svg>
  );
}
export function LcDiagram({
  data,
}: {
  data?: { inductance: number; capacitance: number; frequency: number };
}) {
  return (
    <svg viewBox="0 0 420 215" aria-label="理想電感與電容串聯諧振回路">
      <title>理想 LC 諧振</title>
      <path
        d="M40 85H90M198 85H275M325 85H380V155H40V85"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <DiagramPart field="L">
        <path
          d="M90 85c0-30 27-30 27 0s27 30 27 0s27-30 27 0s27 30 27 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="135" y="28" textAnchor="middle" fontSize="14">
          L {val(data?.inductance, 'H')}
        </text>
      </DiagramPart>
      <DiagramPart field="C">
        <path
          d="M275 85h15m0-22v44m20-44v44m0-22h15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="300" y="47" textAnchor="middle" fontSize="14">
          C {val(data?.capacitance, 'F')}
        </text>
      </DiagramPart>
      <DiagramPart field="f0">
        <text x="210" y="194" textAnchor="middle" fontSize="14">
          f₀ {val(data?.frequency, 'Hz')}
        </text>
      </DiagramPart>
    </svg>
  );
}
export function Curve({
  points,
  label,
  yLabel = '增益',
  lowLabel = '',
  midLabel = '',
  highLabel = '',
  marker = false,
  field = '指定頻率',
}: {
  points: string;
  label: string;
  yLabel?: string;
  lowLabel?: string;
  midLabel?: string;
  highLabel?: string;
  marker?: boolean;
  field?: string;
}) {
  return (
    <svg viewBox="0 0 420 185" aria-label={label}>
      <title>{label}</title>
      <path d="M45 25V130H395" fill="none" stroke="currentColor" />
      <text x="10" y="18" fontSize="13">
        {yLabel}
      </text>
      <path d={points} fill="none" stroke="#08755d" strokeWidth="3" />
      {marker && (
        <DiagramPart field={field}>
          <path d="M220 25V130" stroke="#b17716" strokeDasharray="4 4" />
          <text x="220" y="151" textAnchor="middle" fontSize="12">
            {midLabel}
          </text>
        </DiagramPart>
      )}
      <text x="45" y="151" fontSize="12">
        {lowLabel}
      </text>
      <text x="395" y="151" textAnchor="end" fontSize="12">
        {highLabel}
      </text>
      <text x="220" y="178" textAnchor="middle" fontSize="13">
        頻率 Hz（對數刻度）
      </text>
    </svg>
  );
}
