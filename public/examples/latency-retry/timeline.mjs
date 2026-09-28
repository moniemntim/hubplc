// Virtual processing times for read-only retries; not a network simulator.
export function simulateRead({
  replyDelaysMs,
  totalDeadlineMs = 1000,
  maxAttempts = 3,
}) {
  if (
    !Array.isArray(replyDelaysMs) ||
    replyDelaysMs.length < maxAttempts ||
    replyDelaysMs.some(
      (n) => n !== null && (!Number.isSafeInteger(n) || n < 0 || n > 1000000),
    )
  )
    throw new RangeError(
      'provide a nonnegative integer delay or null for every attempt',
    );
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10)
    throw new RangeError('maxAttempts must be 1..10');
  if (
    !Number.isSafeInteger(totalDeadlineMs) ||
    totalDeadlineMs < 1 ||
    totalDeadlineMs > 1000000
  )
    throw new RangeError('totalDeadlineMs must be 1..1000000');
  const attempts = [];
  let sentAtMs = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (sentAtMs >= totalDeadlineMs)
      return { result: 'total-timeout', endedAtMs: totalDeadlineMs, attempts };
    const deadlineMs = Math.min(sentAtMs + 200, totalDeadlineMs);
    const delay = replyDelaysMs[attempt - 1];
    const responseAtMs = delay === null ? null : sentAtMs + delay;
    const success = responseAtMs !== null && responseAtMs < deadlineMs;
    const endedAtMs = success ? responseAtMs : deadlineMs;
    attempts.push({
      attempt,
      sentAtMs,
      deadlineMs,
      responseAtMs,
      endedAtMs,
      result: success ? 'completed' : 'timeout',
    });
    if (success) return { result: 'completed', endedAtMs, attempts };
    if (deadlineMs === totalDeadlineMs)
      return { result: 'total-timeout', endedAtMs, attempts };
    if (attempt === maxAttempts)
      return { result: 'attempts-exhausted', endedAtMs, attempts };
    sentAtMs = deadlineMs + 50;
  }
}
