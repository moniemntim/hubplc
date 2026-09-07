'use client';
import { useEffect, useRef, useState } from 'react';
import {
  currencies,
  convertCurrency,
  currencyQuote,
  validateRates,
  RATES_URL,
  type Currency,
  type Rates,
} from '@/lib/tools/currency';
import { attempt, numberInput, formatNumber } from '@/lib/tools/core';
import {
  Choice,
  NumberField,
  ToolPanel,
  ResultRows,
  Notice,
  CopyButton,
} from '../_components/controls';

export default function CurrencyConverter() {
  const [from, setFrom] = useState<Currency>('USD'),
    [to, setTo] = useState<Currency>('TWD');
  const [amount, setAmount] = useState('100'),
    [mode, setMode] = useState('online'),
    [manual, setManual] = useState('');
  const [places, setPlaces] = useState('2');
  const [checkedAt, setCheckedAt] = useState(0);
  const [rates, setRates] = useState<Rates | null>(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState('');
  const active = useRef<AbortController | null>(null);
  const revision = useRef(0);
  function cancel() {
    revision.current++;
    active.current?.abort();
    active.current = null;
    setBusy(false);
  }
  function clear() {
    cancel();
    setAmount('');
    setManual('');
    setRates(null);
    setStatus('');
  }
  useEffect(() => {
    const leave = () => {
      revision.current++;
      active.current?.abort();
      setAmount('');
      setManual('');
      setRates(null);
      setBusy(false);
      setStatus('');
    };
    window.addEventListener('pagehide', leave);
    return () => {
      leave();
      window.removeEventListener('pagehide', leave);
    };
  }, []);
  async function loadRates() {
    cancel();
    setRates(null);
    setStatus('讀取每日參考匯率…');
    setBusy(true);
    const controller = new AbortController();
    active.current = controller;
    const current = revision.current;
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(RATES_URL, {
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-cache',
      });
      if (!response.ok)
        throw new Error('匯率服務暫時無法使用，請稍後重試或改用手動匯率。');
      const parsed = validateRates(await response.json());
      if (current !== revision.current) return;
      setRates(parsed);
      setCheckedAt(Date.now());
      setStatus('已取得參考匯率，資料日期請見結果。');
    } catch (error) {
      if (current !== revision.current) return;
      setStatus(
        controller.signal.aborted
          ? '讀取逾時，請重試或改用手動匯率。'
          : error instanceof Error
            ? error.message
            : '無法讀取匯率。',
      );
    } finally {
      clearTimeout(timeout);
      if (current === revision.current) {
        setBusy(false);
        active.current = null;
      }
    }
  }
  const result = attempt(() => {
    const quote =
      from === to
        ? { rate: 1, dates: [] }
        : mode === 'manual'
          ? { rate: numberInput(manual, '匯率'), dates: [] }
          : rates
            ? currencyQuote(from, to, rates)
            : undefined;
    if (!quote) throw new Error('請先取得參考匯率，或切換至手動輸入。');
    return { ...quote, amount: convertCurrency(amount, quote.rate) };
  });
  const displayed = result.data?.amount.toLocaleString('zh-TW', {
    minimumFractionDigits: Number(places),
    maximumFractionDigits: Number(places),
  });
  const stale = result.data?.dates.some(
    (date) => checkedAt - Date.parse(date) > 7 * 86400000,
  );
  return (
    <ToolPanel
      notes={
        <>
          <p>
            換算金額＝原金額 × 匯率。線上模式先取得每 1 USD
            的各幣別參考值，再計算交叉匯率；不同幣別可能有不同資料日期。顯示小數位只影響四捨五入，不改變計算使用的匯率。
          </p>
          <p>
            資料來源：<a href="https://frankfurter.dev/">Frankfurter</a>{' '}
            的每日綜合參考匯率，並非即時成交價或銀行現鈔／即期買賣價。結果不含手續費、價差與稅費。週末、假日或資料源延遲時可能沿用較早日期。
          </p>
          <p>
            只有按下「取得最新參考匯率」才會向外部服務下載固定的一組匯率，不傳送金額或所選幣別組合。外部服務可取得一般連線資訊；本站不儲存輸入或匯率。手動模式完全在瀏覽器運算。
          </p>
        </>
      }
      result={
        result.data ? (
          <>
            <ResultRows
              rows={[
                { label: '換算金額', value: displayed!, unit: to },
                {
                  label: `1 ${from}`,
                  value: formatNumber(result.data.rate),
                  unit: to,
                },
              ]}
            />
            <p>
              {from === to
                ? '相同幣別，匯率為 1。'
                : mode === 'manual'
                  ? '使用手動匯率，未連線查價。'
                  : `資料日期：${result.data.dates.join('／')}（Frankfurter）`}
            </p>
            {stale && (
              <Notice>資料已超過 7 天，請檢查資料日期或改用手動匯率。</Notice>
            )}
            <CopyButton text={`${amount} ${from} ≈ ${displayed} ${to}`} />
          </>
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="匯率來源"
        value={mode}
        onChange={(value) => {
          cancel();
          setMode(value);
          setRates(null);
          setManual('');
          setStatus('');
        }}
        options={[
          { value: 'online', label: '每日參考匯率' },
          { value: 'manual', label: '手動輸入匯率' },
        ]}
      />
      <NumberField label="金額" value={amount} onChange={setAmount} />
      <div className="fields-grid">
        <Choice
          label="來源幣別"
          value={from}
          onChange={(value) => {
            setFrom(value as Currency);
            setManual('');
          }}
          options={currencies}
        />
        <Choice
          label="目標幣別"
          value={to}
          onChange={(value) => {
            setTo(value as Currency);
            setManual('');
          }}
          options={currencies}
        />
      </div>
      {mode === 'manual' && from !== to && (
        <NumberField
          label={`每 1 ${from} 可換多少 ${to}`}
          value={manual}
          onChange={setManual}
        />
      )}
      <Choice
        label="顯示小數位"
        value={places}
        onChange={setPlaces}
        options={[0, 2, 4, 6].map((value) => ({
          value: String(value),
          label: `${value} 位小數`,
        }))}
      />
      <div className="action-row">
        {mode === 'online' && (
          <button
            type="button"
            className="action"
            disabled={busy}
            onClick={() => void loadRates()}
          >
            {busy ? '讀取中…' : '取得最新參考匯率'}
          </button>
        )}
        {busy && (
          <button
            type="button"
            className="action secondary"
            onClick={() => {
              cancel();
              setStatus('已取消讀取。');
            }}
          >
            取消讀取
          </button>
        )}
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            setFrom(to);
            setTo(from);
            setManual(result.data ? String(1 / result.data.rate) : '');
          }}
        >
          ⇄ 交換幣別
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            cancel();
            setRates(null);
            setStatus('');
            setMode('manual');
            setFrom('USD');
            setTo('TWD');
            setAmount('100');
            setManual('32');
          }}
        >
          載入範例
        </button>
        <button type="button" className="action secondary" onClick={clear}>
          清空
        </button>
      </div>
      <output className="crypto-status" aria-live="polite">
        {status}
      </output>
      <p className="field-help">
        範例匯率 32 為示範值，不代表目前匯率。金額上限 10¹⁵。
      </p>
    </ToolPanel>
  );
}
