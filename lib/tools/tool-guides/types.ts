export type GuideText = { zh: string; en: string };

export type ToolGuideCase = {
  title: GuideText;
  inputs: Array<{
    label: GuideText;
    value: string | GuideText;
    source: GuideText;
  }>;
  steps: GuideText[];
  expected: GuideText[];
  interpretation: GuideText;
};

export type ToolGuideData = {
  task: GuideText;
  scope: GuideText;
  cases: ToolGuideCase[];
  pitfalls: GuideText[];
  related?: string[];
  sources?: Array<{ label: GuideText; url: string }>;
};
