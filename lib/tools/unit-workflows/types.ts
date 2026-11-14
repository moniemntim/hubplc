export type WorkflowText = { zh: string; en: string };
export type UnitWorkflowGroup =
  | 'length'
  | 'temperature'
  | 'pressure'
  | 'angle'
  | 'speed'
  | 'time'
  | 'mass'
  | 'area'
  | 'volume'
  | 'power'
  | 'capacitance'
  | 'storage';
export type WorkflowField = {
  key: string;
  label: WorkflowText;
  defaultValue: string;
  unit?: string;
  hint?: WorkflowText;
  options?: Array<{ value: string; label: WorkflowText }>;
};
export type WorkflowRow = {
  label: WorkflowText;
  value: number | string | WorkflowText;
  unit?: string;
};
export type UnitWorkflow = {
  group: UnitWorkflowGroup;
  title: WorkflowText;
  description: WorkflowText;
  fields: WorkflowField[];
  calculate: (input: Record<string, string>) => WorkflowRow[];
  notes: WorkflowText[];
  sources: Array<{ label: WorkflowText; url: string }>;
};
