'use client';

import Link from '@/components/site-link';
import { useToolLanguage } from '@/components/tool-language';
import type { GuideText, ToolGuideData } from '@/lib/tools/tool-guides/types';
import './tool-guide.css';

export default function ToolGuide({
  guide,
  related,
}: {
  guide: ToolGuideData;
  related: Array<{ href: string; name: GuideText }>;
}) {
  const { tr } = useToolLanguage();
  const text = (value: GuideText) => tr(value.zh, value.en);
  return (
    <section className="tool-guide" aria-labelledby="tool-guide-title">
      <header>
        <p className="eyebrow">
          {tr('使用方法 / 操作案例', 'USAGE / WORKED CASES')}
        </p>
        <h2 id="tool-guide-title">
          {tr('操作案例與結果判讀', 'Worked cases and result interpretation')}
        </h2>
        <p>{text(guide.task)}</p>
        <p className="tool-guide-scope">{text(guide.scope)}</p>
      </header>
      {guide.cases.map((example, index) => (
        <article className="tool-guide-case" key={example.title.en}>
          <h3>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {text(example.title)}
          </h3>
          <table>
            <thead>
              <tr>
                <th scope="col">{tr('欄位', 'Field')}</th>
                <th scope="col">{tr('範例值', 'Example value')}</th>
                <th scope="col">
                  {tr('資料怎麼取得', 'Where to get the input')}
                </th>
              </tr>
            </thead>
            <tbody>
              {example.inputs.map((input) => (
                <tr key={input.label.en}>
                  <th scope="row">{text(input.label)}</th>
                  <td data-label={tr('範例值', 'Example value')}>
                    {typeof input.value === 'string'
                      ? input.value
                      : text(input.value)}
                  </td>
                  <td data-label={tr('資料來源', 'Input source')}>
                    {text(input.source)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>{tr('照著操作', 'Steps to follow')}</h4>
          <ol>
            {example.steps.map((step) => (
              <li key={step.en}>{text(step)}</li>
            ))}
          </ol>
          <h4>{tr('預期結果', 'Expected results')}</h4>
          <ul>
            {example.expected.map((result) => (
              <li key={result.en}>{text(result)}</li>
            ))}
          </ul>
          <p className="tool-guide-interpretation">
            <strong>{tr('如何判讀：', 'Interpretation: ')}</strong>
            {text(example.interpretation)}
          </p>
        </article>
      ))}
      <aside className="tool-guide-pitfalls">
        <h3>{tr('常見錯誤與適用範圍', 'Common mistakes and limits')}</h3>
        <ul>
          {guide.pitfalls.map((pitfall) => (
            <li key={pitfall.en}>{text(pitfall)}</li>
          ))}
        </ul>
      </aside>
      {related.length > 0 && (
        <nav
          className="tool-guide-related"
          aria-label={tr('相關任務工具', 'Tools for related tasks')}
        >
          <strong>{tr('相關任務', 'Related tasks')}</strong>
          {related.map((item) => (
            <Link key={item.href} href={item.href}>
              {text(item.name)} →
            </Link>
          ))}
        </nav>
      )}
      {guide.sources && guide.sources.length > 0 && (
        <p className="tool-guide-sources">
          <strong>
            {tr('定義與規格參考：', 'Definitions and specifications: ')}
          </strong>
          {guide.sources.map((source, index) => (
            <span key={source.url}>
              {index > 0 && ' · '}
              <a href={source.url}>{text(source.label)}</a>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
