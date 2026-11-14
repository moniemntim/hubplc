import type { ToolSlug } from '../registry';
import type { ToolGuideData } from './types';
import { electricalPlcGuides } from './electrical-plc.ts';
import { encodingGuides } from './encoding.ts';
import { unitsTimeGuides } from './units-time.ts';
import { randomTaskGuides } from './random-tasks.ts';
import { sampleDataGuides } from './sample-data.ts';
import { dataUtilityGuides } from './data-utilities.ts';
import { networkInfoGuides } from './network-info.ts';

export const retainedGuideSlugs: readonly string[] = [
  'analog',
  'plc-scaling',
  'base-converter',
  'modbus-address',
  'modbus-crc',
  'register-converter',
  'ac-power-converter',
  'energy-cost',
];

export const toolGuides: Partial<Record<ToolSlug, ToolGuideData>> = {
  ...electricalPlcGuides,
  ...encodingGuides,
  ...unitsTimeGuides,
  ...randomTaskGuides,
  ...sampleDataGuides,
  ...dataUtilityGuides,
  ...networkInfoGuides,
};
