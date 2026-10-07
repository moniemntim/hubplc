import { numberInput } from './tools/core.ts';

function bounded(
  text: string,
  label: string,
  minimum: number,
  maximum: number,
) {
  const value = numberInput(text, label);
  if (value < minimum || value > maximum)
    throw new Error(`${label}限 ${minimum}–${maximum}。`);
  return value;
}

export function analogLoadExample(
  sourceText: string,
  outputResistanceText: string,
  inputResistanceText: string,
  groundOffsetText: string,
) {
  const source = bounded(sourceText, '輸出設定', 0, 20);
  const outputResistance = bounded(
    outputResistanceText,
    '輸出電阻',
    0,
    10000000,
  );
  const inputResistance = bounded(
    inputResistanceText,
    '輸入阻抗',
    0.001,
    1000000000,
  );
  const groundOffset = bounded(groundOffsetText, '地電位差', -20, 20);
  const loaded =
    (source * inputResistance) / (outputResistance + inputResistance);
  const measured = loaded + groundOffset;
  const loadingError = source === 0 ? 0 : ((loaded - source) / source) * 100;
  return {
    loaded,
    measured,
    loadingError,
    outside: measured < 0 || measured > 10,
  };
}

export function switchLossExample(
  supplyText: string,
  currentText: string,
  mosfetResistanceText: string,
  bjtDropText: string,
  inductanceText: string,
  clampVoltageText: string,
) {
  const supply = bounded(supplyText, '電源電壓', 0, 60);
  const current = bounded(currentText, '負載電流', 0, 100);
  const mosfetResistance = bounded(
    mosfetResistanceText,
    'MOSFET 導通電阻',
    0,
    100,
  );
  const bjtDrop = bounded(bjtDropText, 'BJT 飽和壓降', 0, 20);
  const inductanceMillihenry = bounded(inductanceText, '線圈電感', 0, 100000);
  const clampVoltage = bounded(clampVoltageText, '關斷箝位電壓', 0.001, 1000);
  const mosfetDrop = current * mosfetResistance;
  const mosfetLoss = current * mosfetDrop;
  const bjtLoss = current * bjtDrop;
  const energy = 0.5 * (inductanceMillihenry / 1000) * current * current;
  const idealDecay = ((inductanceMillihenry / 1000) * current) / clampVoltage;
  return {
    mosfetDrop,
    mosfetLoss,
    bjtLoss,
    mosfetLoadVoltage: supply - mosfetDrop,
    bjtLoadVoltage: supply - bjtDrop,
    energy,
    idealDecay,
  };
}

export function inputProtectionExample(
  minimumInputText: string,
  maximumNormalText: string,
  currentText: string,
  seriesDropText: string,
  wiringResistanceText: string,
  minimumLoadText: string,
  tvsWorkingText: string,
  tvsClampText: string,
  absoluteMaximumText: string,
) {
  const minimumInput = bounded(minimumInputText, '最低正常輸入', 0, 1000);
  const maximumNormal = bounded(maximumNormalText, '最高正常輸入', 0, 1000);
  const current = bounded(currentText, '連續電流', 0, 200);
  const seriesDrop = bounded(seriesDropText, '反接元件壓降', 0, 100);
  const wiringResistance = bounded(
    wiringResistanceText,
    '配線回路電阻',
    0,
    100,
  );
  const minimumLoad = bounded(minimumLoadText, '負載最低電壓', 0, 1000);
  const tvsWorking = bounded(tvsWorkingText, 'TVS VRWM', 0, 2000);
  const tvsClamp = bounded(tvsClampText, 'TVS 最大箝位', 0, 2000);
  const absoluteMaximum = bounded(
    absoluteMaximumText,
    '下游絕對最大電壓',
    0,
    2000,
  );
  if (minimumInput > maximumNormal)
    throw new Error('最低正常輸入不得高於最高正常輸入。');
  const loadVoltage = minimumInput - seriesDrop - current * wiringResistance;
  const loss = current * seriesDrop;
  const lowSidePass = loadVoltage >= minimumLoad;
  const normalPass = tvsWorking >= maximumNormal;
  const clampPass = tvsClamp <= absoluteMaximum;
  return {
    loadVoltage,
    loss,
    lowSidePass,
    normalPass,
    clampPass,
    pass: lowSidePass && normalPass && clampPass,
  };
}

export function actuatorPathExample(
  positiveText: string,
  negativeText: string,
  resistanceText: string,
  measuredCurrentText: string,
  minimumVoltageText: string,
) {
  const positive = bounded(positiveText, '線圈正端', -100, 100);
  const negative = bounded(negativeText, '線圈負端', -100, 100);
  const resistance = bounded(resistanceText, '線圈電阻', 0.001, 1000000);
  const measuredCurrent = bounded(measuredCurrentText, '實測電流', 0, 100);
  const minimumVoltage = bounded(minimumVoltageText, '最低線圈電壓', 0, 100);
  const coilVoltage = Math.abs(positive - negative);
  const expectedCurrent = coilVoltage / resistance;
  const currentRatio =
    expectedCurrent === 0 ? null : measuredCurrent / expectedCurrent;
  const verdict =
    coilVoltage < minimumVoltage
      ? '先查供電、輸出與返回路徑'
      : currentRatio !== null && currentRatio < 0.5
        ? '電壓存在但電流不足，查開路或高阻'
        : '電氣層初步成立，往閥、氣源與機構查';
  return { coilVoltage, expectedCurrent, currentRatio, verdict };
}
