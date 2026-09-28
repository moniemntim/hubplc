const exact = (x, keys) =>
  x !== null &&
  typeof x === 'object' &&
  Object.getPrototypeOf(x) === Object.prototype &&
  Reflect.ownKeys(x).length === keys.length &&
  keys.every(
    (k) =>
      Object.hasOwn(x, k) && Object.prototype.propertyIsEnumerable.call(x, k),
  );
const text = (x) =>
  typeof x === 'string' &&
  x.trim() === x &&
  x.length > 0 &&
  x.length <= 120 &&
  !Array.from(x).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
const time = (x) => Number.isSafeInteger(x) && x >= 0;
const goodItem = (x) =>
  exact(x, [
    'id',
    'asset',
    'occurrenceId',
    'active',
    'acked',
    'quality',
    'snapshotAt',
    'owner',
    'dueAt',
    'nextAction',
    'evidence',
  ]) &&
  ['id', 'asset', 'occurrenceId', 'owner', 'nextAction', 'evidence'].every(
    (k) => text(x[k]),
  ) &&
  typeof x.active === 'boolean' &&
  typeof x.acked === 'boolean' &&
  ['Good', 'Bad', 'Unknown'].includes(x.quality) &&
  time(x.snapshotAt) &&
  time(x.dueAt);
export const FRESH_MS = 60000;
export const MAX_ACTIONS = 16;
export class Handover {
  #items;
  #actions = [];
  #now;
  #id;
  constructor({ handoverId, items, at }) {
    if (
      !text(handoverId) ||
      !time(at) ||
      !Array.isArray(items) ||
      items.length < 1 ||
      items.length > 8 ||
      !items.every(goodItem) ||
      new Set(items.map((x) => x.id)).size !== items.length ||
      items.some((x) => x.snapshotAt > at)
    )
      throw new TypeError('invalid handover');
    this.#id = handoverId;
    this.#now = at;
    this.#items = structuredClone(items).map((x) => ({
      ...x,
      revision: 1,
      acceptedBy: null,
      acceptedAt: null,
    }));
  }
  #quality(item, at) {
    return item.quality === 'Good' && at - item.snapshotAt <= FRESH_MS;
  }
  act(request) {
    if (
      !exact(request, [
        'kind',
        'itemId',
        'actor',
        'expectedRevision',
        'at',
        'note',
      ]) ||
      !['accept', 'note'].includes(request.kind) ||
      !text(request.itemId) ||
      !text(request.actor) ||
      !Number.isSafeInteger(request.expectedRevision) ||
      request.expectedRevision < 1 ||
      !time(request.at) ||
      request.at < this.#now ||
      !text(request.note)
    )
      return { decision: 'INVALID_REQUEST' };
    const item = this.#items.find((x) => x.id === request.itemId);
    if (!item) return { decision: 'UNKNOWN_ITEM' };
    if (item.owner !== request.actor) return { decision: 'WRONG_OWNER' };
    if (item.revision !== request.expectedRevision)
      return { decision: 'REVISION_CONFLICT' };
    if (this.#actions.length >= MAX_ACTIONS)
      return { decision: 'CAPACITY_REACHED' };
    if (request.kind === 'accept' && !this.#quality(item, request.at))
      return { decision: 'NEEDS_CLARIFICATION' };
    item.revision++;
    item.acceptedBy = request.kind === 'accept' ? request.actor : null;
    item.acceptedAt = request.kind === 'accept' ? request.at : null;
    this.#now = request.at;
    this.#actions.push({
      ...structuredClone(request),
      revisionAfter: item.revision,
    });
    return {
      decision: request.kind === 'accept' ? 'ACCEPTED' : 'NOTE_APPENDED',
      revision: item.revision,
    };
  }
  report(at) {
    if (!time(at) || at < this.#now) throw new TypeError('invalid report time');
    const status = this.#items.some((x) => !this.#quality(x, at))
      ? 'NEEDS_CLARIFICATION'
      : this.#items.every((x) => x.acceptedBy !== null)
        ? 'RESPONSIBILITY_ACCEPTED'
        : 'AWAITING_ACCEPTANCE';
    return structuredClone({
      schemaVersion: 1,
      handoverId: this.#id,
      asOf: at,
      status,
      items: this.#items.map((x) => ({ ...x, overdue: at >= x.dueAt })),
      actions: this.#actions,
    });
  }
}
