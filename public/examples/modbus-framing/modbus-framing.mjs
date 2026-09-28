/**
 * Offline Modbus TCP framing helpers. They consume bytes only; no socket or
 * device I/O is performed here.
 */
export function hexToBytes(hex) {
  const compact = hex.replaceAll(/\s+/g, '');

  if (
    compact.length === 0 ||
    compact.length % 2 !== 0 ||
    !/^[0-9a-f]+$/iu.test(compact)
  ) {
    throw new Error(
      'Hex input must contain a non-empty even number of hexadecimal characters.',
    );
  }

  return Uint8Array.from(compact.match(/../gu), (pair) =>
    Number.parseInt(pair, 16),
  );
}

export function parseAdu(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 8) {
    throw new Error(
      'A Modbus TCP ADU needs at least a 6-byte prefix plus Unit ID and Function Code.',
    );
  }

  const transactionId = (bytes[0] << 8) | bytes[1];
  const protocolId = (bytes[2] << 8) | bytes[3];
  const length = (bytes[4] << 8) | bytes[5];

  if (protocolId !== 0) {
    throw new Error(
      `Unsupported Protocol ID: 0x${protocolId.toString(16).padStart(4, '0')}.`,
    );
  }
  if (length < 2 || length > 254) {
    throw new Error(`Invalid MBAP Length: ${length}.`);
  }
  if (bytes.length !== 6 + length) {
    throw new Error(
      `ADU has ${bytes.length} bytes but MBAP Length requires ${6 + length}.`,
    );
  }

  return {
    transactionId,
    protocolId,
    length,
    unitId: bytes[6],
    pdu: bytes.slice(7),
  };
}

export function appendAndExtract(remainder, chunk) {
  if (!(remainder instanceof Uint8Array) || !(chunk instanceof Uint8Array)) {
    throw new TypeError('remainder and chunk must be Uint8Array values.');
  }

  const buffered = new Uint8Array(remainder.length + chunk.length);
  buffered.set(remainder);
  buffered.set(chunk, remainder.length);

  const frames = [];
  let offset = 0;
  while (buffered.length - offset >= 6) {
    const length = (buffered[offset + 4] << 8) | buffered[offset + 5];
    if (length < 2 || length > 254) {
      throw new Error(`Invalid MBAP Length: ${length}.`);
    }

    const aduLength = 6 + length;
    if (buffered.length - offset < aduLength) {
      break;
    }

    frames.push(parseAdu(buffered.slice(offset, offset + aduLength)));
    offset += aduLength;
  }

  return { frames, remainder: buffered.slice(offset) };
}
