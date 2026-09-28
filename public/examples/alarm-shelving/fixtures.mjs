export const goodActive = (sourceAt, epoch = 1) => ({
  epoch,
  active: true,
  acked: false,
  quality: 'Good',
  sourceAt,
});
export const clearGood = (sourceAt, epoch = 1) => ({
  epoch,
  active: false,
  acked: false,
  quality: 'Good',
  sourceAt,
});
export const shelve = (
  requestId,
  durationMs = 10,
  owner = 'OP17',
  reason = 'noisy during check',
  epoch = 1,
) => ({ epoch, requestId, actor: 'Operator', owner, reason, durationMs });
export const unshelve = (epoch = 1) => ({ epoch, actor: 'Operator' });
