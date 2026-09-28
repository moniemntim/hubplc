function rangeOverlaps(start, end, range) {
  return start <= range.end && end >= range.start;
}

function rangeIsContained(start, end, block) {
  if (
    !block ||
    !Number.isInteger(block.start) ||
    !Number.isInteger(block.quantity) ||
    block.quantity < 1 ||
    block.quantity > 125
  )
    return false;
  const blockEnd = block.start + block.quantity - 1;
  return start >= block.start && end <= blockEnd;
}

/**
 * Validates a manually maintained FC03/FC04 read plan. It does not create,
 * split, reorder, or transmit requests.
 */
export function validateReadPlan(plan, map, requiredItems = []) {
  const address = (value) =>
    Number.isInteger(value) && value >= 0 && value <= 65535;
  if (
    !Array.isArray(plan) ||
    !Array.isArray(requiredItems) ||
    !map ||
    !address(map.minAddress) ||
    !address(map.maxAddress) ||
    map.minAddress > map.maxAddress ||
    !Number.isSafeInteger(map.deviceMaxQuantity) ||
    map.deviceMaxQuantity < 1 ||
    !Array.isArray(map.forbiddenRanges) ||
    map.forbiddenRanges.some(
      (range) =>
        !range ||
        !address(range.start) ||
        !address(range.end) ||
        range.start > range.end,
    )
  ) {
    throw new TypeError('Invalid read plan or register map');
  }
  const errors = [];
  const coveredAddresses = new Set();

  for (const block of plan) {
    if (!block || typeof block !== 'object') {
      errors.push({ code: 'invalid-block' });
      continue;
    }
    const { name, quantity, start } = block;
    const end = start + quantity - 1;

    if (!address(start) || !Number.isInteger(quantity) || quantity < 1) {
      errors.push({ code: 'invalid-quantity', name });
      continue;
    }
    if (quantity > 125) {
      errors.push({ code: 'protocol-cap', name, quantity });
      continue;
    }
    if (quantity > map.deviceMaxQuantity) {
      errors.push({ code: 'device-cap', name, quantity });
    }
    if (start < map.minAddress || end > map.maxAddress) {
      errors.push({ code: 'out-of-range', end, name, start });
      continue;
    }
    if (map.forbiddenRanges.some((range) => rangeOverlaps(start, end, range))) {
      errors.push({ code: 'forbidden-range', end, name, start });
    }

    for (let address = start; address <= end; address += 1) {
      if (coveredAddresses.has(address)) {
        errors.push({ address, code: 'overlap', name });
      }
      coveredAddresses.add(address);
    }
  }

  for (const item of requiredItems) {
    if (
      !item ||
      !address(item.start) ||
      !Number.isSafeInteger(item.width) ||
      item.width < 1 ||
      item.start + item.width - 1 > 65535
    ) {
      errors.push({ code: 'invalid-item' });
      continue;
    }
    const end = item.start + item.width - 1;
    if (!plan.some((block) => rangeIsContained(item.start, end, block))) {
      errors.push({
        code: 'item-crosses-block',
        end,
        name: item.name,
        start: item.start,
      });
    }
  }

  return { errors, valid: errors.length === 0, words: coveredAddresses.size };
}
