import { initialMatrix, matrixScan } from './abnormal-matrix-model.mjs';

const request = (nowMs, requestId, label) => ({
  nowMs,
  requestLevel: true,
  requestId,
  label,
});

const release = (nowMs, label) => ({ nowMs, label });

export const scenarioFixtures = {
  normal: [
    request(0, 17, 'accept request 17'),
    release(1, 'release request level'),
    { nowMs: 120, feedbackId: 17, label: 'matching feedback' },
    { nowMs: 180, ackId: 17, label: 'matching acknowledgement' },
  ],
  timeout: [
    request(0, 17, 'accept request 17'),
    release(1, 'release request level'),
    release(300, 'deadline reached'),
    { nowMs: 301, feedbackId: 17, label: 'late matching feedback' },
  ],
  busyReject: [
    request(0, 17, 'accept request 17'),
    release(1, 'release request level'),
    request(100, 18, 'request while busy'),
    release(101, 'release rejected request level'),
    { nowMs: 150, feedbackId: 17, label: 'original request completes' },
    { nowMs: 180, ackId: 17, label: 'acknowledge original result' },
  ],
  cancel: [
    request(0, 17, 'accept request 17'),
    release(1, 'release request level'),
    { nowMs: 120, cancel: true, label: 'cancel wins while running' },
    { nowMs: 350, feedbackId: 17, label: 'late matching feedback' },
    { nowMs: 360, reset: true, label: 'explicit reset clears terminal state' },
  ],
};

export function runFixture(steps) {
  let state = initialMatrix();
  return steps.map(({ label, ...input }) => {
    state = matrixScan(state, input);
    return { label, input, state };
  });
}

// Each boundary check starts a separate request, never reuses a live model.
export const boundaryFixtures = Object.fromEntries(
  [299, 300, 301].map((nowMs) => [
    `feedback-at-${nowMs}`,
    [
      request(0, 17, 'accept request 17'),
      release(1, 'release'),
      { nowMs, feedbackId: 17, label: 'deadline boundary feedback' },
    ],
  ]),
);
boundaryFixtures['cancel-timeout-feedback'] = [
  request(0, 17, 'accept request 17'),
  release(1, 'release'),
  {
    nowMs: 300,
    cancel: true,
    feedbackId: 17,
    label: 'three simultaneous inputs',
  },
];
