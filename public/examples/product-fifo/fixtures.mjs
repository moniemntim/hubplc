export const enq = (productId) => ({
  enqueue: { productId },
  stationEvent: null,
});
export const evt = (eventId, productId, station, action) => ({
  enqueue: null,
  stationEvent: { eventId, productId, station, action },
});
export const five = [
  enq('P01'),
  enq('P02'),
  enq('P03'),
  enq('P04'),
  enq('P05'),
  evt('E1-1', 'P01', 'S1', 'COMPLETE'),
  evt('E1-2', 'P01', 'S2', 'COMPLETE'),
  evt('E1-3', 'P02', 'S1', 'COMPLETE'),
  evt('E1-4', 'P02', 'S2', 'COMPLETE'),
  evt('E1-5', 'P03', 'S1', 'SKIP'),
  evt('E1-6', 'P03', 'S2', 'COMPLETE'),
  evt('E1-7', 'P04', 'S1', 'COMPLETE'),
  evt('E1-8', 'P04', 'S2', 'COMPLETE'),
  evt('E1-9', 'P05', 'S1', 'COMPLETE'),
  evt('E1-10', 'P05', 'S2', 'COMPLETE'),
  evt('E1-2', 'P01', 'S2', 'COMPLETE'),
];
export const wrap = [
  enq('P01'),
  enq('P02'),
  enq('P03'),
  enq('P04'),
  enq('P05'),
  evt('E2-1', 'P01', 'S1', 'COMPLETE'),
  {
    enqueue: { productId: 'P06' },
    stationEvent: {
      eventId: 'E2-2',
      productId: 'P01',
      station: 'S2',
      action: 'COMPLETE',
    },
  },
  enq('P06'),
];
