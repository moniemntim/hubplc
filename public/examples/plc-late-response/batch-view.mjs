// Presentation policy over the FC03 matcher; no socket or new matching protocol.
export function batchView(matcher, members, values, policy) {
  if (!['all', 'partial'].includes(policy))
    throw new TypeError('policy must be all or partial');
  if (!members.length) throw new RangeError('batch needs at least one member');
  const labels = members.map(({ label }) => label);
  if (
    labels.some((label) => typeof label !== 'string' || !label) ||
    new Set(labels).size !== labels.length
  )
    throw new RangeError('member labels must be nonempty and unique');
  const keys = members.map(
    ({ epoch, transactionId }) => `${epoch}:${transactionId}`,
  );
  if (new Set(keys).size !== keys.length)
    throw new RangeError('duplicate batch member');
  const records = members.map((member) => {
    const record = matcher.getRequest(member);
    if (!record) throw new RangeError('unknown batch member');
    return record;
  });
  const complete = records.every((record) => record.state === 'completed');
  const settled = records.every((record) => record.state !== 'pending');
  const visible = [];
  for (let index = 0; index < records.length; index++) {
    if (records[index].state !== 'completed' || (policy === 'all' && !complete))
      continue;
    const key = keys[index];
    if (!Object.hasOwn(values, key))
      throw new Error('completed member has no saved data');
    visible.push([members[index].label, [...values[key]]]);
  }
  return {
    status: complete ? 'complete' : settled ? 'incomplete' : 'waiting',
    settled,
    states: Object.fromEntries(
      records.map((record, index) => [members[index].label, record.state]),
    ),
    visible: Object.fromEntries(visible),
  };
}
