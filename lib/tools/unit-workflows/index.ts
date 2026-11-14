import { engineeringWorkflows } from './engineering.ts';
import { materialsWorkflows } from './materials.ts';
export const unitWorkflows = [...engineeringWorkflows, ...materialsWorkflows];
