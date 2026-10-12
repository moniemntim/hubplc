'use client';

import { useState } from 'react';

type Work = 'Open' | 'InProgress' | 'Resolved';
type Mode = 'lifecycle' | 'workflow' | 'procedure';
type LessonState = {
  active: boolean;
  acked: boolean;
  work: Work;
  revision: number;
  decision: string;
};

const initial: LessonState = {
  active: true,
  acked: false,
  work: 'Open',
  revision: 1,
  decision: 'active',
};

const headings: Record<Mode, string> = {
  lifecycle: '直接重播：Ack、Clear 與 occurrence 各自改什麼？',
  workflow: '直接演練：什麼條件下才能結案？',
  procedure: '直接核對 SOP：現在該停在哪一個步驟？',
};

function Snapshot({ state }: { state: LessonState }) {
  return (
    <dl className="analog-lesson-results" data-testid="alarm-lifecycle-result">
      <div>
        <dt>來源 Active</dt>
        <dd data-testid="alarm-active">{String(state.active)}</dd>
      </div>
      <div>
        <dt>人員 Acked</dt>
        <dd data-testid="alarm-acked">{String(state.acked)}</dd>
      </div>
      <div>
        <dt>工作狀態</dt>
        <dd data-testid="alarm-work">{state.work}</dd>
      </div>
      <div>
        <dt>目前 revision</dt>
        <dd data-testid="alarm-revision">{state.revision}</dd>
      </div>
      <div>
        <dt>最後決策</dt>
        <dd data-testid="alarm-decision">{state.decision}</dd>
      </div>
      <div>
        <dt>結案判讀</dt>
        <dd data-testid="alarm-close-status">
          {state.work === 'Resolved'
            ? '已依教材條件結案；不是設備 Reset'
            : '尚不能結案'}
        </dd>
      </div>
    </dl>
  );
}

export default function AlarmLifecycleLesson({ mode }: { mode: Mode }) {
  const [state, setState] = useState(initial);
  const [actor, setActor] = useState<'Operator' | 'Supervisor'>('Supervisor');
  const [expectedRevision, setExpectedRevision] = useState('4');
  const [evidence, setEvidence] = useState('已核對原因');
  const [error, setError] = useState<string | null>(null);

  function ack() {
    setError(null);
    setState((current) =>
      current.acked
        ? { ...current, decision: 'ack_already_acked' }
        : {
            ...current,
            acked: true,
            revision: current.revision + 1,
            decision: 'ack',
          },
    );
  }
  function clear() {
    setError(null);
    setState((current) =>
      !current.active
        ? { ...current, decision: 'clear_already_inactive' }
        : {
            ...current,
            active: false,
            revision: current.revision + 1,
            decision: 'clear',
          },
    );
  }
  function start() {
    setError(null);
    setState((current) =>
      current.work === 'Open'
        ? {
            ...current,
            work: 'InProgress',
            revision: current.revision + 1,
            decision: 'workflow_started',
          }
        : { ...current, decision: 'workflow_rejected_transition' },
    );
  }
  function close() {
    if (
      !/^\d+$/.test(expectedRevision.trim()) ||
      !Number.isSafeInteger(Number(expectedRevision)) ||
      Number(expectedRevision) < 1
    ) {
      setError('expectedRevision 必須是正整數。');
      return;
    }
    setError(null);
    setState((current) => {
      if (Number(expectedRevision) !== current.revision)
        return { ...current, decision: 'workflow_revision_conflict' };
      if (actor !== 'Supervisor' || evidence.trim() === '')
        return { ...current, decision: 'workflow_rejected_request' };
      if (current.active || !current.acked || current.work !== 'InProgress')
        return { ...current, decision: 'workflow_rejected_transition' };
      return {
        ...current,
        work: 'Resolved',
        revision: current.revision + 1,
        decision: 'workflow_resolved',
      };
    });
  }
  function reset() {
    setState(initial);
    setExpectedRevision('4');
    setActor('Supervisor');
    setEvidence('已核對原因');
    setError(null);
  }

  return (
    <section
      className="plc-practice analog-lesson"
      id={`alarm-lifecycle-${mode}-practice`}
      aria-labelledby={`alarm-lifecycle-${mode}-heading`}
    >
      <h2 id={`alarm-lifecycle-${mode}-heading`}>{headings[mode]}</h2>
      <p>
        這是單一 O1 的合成瀏覽器教材，不用下載 Node。它以本篇的狀態條件展示
        source Active、人工 Ack、source Clear 與工作
        Closed；沒有連接警報平台、PLC、登入或設備 Reset。
      </p>
      <div className="plc-practice-actions">
        <button type="button" onClick={ack}>
          Ack 收到
        </button>
        <button type="button" onClick={clear}>
          來源 Clear
        </button>
        <button type="button" onClick={start}>
          Operator 開始處置
        </button>
        <button type="button" onClick={reset}>
          重設 O1
        </button>
      </div>
      <Snapshot state={state} />
      <p>
        來源可以先 Clear 而尚未
        Ack，這時保留「active=false、acked=false」。它不是已結案；本文拒絕的是缺少
        Ack 或 Clear 的結案請求。
      </p>
      <h3>嘗試工作結案</h3>
      <p>
        先按 Ack、開始處置、來源 Clear，再以目前 revision 的 Supervisor 和非空
        evidence 結案。每個錯誤條件都會保留原狀態並顯示拒絕原因。
      </p>
      <div className="analog-lesson-fields">
        <label>
          Actor
          <select
            value={actor}
            onChange={(event) =>
              setActor(event.target.value as 'Operator' | 'Supervisor')
            }
          >
            <option value="Operator">Operator</option>
            <option value="Supervisor">Supervisor</option>
          </select>
        </label>
        <label>
          expectedRevision
          <input
            inputMode="numeric"
            value={expectedRevision}
            onChange={(event) => setExpectedRevision(event.target.value)}
          />
        </label>
        <label>
          結案 evidence
          <input
            value={evidence}
            maxLength={120}
            onChange={(event) => setEvidence(event.target.value)}
          />
        </label>
      </div>
      <button type="button" onClick={close}>
        送出結案
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <p>
        畫面中的 Operator／Supervisor
        是教材字串，不能取代實際服務端的身分驗證、授權、稽核與安全互鎖。
      </p>
    </section>
  );
}
