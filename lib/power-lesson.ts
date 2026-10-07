import { numberInput } from './tools/core.ts';

function inRange(
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

export function branchVoltageExample(
  sourceText: string,
  currentText: string,
  lengthText: string,
  resistancePerMeterText: string,
  contactResistanceText: string,
  minimumVoltageText: string,
) {
  const source = inRange(sourceText, '電源輸出', 1, 60);
  const current = inRange(currentText, '支路電流', 0, 50);
  const length = inRange(lengthText, '單程線長', 0, 1000);
  const resistancePerMeter = inRange(
    resistancePerMeterText,
    '每條導線電阻',
    0,
    10,
  );
  const contactResistance = inRange(
    contactResistanceText,
    '接點合計電阻',
    0,
    10,
  );
  const minimumVoltage = inRange(minimumVoltageText, '最低允許電壓', 0, 60);
  const loopResistance = 2 * length * resistancePerMeter + contactResistance;
  const drop = current * loopResistance;
  const loadVoltage = source - drop;
  const loss = current * current * loopResistance;
  return {
    loopResistance,
    drop,
    loadVoltage,
    loss,
    margin: loadVoltage - minimumVoltage,
    pass: loadVoltage >= minimumVoltage,
  };
}

export function redundancyExample(
  sourceText: string,
  singleAvailableText: string,
  loadText: string,
  isolatorDropText: string,
  wiringResistanceText: string,
  minimumVoltageText: string,
) {
  const source = inRange(sourceText, '單台輸出電壓', 1, 60);
  const singleAvailable = inRange(singleAvailableText, '單台可用電流', 0, 200);
  const load = inRange(loadText, '失效後需求電流', 0, 200);
  const isolatorDrop = inRange(isolatorDropText, '隔離元件壓降', 0, 20);
  const wiringResistance = inRange(wiringResistanceText, '共用路徑電阻', 0, 10);
  const minimumVoltage = inRange(minimumVoltageText, '最低允許電壓', 0, 60);
  const loadVoltage = source - isolatorDrop - load * wiringResistance;
  const capacityMargin = singleAvailable - load;
  const voltageMargin = loadVoltage - minimumVoltage;
  return {
    capacityMargin,
    voltageMargin,
    loadVoltage,
    capacityPass: capacityMargin >= 0,
    voltagePass: voltageMargin >= 0,
    pass: capacityMargin >= 0 && voltageMargin >= 0,
  };
}

export function hotPlugExample(
  voltageText: string,
  capacitanceText: string,
  currentLimitText: string,
  loadCurrentText: string,
) {
  const voltage = inRange(voltageText, '目標電壓', 1, 60);
  const capacitanceMicrofarad = inRange(
    capacitanceText,
    '輸入電容',
    0,
    1000000,
  );
  const currentLimit = inRange(currentLimitText, '限流值', 0, 200);
  const loadCurrent = inRange(loadCurrentText, '充電期間負載', 0, 200);
  const capacitance = capacitanceMicrofarad / 1000000;
  const chargeCurrent = currentLimit - loadCurrent;
  const energy = 0.5 * capacitance * voltage * voltage;
  const chargeTime =
    chargeCurrent > 0 ? (capacitance * voltage) / chargeCurrent : null;
  return {
    energy,
    chargeCurrent,
    chargeTime,
    canCharge: chargeTime !== null,
  };
}

export function eventCoverageExample(
  samplePeriodText: string,
  pulseDurationText: string,
  eventDeltaText: string,
  clockErrorText: string,
) {
  const samplePeriod = inRange(samplePeriodText, '取樣週期', 0.001, 3600000);
  const pulseDuration = inRange(pulseDurationText, '低壓持續時間', 0, 3600000);
  const eventDelta = inRange(eventDeltaText, '事件時間差', -3600000, 3600000);
  const clockError = inRange(clockErrorText, '單一裝置時間誤差', 0, 3600000);
  const detectionGuaranteed = pulseDuration >= samplePeriod;
  const relativeUncertainty = 2 * clockError;
  const ordered = Math.abs(eventDelta) > relativeUncertainty;
  const order = !ordered
    ? '時間重疊，不能判先後'
    : eventDelta > 0
      ? '事件 B 較晚'
      : '事件 B 較早';
  return {
    detectionGuaranteed,
    relativeUncertainty,
    ordered,
    order,
  };
}
