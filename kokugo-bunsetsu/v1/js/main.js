import { levels } from "./data/levels.js";
import { questions } from "./data/questions.js";
import { loadProgress } from "./state.js";
import { renderLevelSelect } from "./levelSelect.js";
import { startLevel } from "./game.js";

const QUESTIONS_PER_PLAY = 10;

const app = document.getElementById("app");
const progress = loadProgress(levels);

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function questionsForLevel(level) {
  const def = levels.find((l) => l.level === level);
  const drawnIds = shuffle(def.pool).slice(0, QUESTIONS_PER_PLAY);
  return drawnIds.map((id) => questions.find((q) => q.id === id));
}

function showLevelSelect() {
  renderLevelSelect(app, {
    levelDefs: levels,
    progress,
    onSelectLevel: (level) => showGame(level),
  });
}

function showGame(level) {
  const levelDef = levels.find((l) => l.level === level);
  startLevel(app, {
    levelDef,
    levelDefs: levels,
    questions: questionsForLevel(level),
    progress,
    onExit: showLevelSelect,
    onGoToLevelSelect: showLevelSelect,
    onNextLevel: () => showGame(level + 1),
  });
}

showLevelSelect();
