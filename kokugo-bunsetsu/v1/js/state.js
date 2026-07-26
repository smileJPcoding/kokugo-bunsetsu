import { badges } from "./data/badges.js";

const STORAGE_KEY = "kokugo-bunsetsu-progress";

const MARK_RANK = { "〇": 1, "◎": 2, "★": 3 };

const RP_GROWTH_RATE = 1.15; // 研究レベルが1上がるごとの倍率（クッキークリッカー的な増幅曲線）
const STAR_GROWTH_RATE = 1.15; // ★を1個取るごとの倍率。研究レベルの外側で掛かるので、★8個（上限）でも×3.06止まりで暴走しない

// 昇格には正解数だけでなく★の数も必要（周回してレベルを極めないと階級が頭打ちになる）
const RANK_THRESHOLDS = [
  { min: 7000, star: 8, title: "O5評議会" },
  { min: 3000, star: 5, title: "サイト管理者" },
  { min: 1000, star: 3, title: "上級研究員" },
  { min: 500, star: 1, title: "研究員" },
  { min: 100, star: 0, title: "収容班員" },
  { min: 0, star: 0, title: "D級職員" },
];

export function getRankTitle(totalCorrectCount, starCount) {
  const found = RANK_THRESHOLDS.find((r) => totalCorrectCount >= r.min && starCount >= r.star);
  return found.title;
}

export function getNextRankInfo(totalCorrectCount, starCount) {
  const ascending = [...RANK_THRESHOLDS].reverse();
  let currentIdx = 0;
  ascending.forEach((r, i) => {
    if (totalCorrectCount >= r.min && starCount >= r.star) currentIdx = i;
  });
  const next = ascending[currentIdx + 1];
  if (!next) return null;
  return {
    title: next.title,
    correctRemaining: Math.max(0, next.min - totalCorrectCount),
    starRemaining: Math.max(0, next.star - starCount),
  };
}

function emptyLevelEntry(unlocked) {
  return {
    unlocked,
    cleared: false,
    noMissClear: false,
    bestTimeMs: null,
    mark: null,
    clearCount: 0,
    seenQuestionIds: [],
  };
}

function defaultProgress(levelDefs) {
  const levels = {};
  levelDefs.forEach((def, i) => {
    levels[def.level] = emptyLevelEntry(i === 0);
  });
  return {
    totalCorrectCount: 0,
    researchLevel: 0,
    researchPoints: 0,
    unlockedBadgeIds: [],
    levels,
    missedQuestionIds: [],
  };
}

export function loadProgress(levelDefs) {
  let progress;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    progress = raw ? JSON.parse(raw) : defaultProgress(levelDefs);
  } catch {
    progress = defaultProgress(levelDefs);
  }
  if (!progress.levels) progress.levels = {};
  if (!Array.isArray(progress.missedQuestionIds)) progress.missedQuestionIds = [];
  if (typeof progress.totalCorrectCount !== "number") progress.totalCorrectCount = 0;
  if (typeof progress.researchLevel !== "number") progress.researchLevel = 0;
  if (typeof progress.researchPoints !== "number") progress.researchPoints = 0;
  if (!Array.isArray(progress.unlockedBadgeIds)) progress.unlockedBadgeIds = [];
  levelDefs.forEach((def, i) => {
    if (!progress.levels[def.level]) {
      progress.levels[def.level] = emptyLevelEntry(i === 0);
    }
    const entry = progress.levels[def.level];
    if (typeof entry.clearCount !== "number") entry.clearCount = 0;
    if (!Array.isArray(entry.seenQuestionIds)) entry.seenQuestionIds = [];
  });
  return progress;
}

export function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function resetProgress(levelDefs) {
  const progress = defaultProgress(levelDefs);
  saveProgress(progress);
  return progress;
}

function totalClearCount(progress) {
  return Object.values(progress.levels).reduce((sum, entry) => sum + (entry.clearCount || 0), 0);
}

export function getStarCount(progress) {
  return Object.values(progress.levels).filter((entry) => entry.mark === "★").length;
}

export function getRpMultiplier(progress) {
  const starBonus = Math.pow(STAR_GROWTH_RATE, getStarCount(progress));
  return Math.pow(RP_GROWTH_RATE, progress.researchLevel) * starBonus;
}

function checkBadgeUnlocks(progress) {
  const newlyUnlocked = [];
  for (const badge of badges) {
    if (progress.unlockedBadgeIds.includes(badge.id)) continue;
    let shouldUnlock = false;
    if (badge.secretTrigger?.type === "totalClearCount") {
      shouldUnlock = totalClearCount(progress) >= badge.secretTrigger.value;
    } else if (badge.secretTrigger?.type === "totalCorrectCount") {
      shouldUnlock = progress.totalCorrectCount >= badge.secretTrigger.value;
    } else if (typeof badge.threshold === "number") {
      shouldUnlock = progress.researchPoints >= badge.threshold;
    }
    if (shouldUnlock) {
      progress.unlockedBadgeIds.push(badge.id);
      newlyUnlocked.push(badge);
    }
  }
  return newlyUnlocked;
}

export function addCorrect(progress) {
  // RPは即時付与せず「確保ポイント」としてプレイ側で保持し、クリア時にrecordLevelResultで正式に収容（加算）する
  // （途中離脱すると確保ポイントは失われる＝離脱の抑止と、解答ごとの効力感の両立が狙い）
  progress.totalCorrectCount += 1;
  saveProgress(progress);
  return { rpGained: getRpMultiplier(progress) };
}

export function recordMiss(progress, questionId) {
  if (!progress.missedQuestionIds.includes(questionId)) {
    progress.missedQuestionIds.push(questionId);
  }
  saveProgress(progress);
}

export function recordQuestionSeen(progress, level, questionId) {
  const entry = progress.levels[level];
  if (!entry.seenQuestionIds.includes(questionId)) {
    entry.seenQuestionIds.push(questionId);
  }
  saveProgress(progress);
}

export function computeMark({ noMiss, consumptionComplete }) {
  if (consumptionComplete) return "★"; // プール全問を経験済み
  if (noMiss) return "◎";
  return "〇";
}

export function recordLevelResult(progress, levelDefs, level, { timeMs, noMiss, pendingRp }) {
  const defIndex = levelDefs.findIndex((d) => d.level === level);
  const def = levelDefs[defIndex];
  const entry = progress.levels[level];
  const consumptionComplete = entry.seenQuestionIds.length >= def.pool.length;
  const mark = computeMark({ noMiss, consumptionComplete });

  entry.cleared = true;
  entry.clearCount += 1;
  entry.noMissClear = entry.noMissClear || noMiss;
  if (entry.bestTimeMs === null || timeMs < entry.bestTimeMs) {
    entry.bestTimeMs = timeMs;
  }
  if (!entry.mark || MARK_RANK[mark] > MARK_RANK[entry.mark]) {
    entry.mark = mark;
  }

  progress.researchPoints += pendingRp; // クリアして初めて確保ポイントが正式に収容（RPに加算）される

  let nextUnlocked = false;
  if (noMiss) {
    progress.researchLevel += 1; // 性能アップ＝以降のRP倍率が上がる
    const next = levelDefs[defIndex + 1];
    if (next && !progress.levels[next.level].unlocked) {
      progress.levels[next.level].unlocked = true;
      nextUnlocked = true;
    }
  }

  const newlyUnlocked = checkBadgeUnlocks(progress);

  saveProgress(progress);
  return { mark, nextUnlocked, consumptionComplete, newlyUnlocked };
}
