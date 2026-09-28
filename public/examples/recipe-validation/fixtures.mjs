export const fixtures = {
  valid:
    '{"schema_version":"recipe-v3","recipe_id":"R1","temp":25,"speed":1200,"low":20,"high":80}',
  zero: '{"schema_version":"recipe-v3","recipe_id":"R0","temp":0,"speed":0,"low":0,"high":0}',
  r7: '{"schema_version":"recipe-v3","recipe_id":"R7","speed":"abc","low":20,"high":10}',
  multipleMissing: '{"schema_version":"recipe-v3"}',
  emptyString:
    '{"schema_version":"recipe-v3","recipe_id":"","temp":0,"speed":0,"low":0,"high":0}',
  nonFinite:
    '{"schema_version":"recipe-v3","recipe_id":"R8","temp":1e999,"speed":0,"low":0,"high":0}',
  invalidJsonNaN: '{"schema_version":"recipe-v3","recipe_id":"R8","temp":NaN}',
  unknown:
    '{"schema_version":"recipe-v3","recipe_id":"R9","temp":1,"speed":2,"low":3,"high":4,"speeed":2}',
  equalLowHigh:
    '{"schema_version":"recipe-v3","recipe_id":"R10","temp":-40,"speed":3000,"low":50,"high":50}',
  bounds:
    '{"schema_version":"recipe-v3","recipe_id":"R11","temp":180,"speed":0,"low":0,"high":100}',
  errorLimit: '{"schema_version":"recipe-v3","unexpected":1}',
  unsupportedVersion: '{"schema_version":"recipe-v2","recipe_id":"R12"}',
  nonObject: '[]',
};
