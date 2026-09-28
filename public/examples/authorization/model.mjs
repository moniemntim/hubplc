// In-memory teaching authority, not an authentication server or PLC driver.
export const MAX_OPERATIONS = 16;
export const MAX_AUDIT = 64;
const roles = ['Viewer', 'Operator', 'Supervisor', 'Maintenance'];
const exact = (x, keys) =>
  x !== null &&
  typeof x === 'object' &&
  Object.getPrototypeOf(x) === Object.prototype &&
  Reflect.ownKeys(x).length === keys.length &&
  keys.every(
    (k) =>
      Object.hasOwn(x, k) && Object.prototype.propertyIsEnumerable.call(x, k),
  );
const id = (x) =>
  typeof x === 'string' && /^[A-Z][A-Z0-9-]{0,19}$/.test(x) && x.trim() === x;
const clock = (x) => Number.isSafeInteger(x) && x >= 0;
export class TeachingAuthority {
  #now = 0;
  #available = true;
  #audit = [];
  #ops = new Map();
  #users = {
    V: { role: 'Viewer', revision: 12 },
    O: { role: 'Operator', revision: 12 },
    S: { role: 'Supervisor', revision: 12 },
    M: { role: 'Maintenance', revision: 12 },
  };
  #sessions = {
    V: { user: 'V', expiresAt: 600000 },
    O: { user: 'O', expiresAt: 600000 },
    S: { user: 'S', expiresAt: 600000 },
    T: { user: 'S', expiresAt: 600000 },
    M: { user: 'M', expiresAt: 600000 },
  };
  #device = { value: 80, revision: 1, writes: 0, writeEnabled: true };
  #begin(now) {
    if (!clock(now) || now < this.#now)
      throw new TypeError('monotonic clock required');
    this.#now = now;
    return this.#audit.length < MAX_AUDIT;
  }
  #log(action, details = {}) {
    this.#audit.push({ at: this.#now, action, ...details });
  }
  #authorize(sessionId, target, write) {
    if (!this.#available) return { reason: 'AUTHORITY_UNAVAILABLE' };
    const session = Object.hasOwn(this.#sessions, sessionId)
      ? this.#sessions[sessionId]
      : null;
    if (!session || this.#now >= session.expiresAt)
      return { reason: 'SESSION_EXPIRED_OR_UNKNOWN' };
    const policy = this.#users[session.user];
    if (target !== 'A') return { reason: 'RESOURCE_DENIED' };
    if (write && policy.role !== 'Supervisor') return { reason: 'ROLE_DENIED' };
    return {
      reason: null,
      user: session.user,
      role: policy.role,
      policyRevision: policy.revision,
    };
  }
  // The caller supplies a fixture session handle. Real authentication is absent.
  read(sessionId, target, now) {
    if (!this.#begin(now)) return { decision: 'AUDIT_FULL' };
    const auth = this.#authorize(sessionId, target, false);
    if (auth.reason) {
      this.#log('READ_DENIED', { reason: auth.reason });
      return { decision: auth.reason };
    }
    this.#log('READ', { user: auth.user, policyRevision: auth.policyRevision });
    return {
      decision: 'READ',
      target,
      value: this.#device.value,
      revision: this.#device.revision,
      role: auth.role,
      policyRevision: auth.policyRevision,
      canSubmit: auth.role === 'Supervisor',
    };
  }
  submit(sessionId, payload, now) {
    if (!this.#begin(now)) return { decision: 'AUDIT_FULL' };
    const denied = (reason) => {
      this.#log('SUBMIT_DENIED', { reason });
      return { decision: reason };
    };
    if (
      !exact(payload, ['operationId', 'target', 'value', 'expectedRevision']) ||
      !id(payload.operationId) ||
      !id(payload.target) ||
      !Number.isSafeInteger(payload.value) ||
      !Number.isSafeInteger(payload.expectedRevision) ||
      payload.expectedRevision < 1
    )
      return denied('INVALID_REQUEST');
    const auth = this.#authorize(sessionId, payload.target, true);
    if (auth.reason) return denied(auth.reason);
    const prior = this.#ops.get(payload.operationId);
    if (prior) {
      if (
        prior.user !== auth.user ||
        prior.sessionId !== sessionId ||
        JSON.stringify(prior.payload) !==
          JSON.stringify({
            operationId: payload.operationId,
            target: payload.target,
            value: payload.value,
            expectedRevision: payload.expectedRevision,
          })
      )
        return denied('OPERATION_CONFLICT');
      this.#log('REPLAY', { operationId: payload.operationId });
      return { decision: 'REPLAY', status: prior.status, result: prior.result };
    }
    if (payload.value < 60 || payload.value > 100)
      return denied('RANGE_DENIED');
    if (payload.expectedRevision !== this.#device.revision)
      return denied('REVISION_CONFLICT');
    if (!this.#device.writeEnabled) return denied('DEVICE_NOT_READY');
    if (this.#ops.size >= MAX_OPERATIONS) return denied('OPERATIONS_FULL');
    const canonical = {
      operationId: payload.operationId,
      target: payload.target,
      value: payload.value,
      expectedRevision: payload.expectedRevision,
    };
    this.#ops.set(payload.operationId, {
      payload: canonical,
      sessionId,
      user: auth.user,
      policyRevision: auth.policyRevision,
      status: 'QUEUED',
      result: null,
    });
    this.#log('QUEUED', {
      operationId: payload.operationId,
      user: auth.user,
      policyRevision: auth.policyRevision,
    });
    return { decision: 'QUEUED' };
  }
  // Simulator dispatcher, representing a trusted worker's execution boundary.
  execute(operationId, now) {
    if (!this.#begin(now)) return { decision: 'AUDIT_FULL' };
    const op = this.#ops.get(operationId);
    if (!op) {
      this.#log('DISPATCH_UNKNOWN');
      return { decision: 'UNKNOWN_OPERATION' };
    }
    if (op.status !== 'QUEUED') {
      this.#log('ALREADY_TERMINAL', { operationId });
      return {
        decision: 'ALREADY_TERMINAL',
        status: op.status,
        result: op.result,
      };
    }
    const auth = this.#authorize(op.sessionId, op.payload.target, true);
    let reason = auth.reason;
    if (!reason && auth.policyRevision !== op.policyRevision)
      reason = 'AUTHORIZATION_CHANGED';
    if (!reason && op.payload.expectedRevision !== this.#device.revision)
      reason = 'REVISION_CONFLICT';
    if (!reason && !this.#device.writeEnabled) reason = 'DEVICE_NOT_READY';
    if (reason) {
      op.status = 'REJECTED';
      op.result = reason;
      this.#log('EXECUTION_REJECTED', { operationId, reason });
      return { decision: reason };
    }
    this.#device.value = op.payload.value;
    this.#device.revision++;
    this.#device.writes++;
    op.status = 'APPLIED';
    op.result = 'APPLIED';
    this.#log('APPLIED', {
      operationId,
      user: op.user,
      policyRevision: auth.policyRevision,
      value: this.#device.value,
      revision: this.#device.revision,
    });
    return {
      decision: 'APPLIED',
      value: this.#device.value,
      revision: this.#device.revision,
    };
  }
  // Trusted fixture controls, never endpoints that an HMI client may call.
  changeRole(role, now) {
    if (!roles.includes(role)) throw new TypeError('unknown role');
    if (!this.#begin(now)) return { decision: 'AUDIT_FULL' };
    this.#users.S = { role, revision: this.#users.S.revision + 1 };
    this.#log('POLICY_CHANGED', { user: 'S', ...this.#users.S });
    return { decision: 'POLICY_CHANGED', ...this.#users.S };
  }
  setAvailable(available, now) {
    if (typeof available !== 'boolean') throw new TypeError('boolean required');
    if (!this.#begin(now)) return { decision: 'AUDIT_FULL' };
    this.#available = available;
    this.#log('AUTHORITY_AVAILABILITY', { available });
    return { decision: 'UPDATED' };
  }
  setDeviceReady(ready, now) {
    if (typeof ready !== 'boolean') throw new TypeError('boolean required');
    if (!this.#begin(now)) return { decision: 'AUDIT_FULL' };
    this.#device.writeEnabled = ready;
    this.#log('DEVICE_READINESS', { ready });
    return { decision: 'UPDATED' };
  }
  inspect() {
    return structuredClone({
      now: this.#now,
      device: this.#device,
      operations: [...this.#ops.values()],
      audit: this.#audit,
      policy: this.#users.S,
    });
  }
}
export const request = (
  operationId = 'OP1',
  value = 95,
  expectedRevision = 1,
  target = 'A',
) => ({ operationId, target, value, expectedRevision });
