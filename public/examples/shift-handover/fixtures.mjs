export const at = Date.parse('2026-09-17T07:00:00+08:00');
export const items = [
  {
    id: 'H1',
    asset: 'P-01',
    occurrenceId: 'O1',
    active: true,
    acked: true,
    quality: 'Good',
    snapshotAt: at,
    owner: '早班甲',
    dueAt: at + 1800000,
    nextAction: '依巡檢程序檢查入口壓力',
    evidence: '趨勢 T01；夜班濾網檢查後仍低流量',
  },
  {
    id: 'H2',
    asset: 'P-02',
    occurrenceId: 'O2',
    active: false,
    acked: true,
    quality: 'Good',
    snapshotAt: at,
    owner: '早班甲',
    dueAt: at + 3600000,
    nextAction: '確認溫度恢復後的現場狀態',
    evidence: '事件 O2 已 Clear；巡檢單 W02 尚未完成',
  },
];
export const request = (
  itemId,
  expectedRevision,
  time = at,
  kind = 'accept',
  note = '已閱讀，接手後依下一步追蹤',
) => ({ kind, itemId, actor: '早班甲', expectedRevision, at: time, note });
