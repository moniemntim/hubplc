export const CAPACITY = 5;
export const MAX_EVENT_RECORDS = 20;
export const MAX_PRODUCT_RECORDS = 20;

const copy = (state) => ({
  ...state,
  slots: state.slots.map((x) => x && { ...x }),
  seen: state.seen.map((x) => ({ ...x })),
  products: [...state.products],
  events: [],
  event: 'none',
});
const note = (state, event) => {
  state.events.push(event);
  state.event = event;
};
const validProduct = (id) =>
  typeof id === 'string' &&
  id.length > 0 &&
  id.length <= 20 &&
  id.trim() === id &&
  !Array.from(id).some((character) => {
    const code = character.codePointAt(0);
    return code !== undefined && (code < 32 || code === 127);
  });
const validId = (id) =>
  typeof id === 'string' &&
  id.trim() === id &&
  /^E(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-5])-(?:[1-9]\d{0,5}|1000000)$/.test(id);
const exact = (value, keys) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));

export function initialFifo({
  maxEventRecords = MAX_EVENT_RECORDS,
  maxProductRecords = MAX_PRODUCT_RECORDS,
} = {}) {
  if (
    !Number.isSafeInteger(maxEventRecords) ||
    !Number.isSafeInteger(maxProductRecords) ||
    maxEventRecords < 1 ||
    maxProductRecords < 1 ||
    maxEventRecords > MAX_EVENT_RECORDS ||
    maxProductRecords > MAX_PRODUCT_RECORDS
  )
    throw new RangeError('record capacities invalid');
  return {
    head: 0,
    tail: 0,
    count: 0,
    slots: Array(CAPACITY).fill(null),
    completed: 0,
    seen: [],
    products: [],
    maxEventRecords,
    maxProductRecords,
    events: [],
    event: 'none',
  };
}

export const activeProducts = (state) =>
  Array.from({ length: state.count }, (_, offset) => ({
    ...state.slots[(state.head + offset) % CAPACITY],
  }));

export function fifoScan(state, input) {
  if (!exact(input, ['enqueue', 'stationEvent']))
    throw new TypeError('scan needs enqueue and stationEvent');
  const next = copy(state);
  if (input.enqueue !== null) {
    if (
      !exact(input.enqueue, ['productId']) ||
      !validProduct(input.enqueue.productId)
    )
      note(next, 'enqueue_rejected_product_id_invalid');
    else if (next.products.includes(input.enqueue.productId))
      note(next, 'enqueue_rejected_product_id_reused');
    else if (next.products.length >= next.maxProductRecords)
      note(next, 'enqueue_rejected_product_id_record_capacity');
    else if (next.count === CAPACITY) note(next, 'enqueue_rejected_full');
    else {
      next.slots[next.tail] = {
        productId: input.enqueue.productId,
        status: 'AT_S1',
      };
      next.tail = (next.tail + 1) % CAPACITY;
      next.count += 1;
      next.products.push(input.enqueue.productId);
      note(next, `enqueued_${input.enqueue.productId}`);
    }
  }
  const e = input.stationEvent;
  if (e === null) return next;
  if (
    !exact(e, ['eventId', 'productId', 'station', 'action']) ||
    !validId(e.eventId) ||
    !validProduct(e.productId) ||
    !['S1', 'S2'].includes(e.station) ||
    !['COMPLETE', 'SKIP'].includes(e.action)
  ) {
    note(next, 'station_rejected_event_shape_or_id');
    return next;
  }
  const payload = `${e.productId}\0${e.station}\0${e.action}`;
  const old = next.seen.find((x) => x.eventId === e.eventId);
  if (old) {
    note(
      next,
      old.payload === payload
        ? 'station_duplicate'
        : 'station_conflict_event_id_payload',
    );
    return next;
  }
  if (next.seen.length >= next.maxEventRecords) {
    note(next, 'station_rejected_event_record_capacity');
    return next;
  }
  next.seen.push({ eventId: e.eventId, payload });
  if (next.count === 0) {
    note(next, 'station_rejected_empty');
    return next;
  }
  const product = next.slots[next.head];
  if (product.productId !== e.productId) {
    note(next, 'station_rejected_product_mismatch');
    return next;
  }
  if (
    e.station === 'S1' &&
    e.action === 'COMPLETE' &&
    product.status === 'AT_S1'
  ) {
    product.status = 'AT_S2';
    note(next, `s1_complete_${product.productId}`);
    return next;
  }
  if (e.station === 'S1' && e.action === 'SKIP' && product.status === 'AT_S1') {
    product.status = 'SKIP_S1';
    note(next, `s1_skipped_${product.productId}`);
    return next;
  }
  if (
    e.station === 'S2' &&
    e.action === 'COMPLETE' &&
    ['AT_S2', 'SKIP_S1'].includes(product.status)
  ) {
    const id = product.productId;
    next.slots[next.head] = null;
    next.head = (next.head + 1) % CAPACITY;
    next.count -= 1;
    next.completed += 1;
    note(next, `dequeued_${id}`);
    return next;
  }
  note(next, 'station_rejected_station_or_order');
  return next;
}
