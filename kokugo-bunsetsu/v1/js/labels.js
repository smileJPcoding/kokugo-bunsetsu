export const LABELS = [
  { label: "主語", key: "subject" },
  { label: "述語", key: "predicate" },
  { label: "修飾語", key: "modifier" },
  { label: "接続語", key: "conjunction" },
  { label: "独立語", key: "independent" },
];

export const labelKey = (label) =>
  LABELS.find((l) => l.label === label)?.key ?? "";
