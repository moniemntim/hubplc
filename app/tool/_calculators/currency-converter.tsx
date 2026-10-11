'use client';
import { useEffect, useRef, useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
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
  const { tr } = useToolLanguage();
  const currencyOptions = currencies.map((item) => ({
    ...item,
    label: tr(
      item.label,
      item.label
        .replace('美元', 'US Dollar')
        .replace('新台幣', 'Taiwan Dollar')
        .replace('日圓', 'Japanese Yen')
        .replace('歐元', 'Euro'),
    ),
  }));
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
    setStatus(
      tr('讀取每日參考匯率…', 'Loading daily reference exchange rates…'),
    );
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
        throw new Error(
          tr(
            '匯率服務暫時無法使用，請稍後重試或改用手動匯率。',
            'The exchange-rate service is temporarily unavailable. Try again later or use a manual rate.',
          ),
        );
      const parsed = validateRates(await response.json());
      if (current !== revision.current) return;
      setRates(parsed);
      setCheckedAt(Date.now());
      setStatus(
        tr(
          '已取得參考匯率，資料日期請見結果。',
          'Reference rates loaded; see the result for data dates.',
        ),
      );
    } catch (error) {
      if (current !== revision.current) return;
      setStatus(
        controller.signal.aborted
          ? tr(
              '讀取逾時，請重試或改用手動匯率。',
              'Request timed out. Try again or use a manual rate.',
            )
          : error instanceof Error
            ? error.message
            : tr('無法讀取匯率。', 'Unable to load exchange rates.'),
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
    if (!quote)
      throw new Error(
        tr(
          '請先取得參考匯率，或切換至手動輸入。',
          'Load reference rates first, or switch to manual entry.',
        ),
      );
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
            {tr(
              '換算金額＝原金額 × 匯率。線上模式先取得每 1 USD 的各幣別參考值，再計算交叉匯率；不同幣別可能有不同資料日期。顯示小數位只影響四捨五入，不改變計算使用的匯率。',
              'Converted amount = original amount × exchange rate. Online mode obtains reference values per 1 USD, then calculates cross rates; currencies may have different data dates. Display decimals affect rounding only, not the rate used.',
            )}
          </p>
          <p>
            {tr('資料來源：', 'Data source: ')}
            <a href="https://frankfurter.dev/">Frankfurter</a>{' '}
            {tr(
              '的每日綜合參考匯率，並非即時成交價或銀行現鈔／即期買賣價。結果不含手續費、價差與稅費。週末、假日或資料源延遲時可能沿用較早日期。',
              'daily aggregate reference rates, not live trade prices or bank cash/spot rates. Results exclude fees, spreads and taxes. Weekends, holidays or source delays may retain an earlier date.',
            )}
          </p>
          <p>
            {tr(
              '只有按下「取得最新參考匯率」才會向外部服務下載固定的一組匯率，不傳送金額或所選幣別組合。外部服務可取得一般連線資訊；本站不儲存輸入或匯率。手動模式完全在瀏覽器運算。',
              'The browser downloads a fixed set of rates only after you click “Get latest reference rates”; it does not send the amount or selected currency pair. The external service receives normal connection information. This site stores neither inputs nor rates, and manual mode runs entirely in the browser.',
            )}
          </p>
        </>
      }
      result={
        result.data ? (
          <>
            <ResultRows
              rows={[
                {
                  label: tr('換算金額', 'Converted amount'),
                  value: displayed!,
                  unit: to,
                },
                {
                  label: `1 ${from}`,
                  value: formatNumber(result.data.rate),
                  unit: to,
                },
              ]}
            />
            <p>
              {from === to
                ? tr('相同幣別，匯率為 1。', 'Same currency; the rate is 1.')
                : mode === 'manual'
                  ? tr(
                      '使用手動匯率，未連線查價。',
                      'Using a manual rate; no online lookup.',
                    )
                  : `${tr('資料日期：', 'Data date: ')}${result.data.dates.join(' / ')} (Frankfurter)`}
            </p>
            {stale && (
              <Notice>
                {tr(
                  '資料已超過 7 天，請檢查資料日期或改用手動匯率。',
                  'Data is older than 7 days. Check the data date or use a manual rate.',
                )}
              </Notice>
            )}
            <CopyButton text={`${amount} ${from} ≈ ${displayed} ${to}`} />
          </>
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label={tr('匯率來源', 'Exchange-rate source')}
        value={mode}
        onChange={(value) => {
          cancel();
          setMode(value);
          setRates(null);
          setManual('');
          setStatus('');
        }}
        options={[
          {
            value: 'online',
            label: tr('每日參考匯率', 'Daily reference rates'),
          },
          {
            value: 'manual',
            label: tr('手動輸入匯率', 'Manual exchange rate'),
          },
        ]}
      />
      <NumberField
        label={tr('金額', 'Amount')}
        value={amount}
        onChange={setAmount}
      />
      <div className="fields-grid">
        <Choice
          label={tr('來源幣別', 'Source currency')}
          value={from}
          onChange={(value) => {
            setFrom(value as Currency);
            setManual('');
          }}
          options={currencyOptions}
        />
        <Choice
          label={tr('目標幣別', 'Target currency')}
          value={to}
          onChange={(value) => {
            setTo(value as Currency);
            setManual('');
          }}
          options={currencyOptions}
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
        label={tr('顯示小數位', 'Display decimals')}
        value={places}
        onChange={setPlaces}
        options={[0, 2, 4, 6].map((value) => ({
          value: String(value),
          label: tr(`${value} 位小數`, `${value} decimal places`),
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
            {busy
              ? tr('讀取中…', 'Loading…')
              : tr('取得最新參考匯率', 'Get latest reference rates')}
          </button>
        )}
        {busy && (
          <button
            type="button"
            className="action secondary"
            onClick={() => {
              cancel();
              setStatus(tr('已取消讀取。', 'Loading cancelled.'));
            }}
          >
            {tr('取消讀取', 'Cancel loading')}
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
          ⇄ {tr('交換幣別', 'Swap currencies')}
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
          {tr('載入範例', 'Load example')}
        </button>
        <button type="button" className="action secondary" onClick={clear}>
          {tr('清空', 'Clear')}
        </button>
      </div>
      <output className="crypto-status" aria-live="polite">
        {status}
      </output>
      <p className="field-help">
        {tr(
          '範例匯率 32 為示範值，不代表目前匯率。金額上限 10¹⁵。',
          'Example rate 32 is illustrative and does not represent the current rate. Amount limit: 10¹⁵.',
        )}
      </p>
    </ToolPanel>
  );
}
