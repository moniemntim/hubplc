// Offline teaching model: internal fault latch only, no physical output.
export const initialReset = () => ({ fault: true, armed: false, accepted: 0 });

export function resetScan(before, { valid, button, cause }) {
  if (![valid, button, cause].every((value) => typeof value === 'boolean'))
    throw new TypeError('valid, button and cause must be boolean');
  const next = { ...before, pulse: false, reason: 'idle' };
  if (cause) next.fault = true;
  if (!valid) {
    next.armed = false;
    next.reason = 'invalid';
    return next;
  }
  if (!button) {
    next.armed = true;
    next.reason = 'released';
    return next;
  }
  next.armed = false;
  if (!before.armed) next.reason = 'wait-release';
  else if (cause) next.reason = 'cause-active';
  else if (!next.fault) next.reason = 'no-fault';
  else {
    next.fault = false;
    next.pulse = true;
    next.accepted += 1;
    next.reason = 'accepted';
  }
  return next;
}
