'use client';
import AcPowerConverter from './ac-power-converter';
import EnergyCost from './energy-cost';
import {
  powerIntentPresets,
  energyIntentPresets,
  type PowerIntent,
} from '@/lib/tools/power-presets';
export { powerIntentPresets, energyIntentPresets };
export type { PowerIntent };

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
