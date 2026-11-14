'use client';
import { useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import { unitGroups, convertUnit } from '@/lib/tools/units';
import { attempt, formatNumber } from '@/lib/tools/core';
import { convertUnitBatch, MAX_BATCH_ROWS } from '@/lib/tools/unit-batch';
import { translateToolMessage } from '@/lib/tools/error-i18n';
import Link from '@/components/site-link';
import {
  Choice,
  NumberField,
  ToolPanel,
  ResultRows,
  Notice,
  CopyButton,
  TextField,
} from '../_components/controls';
import './unit-converter.css';
const dedicatedPages = [
  ['length', '長度'],
  ['temperature', '溫度'],
  ['mass', '質量'],
  ['area', '面積'],
  ['volume', '體積'],
  ['pressure', '壓力'],
  ['power', '功率'],
  ['time', '時間'],
  ['angle', '角度'],
  ['capacitance', '電容量'],
  ['speed', '速度'],
  ['storage', '儲存容量'],
] as const;

const groupExamples: Record<
  string,
  { fromId: string; toId: string; raw: string }
> = {
  length: { fromId: 'm', toId: 'ft', raw: '1' },
  temperature: { fromId: 'c', toId: 'f', raw: '1' },
  mass: { fromId: 'kg', toId: 'lb', raw: '1' },
  area: { fromId: 'm2', toId: 'ft2', raw: '1' },
  volume: { fromId: 'l', toId: 'usgal', raw: '1' },
  pressure: { fromId: 'bar', toId: 'kpa', raw: '1' },
  power: { fromId: 'kw', toId: 'watt', raw: '1' },
  time: { fromId: 'h', toId: 'min', raw: '1' },
  angle: { fromId: 'deg', toId: 'rad', raw: '180' },
  capacitance: { fromId: 'uf', toId: 'nf', raw: '1' },
  speed: { fromId: 'kmh', toId: 'mspeed', raw: '1' },
  storage: { fromId: 'gb', toId: 'gib', raw: '1' },
  flow: { fromId: 'lmin', toId: 'm3h', raw: '1' },
};

function exampleFor(groupId: string) {
  return groupExamples[groupId] ?? groupExamples.pressure;
}

const englishGroupNotes: Record<string, string> = {
  pressure:
    'This converts pressure units only; it does not convert gauge pressure to absolute pressure. mmH₂O uses standard gravity.',
  flow: 'Mass flow and volumetric flow are different quantities and cannot be converted directly. US gpm uses US liquid gallons.',
  time: 'A day is fixed at 24 hours.',
  mass: '“Weight” here means mass, not force.',
  temperature:
    'Temperature is calculated on absolute scales; input cannot be below absolute zero (0 K).',
  speed:
    'Mach uses a reference speed of sound of 343 m/s. Actual Mach number depends on local temperature and medium.',
  power:
    'Horsepower has several definitions; mechanical hp and metric PS are listed separately.',
  storage:
    'kB, MB, GB and TB are decimal (1000); KiB, MiB, GiB and TiB are binary (1024). B means byte and b means bit.',
};

const englishUnitLabels: Record<string, string> = {
  'mmH₂O（標準重力）': 'mmH₂O (standard gravity)',
  'g/s（質量）': 'g/s (mass)',
  'kg/s（質量）': 'kg/s (mass)',
  'kg/h（質量）': 'kg/h (mass)',
  't/h（質量）': 't/h (mass)',
  公噸: 'metric tonne',
  '美制 gallon': 'US gallon',
  '英制 gallon': 'imperial gallon',
  '海里 nmi': 'nautical mile nmi',
  '節 kn': 'knot kn',
  'Mach（參考音速 343 m/s）': 'Mach (reference speed 343 m/s)',
  '機械 hp': 'mechanical hp',
  '公制 PS': 'metric PS',
  '度 °': 'degree °',
  '弧度 rad': 'radian rad',
  '百分度 gon': 'gradian gon',
  '圈 turn': 'turn',
  '角分 ′': 'arcminute ′',
  '角秒 ″': 'arcsecond ″',
  'kB（十進位）': 'kB (decimal)',
  'MB（十進位）': 'MB (decimal)',
  'GB（十進位）': 'GB (decimal)',
  'TB（十進位）': 'TB (decimal)',
  'KiB（二進位）': 'KiB (binary)',
  'MiB（二進位）': 'MiB (binary)',
  'GiB（二進位）': 'GiB (binary)',
  'TiB（二進位）': 'TiB (binary)',
};

function englishUnitLabel(label: string) {
  return englishUnitLabels[label] ?? label;
}

export default function UnitConverter({ fixedGroup }: { fixedGroup?: string }) {
  const { tr, locale } = useToolLanguage();
  const initialGroup = fixedGroup ?? 'flow';
  const initialExample = exampleFor(initialGroup);
  const initial =
    unitGroups.find((item) => item.id === initialGroup) ?? unitGroups[0];
  const [groupId, setGroupId] = useState(initial.id),
    [fromId, setFromId] = useState(initialExample.fromId),
    [toId, setToId] = useState(initialExample.toId),
    [raw, setRaw] = useState(initialExample.raw);
  const [entryMode, setEntryMode] = useState('single');
  const [batchRaw, setBatchRaw] = useState('1\n10\n12');
  const isBatch = !fixedGroup && entryMode === 'batch';
  const group =
    unitGroups.find((item) => item.id === (fixedGroup ?? groupId)) ?? initial;
  const from = group.units.find((item) => item.id === fromId) ?? group.units[0];
  const compatible = group.units.filter(
    (item) => item.dimension === from.dimension,
  );
  const target = compatible.find((item) => item.id === toId) ?? compatible[0];
  const result = attempt(() => convertUnit(raw, from.id, target.id));
  const batch = isBatch
    ? attempt(() => convertUnitBatch(batchRaw, from.id, target.id))
    : undefined;
  const batchValid = Boolean(
    batch?.data?.every((row) => row.value !== undefined),
  );
  const batchText = batchValid
    ? [
        tr(
          `列號\t來源數值 (${from.label})\t換算結果 (${target.label})`,
          `Row\tInput (${englishUnitLabel(from.label)})\tResult (${englishUnitLabel(target.label)})`,
        ),
        ...batch!.data!.map(
          (row) => `${row.line}\t${row.input}\t${formatNumber(row.value!)}`,
        ),
      ].join('\n')
    : '';
  function changeGroup(id: string) {
    const selected = exampleFor(id);
    setGroupId(id);
    setFromId(selected.fromId);
    setToId(selected.toId);
    setRaw(selected.raw);
    setBatchRaw('1\n10\n12');
  }
  function loadExample() {
    const selected = exampleFor(group.id);
    setFromId(selected.fromId);
    setToId(selected.toId);
    setRaw(selected.raw);
    setBatchRaw('1\n10\n12');
  }
  function changeFrom(id: string) {
    const selected = group.units.find((item) => item.id === id)!;
    setFromId(id);
    if (selected.dimension !== from.dimension)
      setToId(
        group.units.find(
          (item) => item.dimension === selected.dimension && item.id !== id,
        )?.id ?? id,
      );
  }
  return (
    <>
      <ToolPanel
        notes={
          <>
            <p>
              {tr(
                '一般單位：先乘以來源單位的 SI 係數，再除以目標單位係數。溫度另外計算零點偏移。',
                'For general units, multiply by the source unit SI factor, then divide by the target unit factor. Temperature offsets are calculated separately.',
              )}
            </p>
            {group.note && (
              <p>{tr(group.note, englishGroupNotes[group.id] ?? group.note)}</p>
            )}
            {!fixedGroup && (
              <p>
                {tr(
                  '單筆模式專供流量換算；其他物理量請使用下方專頁。批次模式可一次處理同類物理量的整份資料。',
                  'Single-value mode is for flow. Use the dedicated pages below for other quantities. Batch mode converts a whole list within one physical quantity.',
                )}
              </p>
            )}
            {!fixedGroup && (
              <p>
                {tr(
                  `批次模式每行一筆，最多 ${MAX_BATCH_ROWS} 筆非空白資料。空白行略過，錯誤保留原列號；全部有效才可複製表格。`,
                  `Batch mode accepts one value per line, up to ${MAX_BATCH_ROWS} non-empty rows. Blank lines are skipped and errors retain source row numbers. Copy is enabled only when every row is valid.`,
                )}
              </p>
            )}
          </>
        }
        result={
          isBatch ? (
            batch?.data ? (
              <>
                <div className="unit-batch-scroll">
                  <table
                    className="unit-batch-table"
                    aria-label={tr(
                      '逐列換算結果',
                      'Row-by-row conversion results',
                    )}
                  >
                    <thead>
                      <tr>
                        <th scope="col">{tr('列', 'Row')}</th>
                        <th scope="col">
                          {tr('輸入', 'Input')}
                          <br />
                          {tr(from.label, englishUnitLabel(from.label))}
                        </th>
                        <th scope="col">
                          {tr('結果', 'Result')}
                          <br />
                          {tr(target.label, englishUnitLabel(target.label))}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.data.map((row) => (
                        <tr key={row.line} data-valid={row.value !== undefined}>
                          <th scope="row">{row.line}</th>
                          <td>{row.input}</td>
                          <td>
                            {row.value === undefined ? (
                              <span className="unit-batch-error">
                                {translateToolMessage(row.error ?? '', locale)}
                              </span>
                            ) : (
                              formatNumber(row.value)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!batchValid && (
                  <Notice>
                    {tr(
                      '請修正錯誤列，再複製換算表格。',
                      'Correct the invalid rows before copying the conversion table.',
                    )}
                  </Notice>
                )}
                <CopyButton text={batchText} disabled={!batchValid} />
              </>
            ) : (
              <Notice>{batch?.error}</Notice>
            )
          ) : result.data !== undefined ? (
            <>
              <ResultRows
                rows={[
                  {
                    label: tr('換算結果', 'Conversion result'),
                    value: formatNumber(result.data),
                    unit: tr(target.label, englishUnitLabel(target.label)),
                  },
                ]}
              />
              <CopyButton
                text={`${formatNumber(result.data)} ${tr(target.label, englishUnitLabel(target.label))}`}
              />
            </>
          ) : (
            <Notice>{result.error}</Notice>
          )
        }
      >
        {!fixedGroup && (
          <>
            <Choice
              label={tr('換算方式', 'Conversion mode')}
              value={entryMode}
              onChange={(mode) => {
                setEntryMode(mode);
                if (mode === 'single' && groupId !== 'flow')
                  changeGroup('flow');
              }}
              options={[
                {
                  value: 'single',
                  label: tr('單筆流量換算', 'Single flow value'),
                },
                { value: 'batch', label: tr('批次換算', 'Batch values') },
              ]}
            />
            <Choice
              label={tr('物理量分類', 'Physical quantity category')}
              value={groupId}
              onChange={changeGroup}
              options={unitGroups
                .filter((item) => isBatch || item.id === 'flow')
                .map((item) => ({
                  value: item.id,
                  label: tr(
                    item.label,
                    (
                      {
                        長度: 'Length',
                        溫度: 'Temperature',
                        質量: 'Mass',
                        面積: 'Area',
                        體積: 'Volume',
                        壓力: 'Pressure',
                        功率: 'Power',
                        時間: 'Time',
                        角度: 'Angle',
                        電容量: 'Capacitance',
                        速度: 'Speed',
                        儲存容量: 'Storage capacity',
                        資料容量: 'Storage capacity',
                        流量: 'Flow',
                      } as Record<string, string>
                    )[item.label] ?? item.label,
                  ),
                }))}
            />
            <nav
              className="crypto-related"
              aria-label={tr(
                '常用單位換算捷徑',
                'Common unit-conversion shortcuts',
              )}
            >
              {dedicatedPages.map(([id, label]) => (
                <Link key={id} href={`/tool/${id}-converter`}>
                  {tr(
                    label,
                    (
                      {
                        長度: 'Length',
                        溫度: 'Temperature',
                        質量: 'Mass',
                        面積: 'Area',
                        體積: 'Volume',
                        壓力: 'Pressure',
                        功率: 'Power',
                        時間: 'Time',
                        角度: 'Angle',
                        電容量: 'Capacitance',
                        速度: 'Speed',
                        儲存容量: 'Storage capacity',
                      } as Record<string, string>
                    )[label],
                  )}
                </Link>
              ))}
            </nav>
          </>
        )}
        {isBatch ? (
          <TextField
            label={tr('批次數值（每行一筆）', 'Batch values (one per line)')}
            value={batchRaw}
            onChange={setBatchRaw}
            multiline
          />
        ) : (
          <NumberField
            label={tr('輸入數值', 'Input value')}
            value={raw}
            onChange={setRaw}
          />
        )}
        <div className="fields-grid">
          <Choice
            label={tr('來源單位', 'Source unit')}
            value={fromId}
            onChange={changeFrom}
            options={group.units.map((item) => ({
              value: item.id,
              label: tr(item.label, englishUnitLabel(item.label)),
            }))}
          />
          <Choice
            label={tr('目標單位', 'Target unit')}
            value={toId}
            onChange={setToId}
            options={compatible.map((item) => ({
              value: item.id,
              label: tr(item.label, englishUnitLabel(item.label)),
            }))}
          />
        </div>
        <button
          className="action secondary"
          disabled={isBatch && !batchValid}
          onClick={() => {
            setFromId(target.id);
            setToId(from.id);
            if (isBatch && batch?.data && batchValid)
              setBatchRaw(
                batch.data.map((row) => String(row.value)).join('\n'),
              );
            else if (result.data !== undefined) setRaw(String(result.data));
          }}
        >
          ⇄ {tr('交換方向', 'Swap direction')}
        </button>
        <div className="action-row">
          <button
            className="action secondary"
            onClick={() => {
              setRaw('');
              setBatchRaw('');
            }}
          >
            {tr('清空', 'Clear')}
          </button>
          <button className="action secondary" onClick={loadExample}>
            {tr('載入範例', 'Load example')}
          </button>
        </div>
      </ToolPanel>
    </>
  );
}
