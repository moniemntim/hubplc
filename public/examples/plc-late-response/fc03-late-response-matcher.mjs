// Offline response matcher for an already-framed Modbus TCP FC03 response.
// It opens no socket, does not send bytes, and does not emulate a PLC.

const MAX_TRANSACTION_ID = 0xffff;

function assertSafeInteger(name, value, { minimum = 0, maximum } = {}) {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    (maximum !== undefined && value > maximum)
  ) {
    throw new RangeError(`${name} is outside its supported range.`);
  }
}

function assertPeer(peer) {
  if (typeof peer !== 'string' || peer.length === 0)
    throw new TypeError('peer must be a non-empty string.');
}

function assertBytes(pdu) {
  if (!(pdu instanceof Uint8Array) || pdu.length === 0)
    throw new TypeError('pdu must be a non-empty Uint8Array.');
}

function requestKey(epoch, transactionId) {
  return `${epoch}:${transactionId}`;
}

function publicRecord(record) {
  return {
    epoch: record.epoch,
    peer: record.peer,
    transactionId: record.transactionId,
    unitId: record.unitId,
    functionCode: record.functionCode,
    startAddress: record.startAddress,
    quantity: record.quantity,
    createdAtMs: record.createdAtMs,
    deadlineMs: record.deadlineMs,
    state: record.state,
    finalAtMs: record.finalAtMs,
    finalReason: record.finalReason,
  };
}

/**
 * A single logical Modbus TCP channel. `epoch` is local callback metadata,
 * captured when submitFc03() returns; it is not an on-wire Modbus field.
 */
export class Fc03LateResponseMatcher {
  #epoch;
  #peer;
  #nextTransactionId;
  #records = new Map();
  #lastNowMs = 0;

  constructor({ epoch, peer, initialTransactionId = 0 }) {
    assertSafeInteger('epoch', epoch, { minimum: 0 });
    assertPeer(peer);
    assertSafeInteger('initialTransactionId', initialTransactionId, {
      minimum: 0,
      maximum: MAX_TRANSACTION_ID,
    });
    this.#epoch = epoch;
    this.#peer = peer;
    this.#nextTransactionId = initialTransactionId;
  }

  get activeChannel() {
    return { epoch: this.#epoch, peer: this.#peer };
  }

  #observeProcessingTime(name, nowMs) {
    assertSafeInteger(name, nowMs, { minimum: 0 });
    if (nowMs < this.#lastNowMs) {
      throw new RangeError(
        `${name} must not be earlier than already processed time ${this.#lastNowMs}.`,
      );
    }
    this.#lastNowMs = nowMs;
  }

  #expirePendingThrough(nowMs) {
    const expired = [];
    for (const record of this.#records.values()) {
      if (
        record.epoch === this.#epoch &&
        record.state === 'pending' &&
        nowMs >= record.deadlineMs
      ) {
        record.state = 'expired';
        record.finalAtMs = nowMs;
        record.finalReason = 'deadline-reached';
        expired.push(publicRecord(record));
      }
    }
    return expired;
  }

  submitFc03({ unitId, startAddress, quantity, nowMs, deadlineMs }) {
    assertSafeInteger('unitId', unitId, { minimum: 0, maximum: 0xff });
    assertSafeInteger('startAddress', startAddress, {
      minimum: 0,
      maximum: 0xffff,
    });
    assertSafeInteger('quantity', quantity, { minimum: 1, maximum: 125 });
    if (startAddress + quantity > 0x10000) {
      throw new RangeError(
        'startAddress plus quantity must stay within the FC03 16-bit address range.',
      );
    }
    assertSafeInteger('nowMs', nowMs, { minimum: 0 });
    assertSafeInteger('deadlineMs', deadlineMs, { minimum: 0 });
    if (deadlineMs <= nowMs)
      throw new RangeError('deadlineMs must be after nowMs.');
    if (this.#nextTransactionId === null) {
      throw new RangeError(
        'Transaction IDs are exhausted for this epoch; externally close the old channel before advancing the epoch.',
      );
    }
    this.#observeProcessingTime('nowMs', nowMs);

    const transactionId = this.#nextTransactionId;
    this.#nextTransactionId =
      transactionId === MAX_TRANSACTION_ID ? null : transactionId + 1;
    const record = {
      epoch: this.#epoch,
      peer: this.#peer,
      transactionId,
      unitId,
      functionCode: 0x03,
      // These are request facts for audit only. FC03 responses do not echo them.
      startAddress,
      quantity,
      createdAtMs: nowMs,
      deadlineMs,
      state: 'pending',
      finalAtMs: null,
      finalReason: null,
    };
    this.#records.set(requestKey(this.#epoch, transactionId), record);
    return publicRecord(record);
  }

  expireThrough(nowMs) {
    this.#observeProcessingTime('nowMs', nowMs);
    return this.#expirePendingThrough(nowMs);
  }

  /**
   * `oldChannelClosed` is an assertion supplied by the caller after it has
   * closed and externally confirmed the old transport. This model does not
   * inspect a network socket itself.
   */
  advanceEpoch({ epoch, peer, nowMs, oldChannelClosed }) {
    assertSafeInteger('epoch', epoch, { minimum: this.#epoch + 1 });
    assertPeer(peer);
    assertSafeInteger('nowMs', nowMs, { minimum: 0 });
    if (oldChannelClosed !== true) {
      throw new Error(
        'Refusing epoch advance until the caller confirms the old channel is closed.',
      );
    }
    this.#observeProcessingTime('nowMs', nowMs);

    this.#expirePendingThrough(nowMs);
    for (const record of this.#records.values()) {
      if (record.epoch === this.#epoch && record.state === 'pending') {
        record.state = 'orphaned';
        record.finalAtMs = nowMs;
        record.finalReason = 'old-channel-closed-before-response';
      }
    }
    this.#epoch = epoch;
    this.#peer = peer;
    this.#nextTransactionId = 0;
    return this.activeChannel;
  }

  getRequest({ epoch, transactionId }) {
    assertSafeInteger('epoch', epoch, { minimum: 0 });
    assertSafeInteger('transactionId', transactionId, {
      minimum: 0,
      maximum: MAX_TRANSACTION_ID,
    });
    const record = this.#records.get(requestKey(epoch, transactionId));
    return record ? publicRecord(record) : null;
  }

  acceptCallback({ epoch, peer, transactionId, unitId, pdu, receivedAtMs }) {
    assertSafeInteger('epoch', epoch, { minimum: 0 });
    assertPeer(peer);
    assertSafeInteger('transactionId', transactionId, {
      minimum: 0,
      maximum: MAX_TRANSACTION_ID,
    });
    assertSafeInteger('unitId', unitId, { minimum: 0, maximum: 0xff });
    assertBytes(pdu);
    assertSafeInteger('receivedAtMs', receivedAtMs, { minimum: 0 });
    this.#observeProcessingTime('receivedAtMs', receivedAtMs);

    if (epoch !== this.#epoch) {
      return {
        classification: epoch < this.#epoch ? 'old-epoch' : 'unexpected-epoch',
        accepted: false,
      };
    }
    if (peer !== this.#peer)
      return { classification: 'wrong-peer', accepted: false };

    const record = this.#records.get(requestKey(epoch, transactionId));
    if (!record)
      return { classification: 'unknown-transaction', accepted: false };
    if (record.state === 'completed')
      return { classification: 'duplicate', accepted: false };
    if (record.state !== 'pending')
      return { classification: 'late-terminal', accepted: false };

    if (receivedAtMs >= record.deadlineMs) {
      record.state = 'expired';
      record.finalAtMs = receivedAtMs;
      record.finalReason = 'deadline-reached-before-callback';
      return { classification: 'late', accepted: false };
    }
    if (unitId !== record.unitId)
      return { classification: 'wrong-unit-id', accepted: false };

    const functionCode = pdu[0];
    if (functionCode === (record.functionCode | 0x80)) {
      if (pdu.length !== 2 || pdu[1] === 0)
        return { classification: 'invalid-exception-pdu', accepted: false };
      record.state = 'exception';
      record.finalAtMs = receivedAtMs;
      record.finalReason = `modbus-exception-${pdu[1]}`;
      return {
        classification: 'exception',
        accepted: true,
        exceptionCode: pdu[1],
      };
    }
    if (functionCode !== record.functionCode)
      return { classification: 'wrong-function', accepted: false };

    const expectedByteCount = record.quantity * 2;
    if (pdu[1] !== expectedByteCount)
      return { classification: 'wrong-byte-count', accepted: false };
    if (pdu.length !== expectedByteCount + 2)
      return { classification: 'wrong-pdu-length', accepted: false };

    record.state = 'completed';
    record.finalAtMs = receivedAtMs;
    record.finalReason = 'fc03-response-validated';
    return {
      classification: 'completed',
      accepted: true,
      data: pdu.slice(2),
    };
  }
}
