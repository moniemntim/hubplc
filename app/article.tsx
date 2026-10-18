import Link from '@/components/site-link';
import AdSense from '@/components/adsense';
import PlcPractice from '@/components/plc-practice';
import FaultResetPractice from '@/components/fault-reset-practice';
import AnalogLesson from '@/components/analog-lesson';
import FivePointLesson from '@/components/five-point-lesson';
import FilterLesson from '@/components/filter-lesson';
import SensorLesson from '@/components/sensor-lesson';
import AliasLesson from '@/components/alias-lesson';
import PowerLesson from '@/components/power-lesson';
import IoPathLesson from '@/components/io-path-lesson';
import HmiQualityLesson from '@/components/hmi-quality-lesson';
import HmiConnectionLesson from '@/components/hmi-connection-lesson';
import HmiTrendWindowLesson from '@/components/hmi-trend-window-lesson';
import PlcNumericLesson from '@/components/plc-numeric-lesson';
import HmiControlLesson from '@/components/hmi-control-lesson';
import AlarmLifecycleLesson from '@/components/alarm-lifecycle-lesson';
import {
  NumericRangeLesson,
  SettingReadbackLesson,
} from '@/components/hmi-value-lessons';
import {
  PlcEdgeLesson,
  PlcScanLesson,
} from '@/components/plc-scan-edge-lesson';
import { practiceModes } from '@/lib/plc-practice';
import ArticleReadingNav, {
  ArticleDirectoryLink,
} from '@/components/article-reading-nav';
import ExcelCourseNav from '@/components/excel-course-nav';
import './article-reader.css';

type ArticleTocItem = {
  id: string;
  title: string;
  level: 2 | 3;
};

type ArticleVerification = {
  kind: 'industrial' | 'software';
  reviewDate: string;
  evidence: string;
  screenshotCount: number;
  hardwareVerified?: boolean;
  verifiedHardware?: string[];
  simulatorVerified?: boolean;
  applicationVerified?: boolean;
  verifiedApplications?: string[];
  verificationSource?: 'author-attestation';
  verificationDate?: string;
};

type ArticleData = {
  title: string;
  date: string;
  author: string;
  description: string;
  publishedDate: string;
  updatedDate: string;
  html: string;
  slug?: string;
  category?: string;
  tags?: string[];
  readingMinutes?: number;
  toc?: ArticleTocItem[];
  verification: ArticleVerification;
};

type RelatedArticle = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  readingMinutes: number;
  publishedDate: string;
  updatedDate: string;
  tags?: string[];
};

const powerLessonModes = {
  '24vdc-sensor-power-voltage-drop': 'branch',
  '24vdc-oring-redundancy-capacity-overload': 'redundancy',
  '24vdc-field-box-pluggable-power-integrity-hot-swap': 'hotplug',
  '24vdc-ups-branch-event-correlation': 'events',
} as const;

const ioPathLessonModes = {
  '0-10v-analog-load-ground-response-open-circuit': 'analog',
  '24v-high-low-side-bjt-mosfet-switching': 'switch',
  '24v-input-reverse-polarity-tvs-surge-protection': 'protect',
  'actuator-output-end-to-end': 'actuator',
} as const;

export default function Article({
  article,
  related = [],
}: {
  article: ArticleData;
  related?: RelatedArticle[];
}) {
  const relatedArticles = related.slice(0, 3);
  const category = article.category || 'PLC 實務筆記';
  const powerLessonMode = article.slug
    ? powerLessonModes[article.slug as keyof typeof powerLessonModes]
    : undefined;
  const ioPathLessonMode = article.slug
    ? ioPathLessonModes[article.slug as keyof typeof ioPathLessonModes]
    : undefined;
  const articleUrl = `https://hubplc.com/articles/${article.slug}`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedDate,
    dateModified: article.updatedDate,
    author: { '@type': 'Person', name: article.author },
    mainEntityOfPage: articleUrl,
  }).replace(/</g, '\\u003c');

  return (
    <main className="article-reader">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <div className="article-reader__frame">
        <header className="article-reader__header">
          <ArticleDirectoryLink category={article.category} />
          <p className="article-reader__eyebrow">FIELD NOTES / {category}</p>
          <h1>{article.title}</h1>
          <div className="article-reader__meta" aria-label="文章資訊">
            <span className="article-reader__category">{category}</span>
            <span>
              發布：
              <time dateTime={article.publishedDate}>
                {article.publishedDate}
              </time>
            </span>
            {article.updatedDate > article.publishedDate ? (
              <span>
                更新：
                <time dateTime={article.updatedDate}>
                  {article.updatedDate}
                </time>
              </span>
            ) : null}
            <span>作者：{article.author}</span>
            {article.readingMinutes ? (
              <span>預估 {article.readingMinutes} 分鐘閱讀</span>
            ) : null}
          </div>
          <p className="article-reader__description">{article.description}</p>
        </header>

        {article.slug && practiceModes[article.slug] ? (
          <PlcPractice mode={practiceModes[article.slug]} />
        ) : null}

        {article.slug === 'plc-fault-reset-single-acceptance' ? (
          <FaultResetPractice />
        ) : null}
        {article.slug &&
        [
          'plc-analog-scaling-pressure-temperature-level',
          '4-20ma-scaling-open-overrange-diagnostics',
        ].includes(article.slug) ? (
          <AnalogLesson />
        ) : null}
        {article.slug === '4-20ma-zero-offset-span-errors' ? (
          <FivePointLesson />
        ) : null}
        {article.slug === 'analog-raw-quality-filter-overrange' ||
        article.slug === 'filtered-peaks-raw-data-traceability' ? (
          <FilterLesson
            key={article.slug}
            counts={article.slug === 'analog-raw-quality-filter-overrange'}
          />
        ) : null}
        {article.slug === 'sensor-polarity-reverse-range' ||
        article.slug === 'sensor-step-response-acceptance' ? (
          <SensorLesson
            key={article.slug}
            mode={
              article.slug === 'sensor-polarity-reverse-range'
                ? 'direction'
                : 'step'
            }
          />
        ) : null}
        {article.slug === 'sampling-aliasing-frequency-validation' ? (
          <AliasLesson />
        ) : null}
        {article.slug && powerLessonMode ? (
          <PowerLesson key={article.slug} mode={powerLessonMode} />
        ) : null}
        {article.slug && ioPathLessonMode ? (
          <IoPathLesson key={article.slug} mode={ioPathLessonMode} />
        ) : null}
        {article.slug === 'hmi-bad-quality-stale-value' ? (
          <HmiQualityLesson />
        ) : null}
        {article.slug === 'hmi-disconnected-data-paused-display' ? (
          <HmiConnectionLesson />
        ) : null}
        {article.slug === 'hmi-trend-time-range-sampling-aggregation' ? (
          <HmiTrendWindowLesson />
        ) : null}
        {article.slug === 'plc-floating-point-tolerance' ? (
          <PlcNumericLesson mode="tolerance" />
        ) : null}
        {article.slug === 'plc-rounding-negative-display-fixed-point' ? (
          <PlcNumericLesson mode="rounding" />
        ) : null}
        {article.slug === 'hmi-manual-auto-mode-control-ownership' ? (
          <HmiControlLesson mode="manual" />
        ) : null}
        {article.slug === 'hmi-maintenance-mode-screen-permissions' ? (
          <HmiControlLesson mode="maintenance" />
        ) : null}
        {article.slug === 'hmi-operation-permission-execution-authorization' ? (
          <HmiControlLesson mode="authorization" />
        ) : null}
        {article.slug === 'hmi-role-downgrade-open-screens' ? (
          <HmiControlLesson mode="downgrade" />
        ) : null}
        {article.slug === 'alarm-acknowledge-clear-occurrence' ? (
          <AlarmLifecycleLesson mode="lifecycle" />
        ) : null}
        {article.slug === 'hmi-alarm-ack-clear-reset-workflow' ? (
          <AlarmLifecycleLesson mode="workflow" />
        ) : null}
        {article.slug === 'hmi-operating-procedure-ack-clear' ? (
          <AlarmLifecycleLesson mode="procedure" />
        ) : null}
        {article.slug === 'plc-scan-cycle-io-refresh' ? (
          <PlcScanLesson />
        ) : null}
        {article.slug === 'plc-rising-falling-edge-button-event' ? (
          <PlcEdgeLesson />
        ) : null}
        {article.slug === 'hmi-numeric-range-step-validation' ? (
          <NumericRangeLesson />
        ) : null}
        {article.slug === 'hmi-setting-value-change-confirm-readback' ? (
          <SettingReadbackLesson />
        ) : null}
        <div className="article-reader__layout">
          <ArticleReadingNav toc={article.toc} />
          <article
            className="prose article-reader__content"
            dangerouslySetInnerHTML={{ __html: article.html }}
          />
        </div>
        {article.slug ? <ExcelCourseNav currentSlug={article.slug} /> : null}
        <AdSense />

        <footer className="article-reader__footer">
          <p>
            <Link className="text-link" href="/about">
              作者署名、編輯與驗證方式 →
            </Link>
            {' · '}
            <Link className="text-link" href="/about#report">
              回報資訊與範本 →
            </Link>
          </p>
          {relatedArticles.length ? (
            <section
              className="article-reader__related"
              aria-labelledby="related-heading"
            >
              <div className="article-reader__section-heading">
                <p className="article-reader__eyebrow">NEXT NOTES</p>
                <h2 id="related-heading">接著可以讀</h2>
              </div>
              <div className="article-reader__related-grid">
                {relatedArticles.map((post) => (
                  <Link
                    className="article-reader__related-card"
                    href={'/articles/' + post.slug}
                    key={post.slug}
                  >
                    <span className="article-reader__related-meta">
                      {post.category} · {post.readingMinutes} 分鐘
                    </span>
                    <h3>{post.title}</h3>
                    <p>{post.description}</p>
                    <span className="article-reader__related-link">
                      閱讀文章 →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          <Link className="article-reader__tool-link" href="/tool">
            使用 PLC 工具箱 →
          </Link>
        </footer>
      </div>
    </main>
  );
}
