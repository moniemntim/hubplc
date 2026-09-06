'use client';

import { useId } from 'react';
import { DiagramPart } from './controls';

/** Wraparound terminations, with no axial leads. The MLCC body is unmarked. */
export function ChipPackage({
  kind,
  code = '',
  field,
}: {
  kind: 'capacitor' | 'resistor';
  code?: string;
  field: string;
}) {
  const id = useId().replace(/:/g, '');
  const capacitor = kind === 'capacitor';
  return (
    <svg
      className="chip-package"
      viewBox="0 0 420 220"
      aria-label={
        capacitor
          ? 'SMD 積層陶瓷電容：陶瓷本體與兩端金屬端電極'
          : `SMD 晶片電阻：黑色本體、金屬端電極，標記 ${code || '未輸入'}`
      }
    >
      <title>
        {capacitor
          ? 'SMD 積層陶瓷電容外觀示意'
          : `SMD 晶片電阻標記 ${code || '未輸入'}`}
      </title>
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0.3" y2="1">
          <stop stopColor="#eef2f4" />
          <stop offset=".24" stopColor="#c2cbd0" />
          <stop offset=".5" stopColor="#f6f8f9" />
          <stop offset="1" stopColor="#8d999f" />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={capacitor ? '#d8b887' : '#343c43'} />
          <stop offset=".45" stopColor={capacitor ? '#c5a16a' : '#22282e'} />
          <stop offset="1" stopColor={capacitor ? '#a17c4b' : '#161b20'} />
        </linearGradient>
        <radialGradient id={`${id}-shadow`}>
          <stop stopColor="#263832" stopOpacity=".2" />
          <stop offset="1" stopColor="#263832" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="214" cy="177" rx="158" ry="18" fill={`url(#${id}-shadow)`} />
      <DiagramPart field={field}>
        <rect
          className="component-focus-outline"
          x="53"
          y="44"
          width="314"
          height="132"
          rx="12"
        />
        <path
          d="M68 80 102 56H352L318 80Z"
          fill={capacitor ? '#e5c797' : '#495159'}
          stroke={capacitor ? '#a98551' : '#363f46'}
          strokeLinejoin="round"
        />
        <path
          d="M318 80 352 56V139L318 163Z"
          fill="#929fa6"
          stroke="#7a888f"
          strokeLinejoin="round"
        />
        <rect
          x="68"
          y="80"
          width="250"
          height="83"
          rx="3"
          fill={`url(#${id}-body)`}
          stroke={capacitor ? '#987344' : '#1e252b'}
        />
        <path
          d="M68 80 102 56H140L108 80ZM280 80 314 56H352L318 80Z"
          fill="#dce3e7"
          stroke="#a0adb4"
          strokeLinejoin="round"
        />
        <path
          d="M68 81H108V163H71Q68 163 68 160ZM280 81H318V160Q318 163 315 163H280Z"
          fill={`url(#${id}-metal)`}
          stroke="#9ba7ad"
        />
        <path
          d="M72 84H104M284 84H314M322 83 347 64"
          stroke="#fff"
          strokeOpacity=".8"
          strokeWidth="2"
        />
        <path
          d="M111 83H277"
          stroke={capacitor ? '#f5dfb5' : '#73808b'}
          strokeOpacity=".65"
        />
        {!capacitor && (
          <text
            className="chip-marking"
            x="193"
            y="132"
            textAnchor="middle"
            fontSize={Math.min(38, 240 / Math.max(code.length, 1))}
            fill="#f4f5ed"
          >
            {code || '—'}
          </text>
        )}
      </DiagramPart>
    </svg>
  );
}
