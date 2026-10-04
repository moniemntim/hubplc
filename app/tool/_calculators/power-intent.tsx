'use client';
import AcPowerConverter, { type AcPowerPreset } from './ac-power-converter';
import EnergyCost, { type EnergyPreset } from './energy-cost';

export const powerIntentPresets = {
  'amps-to-watts': {
    mode: 'current-to-power',
    phase: 'single',
    unit: 'A',
    value: '10',
    other: '220',
    pf: '0.8',
    fixedMode: true,
  },
  'amps-to-kilowatts': {
    mode: 'current-to-power',
    phase: 'three',
    unit: 'A',
    value: '20',
    other: '380',
    pf: '0.8',
    fixedMode: true,
  },
  'amps-to-va': {
    mode: 'current-to-power',
    phase: 'single',
    unit: 'A',
    value: '10',
    other: '220',
    pf: '0.8',
    fixedMode: true,
  },
  'amps-to-kva': {
    mode: 'current-to-power',
    phase: 'three',
    unit: 'A',
    value: '20',
    other: '380',
    pf: '0.8',
    fixedMode: true,
  },
  'volts-to-watts': {
    mode: 'current-to-power',
    phase: 'single',
    unit: 'A',
    value: '10',
    other: '220',
    pf: '0.8',
    fixedMode: true,
  },
  'volts-to-amps': {
    mode: 'power-to-current',
    phase: 'single',
    unit: 'kW',
    value: '1',
    other: '220',
    pf: '0.8',
    fixedMode: true,
  },
  'watts-to-amps': {
    mode: 'power-to-current',
    phase: 'single',
    unit: 'W',
    value: '1000',
    other: '220',
    pf: '0.8',
    fixedMode: true,
  },
  'kw-to-amps': {
    mode: 'power-to-current',
    phase: 'three',
    unit: 'kW',
    value: '10',
    other: '380',
    pf: '0.8',
    fixedMode: true,
  },
  'kva-to-amps': {
    mode: 'apparent-to-current',
    phase: 'three',
    unit: 'kVA',
    value: '10',
    other: '380',
    fixedMode: true,
  },
  'mva-to-amps': {
    mode: 'apparent-to-current',
    phase: 'three',
    unit: 'MVA',
    value: '1',
    other: '11000',
    fixedMode: true,
  },
  'watts-to-volts': {
    mode: 'power-to-voltage',
    phase: 'single',
    unit: 'W',
    value: '1000',
    other: '5',
    pf: '0.8',
    fixedMode: true,
  },
  'kw-to-volts': {
    mode: 'power-to-voltage',
    phase: 'three',
    unit: 'kW',
    value: '10',
    other: '20',
    pf: '0.8',
    fixedMode: true,
  },
  'va-to-watts': {
    mode: 'apparent-to-real',
    phase: 'single',
    unit: 'VA',
    value: '1000',
    pf: '0.8',
    fixedMode: true,
  },
  'kva-to-kw': {
    mode: 'apparent-to-real',
    phase: 'single',
    unit: 'kVA',
    value: '10',
    pf: '0.8',
    fixedMode: true,
  },
  'watts-to-va': {
    mode: 'real-to-apparent',
    phase: 'single',
    unit: 'W',
    value: '1000',
    pf: '0.8',
    fixedMode: true,
  },
  'watts-to-kva': {
    mode: 'real-to-apparent',
    phase: 'single',
    unit: 'W',
    value: '1000',
    pf: '0.8',
    fixedMode: true,
  },
  'kw-to-kva': {
    mode: 'real-to-apparent',
    phase: 'single',
    unit: 'kW',
    value: '10',
    pf: '0.8',
    fixedMode: true,
  },
  'va-to-kva': {
    mode: 'apparent-units',
    phase: 'single',
    unit: 'VA',
    value: '1000',
    fixedMode: true,
  },
  'kva-to-va': {
    mode: 'apparent-units',
    phase: 'single',
    unit: 'kVA',
    value: '1',
    fixedMode: true,
  },
} as const satisfies Record<string, AcPowerPreset>;

export const energyIntentPresets = {
  'kw-to-kwh': {
    mode: 'from-power',
    unit: 'kW',
    value: '1',
    hours: '8',
    days: '1',
    rate: '0',
    fixedMode: true,
  },
  'watts-to-kwh': {
    mode: 'from-power',
    unit: 'W',
    value: '1000',
    hours: '8',
    days: '1',
    rate: '0',
    fixedMode: true,
  },
  'kwh-to-kw': {
    mode: 'from-energy',
    unit: 'kWh',
    value: '10',
    hours: '5',
    rate: '0',
    fixedMode: true,
  },
  'kwh-to-watts': {
    mode: 'from-energy',
    unit: 'kWh',
    value: '1',
    hours: '2',
    rate: '0',
    fixedMode: true,
  },
  'energy-consumption': {
    mode: 'from-power',
    unit: 'kW',
    value: '1',
    hours: '8',
    days: '30',
    rate: '0',
    fixedMode: true,
  },
  'electricity-cost': {
    mode: 'from-power',
    unit: 'kW',
    value: '1',
    hours: '8',
    days: '30',
    rate: '3',
    fixedMode: true,
  },
} as const satisfies Record<string, EnergyPreset>;

export type PowerIntent =
  | keyof typeof powerIntentPresets
  | keyof typeof energyIntentPresets;
export default function PowerIntentCalculator({
  intent,
}: {
  intent: PowerIntent;
}) {
  if (intent in energyIntentPresets)
    return (
      <EnergyCost
        preset={energyIntentPresets[intent as keyof typeof energyIntentPresets]}
      />
    );
  return (
    <AcPowerConverter
      preset={powerIntentPresets[intent as keyof typeof powerIntentPresets]}
    />
  );
}
