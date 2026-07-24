export const LABELS = [
  { label: "主語", key: "subject" },
  { label: "述語", key: "predicate" },
  { label: "修飾語", key: "modifier" },
  { label: "接続語", key: "conjunction" },
  { label: "独立語", key: "independent" },
];

export const labelKey = (label) =>
  LABELS.find((l) => l.label === label)?.key ?? "";

// プレイ画面で「今探しているもの」を示す小アイコン（収容リストのバッジ画像を流用）
export const LABEL_ICON = {
  predicate: "img/badges/scp096.svg",
  subject: "img/badges/scp173.svg",
  modifier: "img/badges/scp914.svg",
  conjunction: "img/badges/scp035.svg",
  independent: "img/badges/scp999.svg",
};
