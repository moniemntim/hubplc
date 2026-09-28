export const ack = (
  occurrenceId,
  expectedRevision,
  requestId,
  actor = 'Operator',
  comment = 'seen',
) => ({ occurrenceId, expectedRevision, requestId, actor, comment });
