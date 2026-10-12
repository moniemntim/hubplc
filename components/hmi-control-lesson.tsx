'use client';

import { useState } from 'react';
import { attempt } from '@/lib/tools/core';
import {
  authorizationCase,
  downgradeCase,
  maintenanceExitCase,
  manualModeCase,
} from '@/lib/hmi-control-lesson';

function ManualModeLesson() {
  const [completeAt, setCompleteAt] = useState('4999');
  const [interlock, setInterlock] = useState(true);
  const result = attempt(() => manualModeCase(completeAt, interlock));
  const data = result.data;
  return (
    <section
      className="plc-practice analog-lesson"
      id="hmi-manual-mode-practice"
      aria-labelledby="hmi-manual-mode-heading"
    >
      <h2 id="hmi-manual-mode-heading">直接判讀：Manual 請求何時才確認？</h2>
      <p>
        這是本篇固定條件的瀏覽器分支：起始 Auto／PLC／revision
        1，假設停止、自動待命、手動待命與資料品質已確認。它只比較 5
        秒期限與互鎖；沒有控制設備或發送停止命令。
      </p>
      <div className="plc-practice-actions">
        <button
          type="button"
          onClick={() => {
            setCompleteAt('4999');
            setInterlock(true);
          }}
        >
          載入期限前成功
        </button>
        <button
          type="button"
          onClick={() => {
            setCompleteAt('5000');
            setInterlock(true);
          }}
        >
          載入等號逾時
        </button>
        <button
          type="button"
          onClick={() => {
            setCompleteAt('4999');
            setInterlock(false);
          }}
        >
          載入互鎖拒絕
        </button>
      </div>
      <div className="analog-lesson-fields">
        <label>
          完成時間（虛擬 ms）
          <input
            inputMode="numeric"
            type="text"
            value={completeAt}
            onChange={(event) => setCompleteAt(event.target.value)}
          />
        </label>
        <label>
          互鎖條件
          <select
            value={String(interlock)}
            onChange={(event) => setInterlock(event.target.value === 'true')}
          >
            <option value="true">合格</option>
            <option value="false">拒絕</option>
          </select>
        </label>
      </div>
      {result.error ? (
        <p role="alert">{result.error}</p>
      ) : data ? (
        <dl className="analog-lesson-results" aria-live="polite">
          <div>
            <dt>請求狀態／原因</dt>
            <dd data-testid="mode-decision">
              {data.status} / {data.reason}
            </dd>
          </div>
          <div>
            <dt>確認模式</dt>
            <dd data-testid="mode-confirmed">{data.mode}</dd>
          </div>
          <div>
            <dt>控制權／版本</dt>
            <dd>
              {data.owner} / {data.revision}
            </dd>
          </div>
        </dl>
      ) : null}
      <p>
        受理請求不是模式已切換；若只失去 HMI 回覆，狀態應保持 Unknown 並用原 ID
        查詢，不能從此教學分支直接推定成功或逾時。
      </p>
    </section>
  );
}

function MaintenanceLesson() {
  const [testStopped, setTestStopped] = useState(false);
  const [restoreReviewed, setRestoreReviewed] = useState(false);
  const data = maintenanceExitCase(testStopped, restoreReviewed);
  return (
    <section
      className="plc-practice analog-lesson"
      id="hmi-maintenance-practice"
      aria-labelledby="hmi-maintenance-heading"
    >
      <h2 id="hmi-maintenance-heading">
        直接核對：退出 Maintenance 還缺哪個條件？
      </h2>
      <p>
        固定起點為 Maintenance／revision
        3。以下勾選只注入合成來源摘要，不會停止測試、確認隔離、核准復原或切換任何設備。
      </p>
      <div className="analog-lesson-fields">
        <label>
          測試停止摘要
          <select
            value={String(testStopped)}
            onChange={(event) => setTestStopped(event.target.value === 'true')}
          >
            <option value="false">未確認</option>
            <option value="true">來源確認</option>
          </select>
        </label>
        <label>
          復原核對摘要
          <select
            value={String(restoreReviewed)}
            onChange={(event) =>
              setRestoreReviewed(event.target.value === 'true')
            }
          >
            <option value="false">未確認</option>
            <option value="true">來源確認</option>
          </select>
        </label>
      </div>
      <dl className="analog-lesson-results" aria-live="polite">
        <div>
          <dt>EXIT 狀態／原因</dt>
          <dd data-testid="maintenance-decision">
            {data.status} / {data.reason}
          </dd>
        </div>
        <div>
          <dt>確認模式／版本</dt>
          <dd data-testid="maintenance-mode">
            {data.mode} / {data.revision}
          </dd>
        </div>
        <div>
          <dt>工作單隔離證據</dt>
          <dd>not_verified_in_demo</dd>
        </div>
        <div>
          <dt>功能測試證據</dt>
          <dd>not_executed</dd>
        </div>
      </dl>
      <p>
        兩個摘要都成立後只回 Manual，不會自動進
        Auto。工作單與安全隔離必須由現場程序驗證，模式名稱不能代替它們。
      </p>
    </section>
  );
}

function AuthorizationLesson() {
  const [session, setSession] = useState<'V' | 'O' | 'S' | 'T' | 'M'>('S');
  const [value, setValue] = useState('95');
  const [target, setTarget] = useState<'A' | 'B'>('A');
  const [at, setAt] = useState('0');
  const [revision, setRevision] = useState('1');
  const result = attempt(() =>
    authorizationCase({
      session,
      value,
      target,
      at,
      expectedRevision: revision,
    }),
  );
  const data = result.data;
  return (
    <section
      className="plc-practice analog-lesson"
      id="hmi-authorization-practice"
      aria-labelledby="hmi-authorization-heading"
    >
      <h2 id="hmi-authorization-heading">直接提交：95°C 何時真的寫入？</h2>
      <p>
        固定記憶體設備 A 起始 80°C、revision 1、writes 0。S/T 是虛構 Supervisor
        工作階段，非真實登入；這個有限分支沒有執行服務端身份驗證或寫入 PLC。
      </p>
      <div className="analog-lesson-fields">
        <label>
          測試工作階段
          <select
            value={session}
            onChange={(event) =>
              setSession(event.target.value as typeof session)
            }
          >
            <option value="V">V Viewer</option>
            <option value="O">O Operator</option>
            <option value="S">S Supervisor</option>
            <option value="T">T Supervisor</option>
            <option value="M">M Maintenance</option>
          </select>
        </label>
        <label>
          目標設備
          <select
            value={target}
            onChange={(event) => setTarget(event.target.value as typeof target)}
          >
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </label>
        <label>
          設定值（°C）
          <input
            inputMode="numeric"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <label>
          預期設備版本
          <input
            inputMode="numeric"
            type="text"
            value={revision}
            onChange={(event) => setRevision(event.target.value)}
          />
        </label>
        <label>
          虛擬時間（ms）
          <input
            inputMode="numeric"
            type="text"
            value={at}
            onChange={(event) => setAt(event.target.value)}
          />
        </label>
      </div>
      {result.error ? (
        <p role="alert">{result.error}</p>
      ) : data ? (
        <dl className="analog-lesson-results" aria-live="polite">
          <div>
            <dt>提交結果</dt>
            <dd data-testid="auth-submit">{data.submit}</dd>
          </div>
          <div>
            <dt>模擬派送結果</dt>
            <dd data-testid="auth-execute">{data.execute}</dd>
          </div>
          <div>
            <dt>設備值／版本／寫入次數</dt>
            <dd data-testid="auth-device">
              {data.value} / {data.revision} / {data.writes}
            </dd>
          </div>
        </dl>
      ) : null}
      <p>
        QUEUED 代表已受理、還沒寫入；上方 APPLIED
        是在固定條件下接著執行一次的模型結果。正式系統需在提交與派送時各自重新核對目前身份、權限及版本。
      </p>
    </section>
  );
}

function DowngradeLesson() {
  const [restoreBeforeDispatch, setRestoreBeforeDispatch] = useState(false);
  const data = downgradeCase(restoreBeforeDispatch);
  return (
    <section
      className="plc-practice analog-lesson"
      id="hmi-downgrade-practice"
      aria-labelledby="hmi-downgrade-heading"
    >
      <h2 id="hmi-downgrade-heading">直接重播：降權後的舊佇列會復活嗎？</h2>
      <p>
        固定事件為：policy revision 12 時排隊，revision 13 降為
        Viewer，舊分頁仍顯示可提交。選擇派送前是否恢復
        Supervisor；所有角色與版本都是合成資料，未連接登入平台或 PLC。
      </p>
      <div className="analog-lesson-fields">
        <label>
          派送前恢復權限
          <select
            value={String(restoreBeforeDispatch)}
            onChange={(event) =>
              setRestoreBeforeDispatch(event.target.value === 'true')
            }
          >
            <option value="false">否，維持 Viewer／revision 13</option>
            <option value="true">是，Supervisor／revision 14</option>
          </select>
        </label>
      </div>
      <dl className="analog-lesson-results" aria-live="polite">
        <div>
          <dt>排隊時／現在政策版本</dt>
          <dd>
            {data.queuedPolicyRevision} / {data.currentPolicyRevision}
          </dd>
        </div>
        <div>
          <dt>舊分頁顯示可提交</dt>
          <dd>{String(data.staleTabCanSubmit)}</dd>
        </div>
        <div>
          <dt>舊分頁新請求</dt>
          <dd>{data.directSubmit}</dd>
        </div>
        <div>
          <dt>原佇列派送結果</dt>
          <dd data-testid="downgrade-dispatch">{data.dispatch}</dd>
        </div>
        <div>
          <dt>設備值／版本／寫入次數</dt>
          <dd data-testid="downgrade-device">
            {data.value} / {data.revision} / {data.writes}
          </dd>
        </div>
      </dl>
      <p>
        回到 Supervisor
        也不讓原佇列自動恢復；需重新讀取現在設定並建立新操作。畫面按鈕變灰只是提示，真正的授權判斷必須在提交與派送端完成。
      </p>
    </section>
  );
}

export default function HmiControlLesson({
  mode,
}: {
  mode: 'manual' | 'maintenance' | 'authorization' | 'downgrade';
}) {
  if (mode === 'manual') return <ManualModeLesson />;
  if (mode === 'maintenance') return <MaintenanceLesson />;
  if (mode === 'authorization') return <AuthorizationLesson />;
  return <DowngradeLesson />;
}
