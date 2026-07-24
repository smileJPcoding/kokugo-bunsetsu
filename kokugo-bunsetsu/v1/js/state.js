const STORAGE_KEY = "kokugo-bunsetsu-progress";

const MARK_RANK = { "〇": 1, "◎": 2, "★": 3 };

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
  return { totalCorrectCount: 0, levels, missedQuestionIds: [] };
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

export function addCorrect(progress) {
  progress.totalCorrectCount += 1;
  saveProgress(progress);
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

export function recordLevelResult(progress, levelDefs, level, { timeMs, noMiss }) {
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

  let nextUnlocked = false;
  if (noMiss) {
    const next = levelDefs[defIndex + 1];
    if (next && !progress.levels[next.level].unlocked) {
      progress.levels[next.level].unlocked = true;
      nextUnlocked = true;
    }
  }

  saveProgress(progress);
  return { mark, nextUnlocked, consumptionComplete };
}
