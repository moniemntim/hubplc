export const sample = ({
  epoch = 1,
  seq,
  value,
  quality = 'Good',
  acquiredAt,
  receivedAt = acquiredAt,
  sourceChangedAt = null,
}) => ({ epoch, seq, value, quality, acquiredAt, receivedAt, sourceChangedAt });
