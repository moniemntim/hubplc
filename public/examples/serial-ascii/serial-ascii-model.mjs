export const CONTRACT = Object.freeze({
  stx: 0x02,
  etx: 0x03,
  lengthDigits: 3,
  minPayloadBytes: 1,
  maxPayloadBytes: 128,
  frameTimeoutMs: 500,
  maxFrameBytes: 133,
});

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

const hex = (bytes) =>
  bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');

const assertSafeInteger = (value, name, minimum, maximum) => {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new RangeError(
      `${name} must be a safe integer in [${minimum}, ${maximum}]`,
    );
};

function validateConfiguration({ maxInputBytes, maxOutputFrames }) {
  assertSafeInteger(maxInputBytes, 'maxInputBytes', 1, 65536);
  assertSafeInteger(maxOutputFrames, 'maxOutputFrames', 1, 1024);
}

export function createParser({
  maxInputBytes = 4096,
  maxOutputFrames = 4,
} = {}) {
  validateConfiguration({ maxInputBytes, maxOutputFrames });
  return {
    config: { maxInputBytes, maxOutputFrames },
    stage: 'WAIT_STX',
    lastNow: 0,
    inputBytes: 0,
    frameBytes: [],
    lengthBytes: [],
    declaredLength: null,
    payloadBytes: [],
    deadline: null,
    published: [],
    stopped: false,
    fault: null,
  };
}

const fault = (state, reason, expected) => ({
  ...state,
  stage: 'STOPPED',
  deadline: null,
  stopped: true,
  fault: {
    reason,
    expected,
    receivedHex: hex(state.frameBytes),
    declaredLength: state.declaredLength,
    receivedPayloadBytes: state.payloadBytes.length,
  },
});

const withClock = (state, now) => {
  assertSafeInteger(now, 'now', 0, MAX_SAFE);
  if (now < state.lastNow) throw new RangeError('now must be nondecreasing');
  return { ...state, lastNow: now };
};

/** Advances only the model clock, so an incomplete frame can time out without a new byte. */
export function advanceParser(before, now) {
  const state = withClock(before, now);
  if (state.stopped) return { state, event: 'STOPPED' };
  if (state.deadline !== null && now >= state.deadline)
    return {
      state: fault(state, 'TIMEOUT_REJECTED', 'NEXT_BYTE_BEFORE_DEADLINE'),
      event: 'TIMEOUT_REJECTED',
    };
  return { state, event: 'ADVANCED' };
}

const appendFrameByte = (state, byte) => {
  if (state.frameBytes.length >= CONTRACT.maxFrameBytes)
    return fault(state, 'BUFFER_LIMIT_REJECTED', 'FRAME_AT_MOST_133_BYTES');
  return { ...state, frameBytes: [...state.frameBytes, byte] };
};

const startFrame = (state, now) => {
  if (now > MAX_SAFE - CONTRACT.frameTimeoutMs)
    throw new RangeError('now cannot represent the STX deadline safely');
  return {
    ...state,
    stage: 'LENGTH',
    frameBytes: [CONTRACT.stx],
    lengthBytes: [],
    declaredLength: null,
    payloadBytes: [],
    deadline: now + CONTRACT.frameTimeoutMs,
  };
};

const decimalLength = (bytes) =>
  (bytes[0] - 0x30) * 100 + (bytes[1] - 0x30) * 10 + (bytes[2] - 0x30);

const publish = (state) => {
  if (state.published.length >= state.config.maxOutputFrames)
    return fault(state, 'OUTPUT_LIMIT_REJECTED', 'OUTPUT_QUEUE_SPACE');
  const frame = {
    length: state.declaredLength,
    payloadHex: hex(state.payloadBytes),
    frameHex: hex(state.frameBytes),
  };
  return {
    ...state,
    stage: 'WAIT_STX',
    frameBytes: [],
    lengthBytes: [],
    declaredLength: null,
    payloadBytes: [],
    deadline: null,
    published: [...state.published, frame],
  };
};

/**
 * Processes exactly one byte. Bytes received at the deadline are rejected by
 * advanceParser before this byte is considered.
 */
export function feedByte(before, byte, now) {
  const advanced = advanceParser(before, now);
  let state = advanced.state;
  if (state.stopped) return { state, event: advanced.event };
  assertSafeInteger(byte, 'byte', 0, 255);
  if (state.inputBytes >= state.config.maxInputBytes)
    return {
      state: fault(
        state,
        'INPUT_LIMIT_REJECTED',
        'INPUT_AT_MOST_CONFIGURED_LIMIT',
      ),
      event: 'INPUT_LIMIT_REJECTED',
    };
  state = { ...state, inputBytes: state.inputBytes + 1 };

  if (state.stage === 'WAIT_STX') {
    if (byte !== CONTRACT.stx) return { state, event: 'IDLE_BYTE_IGNORED' };
    return { state: startFrame(state, now), event: 'STX_STARTED' };
  }

  state = appendFrameByte(state, byte);
  if (state.stopped) return { state, event: state.fault.reason };
  if (state.stage === 'LENGTH') {
    if (byte < 0x30 || byte > 0x39)
      return {
        state: fault(
          state,
          'LENGTH_SYNTAX_REJECTED',
          'ASCII_DECIMAL_0x30_TO_0x39',
        ),
        event: 'LENGTH_SYNTAX_REJECTED',
      };
    const lengthBytes = [...state.lengthBytes, byte];
    state = { ...state, lengthBytes };
    if (lengthBytes.length < CONTRACT.lengthDigits)
      return { state, event: 'LENGTH_PARTIAL' };
    const declaredLength = decimalLength(lengthBytes);
    if (
      declaredLength < CONTRACT.minPayloadBytes ||
      declaredLength > CONTRACT.maxPayloadBytes
    )
      return {
        state: fault(
          { ...state, declaredLength },
          'LENGTH_RANGE_REJECTED',
          'LENGTH_1_TO_128',
        ),
        event: 'LENGTH_RANGE_REJECTED',
      };
    return {
      state: { ...state, stage: 'PAYLOAD', declaredLength },
      event: 'LENGTH_ACCEPTED',
    };
  }

  if (state.stage === 'PAYLOAD') {
    if (byte < 0x20 || byte > 0x7e)
      return {
        state: fault(state, 'PAYLOAD_REJECTED', 'PRINTABLE_ASCII_0x20_TO_0x7e'),
        event: 'PAYLOAD_REJECTED',
      };
    const payloadBytes = [...state.payloadBytes, byte];
    const next = { ...state, payloadBytes };
    return {
      state:
        payloadBytes.length === state.declaredLength
          ? { ...next, stage: 'ETX' }
          : next,
      event:
        payloadBytes.length === state.declaredLength
          ? 'PAYLOAD_COMPLETE'
          : 'PAYLOAD_PARTIAL',
    };
  }

  if (byte !== CONTRACT.etx)
    return {
      state: fault(state, 'ETX_REJECTED', 'ETX_0x03'),
      event: 'ETX_REJECTED',
    };
  const published = publish(state);
  return {
    state: published,
    event: published.stopped ? published.fault.reason : 'FRAME_PUBLISHED',
  };
}
