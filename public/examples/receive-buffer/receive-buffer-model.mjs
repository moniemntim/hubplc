const assertSafeIntegerInRange = (value, name, minimum, maximum) => {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new RangeError(
      `${name} must be a safe integer in [${minimum}, ${maximum}]`,
    );
};

const concat = (left, right) => {
  return Buffer.concat([left, right]);
};

export function createReceiver({
  maxPayload = 1000,
  queueCapacityBytes,
  maxInputBytes = 65536,
  maxFramingBytes = 4096,
}) {
  assertSafeIntegerInRange(maxPayload, 'maxPayload', 1, 65535);
  assertSafeIntegerInRange(queueCapacityBytes, 'queueCapacityBytes', 0, 65536);
  assertSafeIntegerInRange(maxInputBytes, 'maxInputBytes', 1, 65536);
  assertSafeIntegerInRange(maxFramingBytes, 'maxFramingBytes', 2, 65537);
  if (maxFramingBytes < maxPayload + 2)
    throw new RangeError(
      'maxFramingBytes must hold maxPayload plus its 2-byte header',
    );
  return {
    config: { maxPayload, queueCapacityBytes, maxInputBytes, maxFramingBytes },
    framing: Buffer.alloc(0),
    queue: [],
    queueBytes: 0,
    receivedBytes: 0,
    completedFrames: 0,
    completedPayloadBytes: 0,
    acceptedFrames: 0,
    acceptedPayloadBytes: 0,
    rejectedQueueFrames: 0,
    rejectedQueuePayloadBytes: 0,
    consumedFrames: 0,
    consumedPayloadBytes: 0,
    stopped: false,
    stopReason: null,
  };
}

const stopped = (state, reason) => ({
  ...state,
  framing: Buffer.alloc(0),
  stopped: true,
  stopReason: reason,
});

/**
 * Consumes a supplied byte chunk using a 2-byte big-endian payload length.
 * This is application framing over Node Buffer, not TCP or a socket model.
 */
export function ingestChunk(before, chunk) {
  if (!Buffer.isBuffer(chunk)) throw new TypeError('chunk must be a Buffer');
  if (before.stopped) return { state: before, event: 'STOPPED_IGNORED' };
  const { config } = before;
  if (chunk.length + before.receivedBytes > config.maxInputBytes)
    return {
      state: stopped(before, 'INPUT_LIMIT_EXCEEDED'),
      event: 'INPUT_LIMIT_EXCEEDED',
    };
  if (chunk.length + before.framing.length > config.maxFramingBytes)
    return {
      state: stopped(before, 'FRAMING_LIMIT_EXCEEDED'),
      event: 'FRAMING_LIMIT_EXCEEDED',
    };

  let state = {
    ...before,
    framing: concat(before.framing, chunk),
    receivedBytes: before.receivedBytes + chunk.length,
  };
  while (state.framing.length >= 2) {
    const payloadLength = (state.framing[0] << 8) | state.framing[1];
    if (payloadLength === 0)
      return { state: stopped(state, 'EMPTY_FRAME'), event: 'EMPTY_FRAME' };
    if (payloadLength > config.maxPayload)
      return {
        state: stopped(state, 'FRAME_TOO_LARGE'),
        event: 'FRAME_TOO_LARGE',
      };
    if (state.framing.length < payloadLength + 2) break;

    const payload = Buffer.from(state.framing.subarray(2, payloadLength + 2));
    const queueHasCapacity =
      state.queueBytes + payloadLength <= config.queueCapacityBytes;
    state = {
      ...state,
      framing: Buffer.from(state.framing.subarray(payloadLength + 2)),
      completedFrames: state.completedFrames + 1,
      completedPayloadBytes: state.completedPayloadBytes + payloadLength,
    };
    if (queueHasCapacity) {
      state = {
        ...state,
        queue: [...state.queue, payload],
        queueBytes: state.queueBytes + payloadLength,
        acceptedFrames: state.acceptedFrames + 1,
        acceptedPayloadBytes: state.acceptedPayloadBytes + payloadLength,
      };
    } else {
      state = {
        ...state,
        rejectedQueueFrames: state.rejectedQueueFrames + 1,
        rejectedQueuePayloadBytes:
          state.rejectedQueuePayloadBytes + payloadLength,
      };
    }
  }
  return { state, event: 'CHUNK_PROCESSED' };
}

export function consumeNext(before) {
  if (before.queue.length === 0) return { state: before, payload: null };
  const [payload, ...queue] = before.queue;
  return {
    state: {
      ...before,
      queue,
      queueBytes: before.queueBytes - payload.length,
      consumedFrames: before.consumedFrames + 1,
      consumedPayloadBytes: before.consumedPayloadBytes + payload.length,
    },
    payload,
  };
}

export function endOfInput(state) {
  if (state.stopped)
    return { status: 'STOPPED', framingBytes: 0, lossInferred: false };
  if (state.framing.length > 0)
    return {
      status: 'INCOMPLETE_FRAME_AT_EOF',
      framingBytes: state.framing.length,
      lossInferred: false,
    };
  return { status: 'COMPLETE', framingBytes: 0, lossInferred: false };
}

export function conservation(state) {
  return {
    completedPayloadMatchesDisposition:
      state.completedPayloadBytes ===
      state.acceptedPayloadBytes + state.rejectedQueuePayloadBytes,
    acceptedPayloadMatchesConsumerAndQueue:
      state.acceptedPayloadBytes ===
      state.consumedPayloadBytes + state.queueBytes,
  };
}

export function encodeFrame(payload) {
  if (!Buffer.isBuffer(payload))
    throw new TypeError('payload must be a Buffer');
  assertSafeIntegerInRange(payload.length, 'payload.length', 1, 65535);
  const frame = Buffer.alloc(payload.length + 2);
  frame[0] = payload.length >>> 8;
  frame[1] = payload.length & 0xff;
  frame.set(payload, 2);
  return frame;
}
