'use client';
import Link from '@/components/site-link';
import { useState } from 'react';
import { Search, ArrowUpRight } from 'lucide-react';
import { tools, categories } from '@/lib/tools/registry';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
export default function Directory() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = tools.filter(
    (tool) =>
      (category === '全部' || tool.category === category) &&
      words.every((word) =>
        `${tool.name} ${tool.description} ${tool.keywords}`
          .toLocaleLowerCase()
          .includes(word),
      ),
  );
  return (
    <main className="shell directory">
      <div className="directory-heading">
        <div>
          <p className="eyebrow">ENGINEERING TOOLBOX / 15 TOOLS</p>
          <h1>
            把計算交給工具，
            <br />
            把時間留給現場<span>。</span>
          </h1>
          <p className="lead">
            PLC、電路、編碼與單位換算。免費使用，無須註冊。
          </p>
        </div>
        <div className="directory-mark" aria-hidden="true">
          [ 15 ]<small>READY TO USE</small>
        </div>
      </div>
      <div className="directory-toolbar">
        <label className="tool-search">
          <Search size={19} />
          <span className="sr-only">搜尋工具</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋工具、單位或關鍵字…"
          />
        </label>
        <Tabs
          value={category}
          onValueChange={(value) => setCategory(String(value))}
        >
          <TabsList className="category-tabs">
            {categories.map((value) => (
              <TabsTrigger key={value} value={value}>
                {value}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={category}>
            <output className="results-count">{matches.length} 個工具</output>
            <div className="tools-grid">
              {matches.map((tool) => (
                <Link
                  key={tool.slug}
                  className="tool-card"
                  href={`/tool/${tool.slug}`}
                >
                  <div className="tool-card-top">
                    <span className="tool-code">{tool.code}</span>
                    <ArrowUpRight size={20} />
                  </div>
                  <span className="tool-category">{tool.category}</span>
                  <h2>{tool.name}</h2>
                  <p>{tool.description}</p>
                  <span className="tool-open">
                    打開工具 <span>→</span>
                  </span>
                </Link>
              ))}
            </div>
            {matches.length === 0 && (
              <div className="empty-state">
                <h2>找不到符合的工具</h2>
                <p>試試「類比」、「電阻」、「HEX」或清除篩選。</p>
                <button
                  className="action"
                  onClick={() => {
                    setQuery('');
                    setCategory('全部');
                  }}
                >
                  顯示所有工具
                </button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
