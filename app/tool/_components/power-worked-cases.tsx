'use client';

import { useToolLanguage } from '@/components/tool-language';
import Link from '@/components/site-link';
import {
  energyWorkedCases,
  powerWorkedCases,
  type WorkedCase,
} from '@/lib/tools/worked-power-cases';
import type { AcPowerPreset } from '../_calculators/ac-power-converter';
import type { EnergyPreset } from '../_calculators/energy-cost';
import './worked-cases.css';

function CasePanel<Preset>({
  cases,
  onLoad,
}: {
  cases: ReadonlyArray<WorkedCase<Preset>>;
  onLoad: (preset: Preset) => void;
}) {
  const { tr } = useToolLanguage();
  return (
    <section
      className="worked-cases"
      aria-label={tr('工程判讀案例', 'Engineering worked cases')}
    >
      <header className="worked-cases-heading">
        <p className="eyebrow">HUBPLC / {tr('判讀案例', 'WORKED CASES')}</p>
        <h2>
          {tr(
            '先看資料來源與判讀界線，再帶入工具',
            'Check data sources and limits before loading the tool',
          )}
        </h2>
        <p>
          {tr(
            '以下使用固定條件練習。先確認輸入定義、單位與資料時段，再用結果核對任務條件。',
            'Practice with the fixed conditions below. Check input definitions, units, and measurement interval before comparing results with the task requirements.',
          )}
        </p>
      </header>
      <div className="worked-cases-list">
        {cases.map((item) => (
          <article className="worked-case" key={item.id}>
            <h3>{tr(item.title.zh, item.title.en)}</h3>
            <p className="worked-case-problem">
              <strong>{tr('實際問題：', 'Problem: ')}</strong>
              {tr(item.problem.zh, item.problem.en)}
            </p>
            <h4>{tr('輸入與來源', 'Inputs and sources')}</h4>
            <div className="worked-case-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{tr('欄位', 'Field')}</th>
                    <th scope="col">{tr('值', 'Value')}</th>
                    <th scope="col">{tr('來源', 'Source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {item.inputs.map((input) => (
                    <tr key={input.value + input.field.zh}>
                      <th scope="row">{tr(input.field.zh, input.field.en)}</th>
                      <td data-label={tr('值', 'Value')}>{input.value}</td>
                      <td data-label={tr('來源', 'Source')}>
                        {tr(input.source.zh, input.source.en)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h4>{tr('操作順序', 'Operation order')}</h4>
            <ol>
              {item.steps.map((step) => (
                <li key={step.zh}>{tr(step.zh, step.en)}</li>
              ))}
            </ol>
            <h4>
              {tr('預期數字與解讀', 'Expected numbers and interpretation')}
            </h4>
            <ul>
              {item.expected.map((result) => (
                <li key={result.zh}>{tr(result.zh, result.en)}</li>
              ))}
            </ul>
            <p>
              <strong>{tr('怎麼解讀：', 'Interpretation: ')}</strong>
              {tr(item.interpretation.zh, item.interpretation.en)}
            </p>
            <p className="worked-case-boundary">
              <strong>
                {tr('界線／常見錯誤：', 'Boundary / common error: ')}
              </strong>
              {tr(item.boundary.zh, item.boundary.en)}
            </p>
            <button
              type="button"
              className="worked-case-load"
              onClick={() => onLoad(item.preset)}
            >
              {tr('帶入此案例', 'Load this case')}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PowerWorkedCases({
  onLoad,
}: {
  onLoad: (preset: AcPowerPreset) => void;
}) {
  const { tr } = useToolLanguage();
  return (
    <>
      <CasePanel cases={powerWorkedCases} onLoad={onLoad} />
      <aside className="worked-case-sources">
        <strong>{tr('公式來源：', 'Formula sources: ')}</strong>
        <a href="https://www.electrical-installation.org/enwiki/Definition_of_Power_Factor">
          {tr('功率因數定義', 'Power factor definition')}
        </a>
        {' · '}
        <a href="https://www.electrical-installation.org/enwiki/Installed_apparent_power_%28kVA%29">
          {tr('視在功率與三相容量', 'Apparent power and three-phase capacity')}
        </a>
        <p>
          {tr(
            '三相公式使用線電壓與平衡負載。馬達銘牌若標示軸輸出功率，先依效率換成電氣輸入功率。',
            'Three-phase formulas use line-to-line voltage and balanced loads. If a motor nameplate states shaft output power, account for efficiency before using electrical input power.',
          )}
        </p>
        <p>
          {tr(
            '手上的電壓是相對中性線電壓？使用 ',
            'Only have phase-to-neutral voltage? Use the ',
          )}
          <Link href="/tool/va-to-amps">
            {tr('VA 轉安培工具', 'VA to Amps Calculator')}
          </Link>
          {tr(
            '的三相相對中性線模式，避免將相電壓誤填為線電壓。',
            ' three-phase phase-to-neutral mode to keep the voltage basis correct.',
          )}
        </p>
      </aside>
    </>
  );
}

export function EnergyWorkedCases({
  onLoad,
}: {
  onLoad: (preset: EnergyPreset) => void;
}) {
  return <CasePanel cases={energyWorkedCases} onLoad={onLoad} />;
}
