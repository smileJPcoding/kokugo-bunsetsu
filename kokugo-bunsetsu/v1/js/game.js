import { labelKey, LABEL_ICON } from "./labels.js";
import { addCorrect, recordMiss, recordQuestionSeen, recordLevelResult } from "./state.js";

const PENALTY_MS = 2000;
const QUESTION_REVIEW_PAUSE_MS = 2000;
const READING_PAUSE_MS = 3000;

function formatTime(ms) {
  const total = Math.max(0, ms);
  const minutes = Math.floor(total / 60000);
  const seconds = ((total % 60000) / 1000).toFixed(1);
  return `${minutes}:${seconds.padStart(4, "0")}`;
}

function buildPhases(question) {
  // 連続する同一ラベルの解答は1フェーズにまとめ、フェーズ内は順不同で受け付ける
  const phases = [];
  for (const a of question.answers) {
    const last = phases[phases.length - 1];
    if (last && last.label === a.label) {
      last.remaining.add(a.phraseIndex);
      last.total += 1;
    } else {
      phases.push({ label: a.label, remaining: new Set([a.phraseIndex]), total: 1 });
    }
  }
  return phases;
}

export function startLevel(container, { levelDef, levelDefs, questions, progress, onExit, onGoToLevelSelect, onNextLevel }) {
  let currentQIndex = 0;
  let currentPhaseIndex = 0;
  let phases = [];
  let locked = false;
  let readingPhase = false;
  let readingPauseTimer = null;
  let readingPauseStart = 0;
  const missedThisAttempt = new Set();
  const newBadgesThisLevel = [];
  let startTime = performance.now(); // タイムは参考値：解答中は非表示、クリア後にのみ表示する

  container.innerHTML = `
    <div class="screen">
      <div class="game-top">
        <button class="game-exit" type="button">← レベル一覧</button>
        <div class="game-level">レベル ${levelDef.level}</div>
        <div class="game-progress"></div>
      </div>
      <div class="hunt-row">
        <div class="hunt-icon-slot"><img class="hunt-icon" alt=""></div>
        <div class="label-palette"></div>
      </div>
      <div class="sentence-box"></div>
    </div>
  `;

  const exitBtn = container.querySelector(".game-exit");
  const progressEl = container.querySelector(".game-progress");
  const sentenceBox = container.querySelector(".sentence-box");
  const paletteEl = container.querySelector(".label-palette");
  const huntIconEl = container.querySelector(".hunt-icon");

  exitBtn.addEventListener("click", onExit);

  function renderPalette() {
    const chips = [];
    phases.forEach((phase, phaseIdx) => {
      const key = labelKey(phase.label);
      for (let slot = 0; slot < phase.total; slot++) {
        chips.push(`<div class="label-chip ${key}" data-phase="${phaseIdx}" data-slot="${slot}">${phase.label}</div>`);
      }
    });
    paletteEl.innerHTML = chips.join("");
  }

  function updateHuntIcon() {
    const currentPhase = phases[currentPhaseIndex];
    const iconSrc = currentPhase ? LABEL_ICON[labelKey(currentPhase.label)] : null;
    if (iconSrc) {
      huntIconEl.src = iconSrc;
      huntIconEl.style.visibility = "visible";
    } else {
      huntIconEl.style.visibility = "hidden";
    }
  }

  function hideHuntIcon() {
    huntIconEl.style.visibility = "hidden";
  }

  function updateActiveLabel() {
    // アイコンはReady中の予告表示のみ。解答中は成分が変わるたびに動いて集中を妨げるため更新しない
    paletteEl.querySelectorAll(".label-chip").forEach((chip) => {
      const phaseIdx = Number(chip.dataset.phase);
      const slot = Number(chip.dataset.slot);
      let isDone = false;
      let isActive = false;
      if (phaseIdx < currentPhaseIndex) {
        isDone = true;
      } else if (phaseIdx === currentPhaseIndex) {
        const phase = phases[phaseIdx];
        const doneCount = phase.total - phase.remaining.size;
        isDone = slot < doneCount;
        isActive = !isDone;
      }
      chip.classList.toggle("done", isDone);
      chip.classList.toggle("active", isActive);
    });
  }

  function renderQuestion() {
    currentPhaseIndex = 0;
    const question = questions[currentQIndex];
    phases = buildPhases(question);
    progressEl.textContent = `もんだい ${currentQIndex + 1} / ${questions.length}`;
    renderPalette();
    updateHuntIcon(); // 読んでいる最中（Ready状態）から予告として表示する

    const breaks = new Set(question.lineBreakAfter || []);
    let lines = [[]];
    question.phrases.forEach((text, idx) => {
      lines[lines.length - 1].push({ text, idx });
      if (breaks.has(idx)) lines.push([]);
    });

    const answerMap = new Map(question.answers.map((a) => [a.phraseIndex, a.label]));

    sentenceBox.innerHTML = lines
      .map(
        (line) => `
        <div class="sentence-line">
          ${line
            .map(({ text, idx }) => {
              const isTappable = answerMap.has(idx);
              return `<span class="phrase${isTappable ? " tappable" : ""}" data-phrase-index="${idx}">${text}</span>`;
            })
            .join("")}
        </div>
      `,
      )
      .join("");

    sentenceBox.querySelectorAll(".phrase.tappable").forEach((span) => {
      span.addEventListener("click", onPhraseClick);
    });

    beginReadingPause();
  }

  function onPhraseClick(e) {
    if (readingPhase) {
      finishReadingPause(); // 読んでいる最中でも解答を始めたらそこからタイマー開始
    } else if (locked) {
      return;
    }
    const span = e.currentTarget;
    const idx = Number(span.dataset.phraseIndex);
    const question = questions[currentQIndex];
    const phase = phases[currentPhaseIndex];

    if (phase.remaining.has(idx)) {
      const key = labelKey(phase.label);
      span.classList.remove("tappable");
      span.classList.add(`answered-${key}`);
      span.innerHTML = `${span.textContent}<span class="phrase-tag">${phase.label}</span>`;
      span.replaceWith(span.cloneNode(true)); // drop click listener, keep markup

      const { newlyUnlocked } = addCorrect(progress);
      newBadgesThisLevel.push(...newlyUnlocked);
      phase.remaining.delete(idx);

      if (phase.remaining.size === 0) {
        currentPhaseIndex += 1;
      }

      updateActiveLabel();

      if (currentPhaseIndex >= phases.length) {
        recordQuestionSeen(progress, levelDef.level, question.id);
        pauseBetweenQuestions(() => {
          currentQIndex += 1;
          if (currentQIndex >= questions.length) {
            finishLevel();
          } else {
            renderQuestion();
          }
        });
      }
    } else {
      missedThisAttempt.add(question.id);
      recordMiss(progress, question.id);
      locked = true;
      span.classList.add("penalty");
      setTimeout(() => {
        span.classList.remove("penalty");
        locked = false;
      }, PENALTY_MS);
    }
  }

  function pauseBetweenQuestions(callback) {
    // 完成した文以外をタップしたら、待ち時間を待たずすぐ次の問題へ進める
    const pauseStart = performance.now();
    let done = false;

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timerId);
      container.removeEventListener("click", onSkipClick, true);
      startTime += performance.now() - pauseStart; // 停止していた時間は参考タイムに含めない
      callback();
    }

    function onSkipClick(e) {
      if (!sentenceBox.contains(e.target) && !exitBtn.contains(e.target)) {
        finish();
      }
    }

    const timerId = setTimeout(finish, QUESTION_REVIEW_PAUSE_MS);
    container.addEventListener("click", onSkipClick, true);
  }

  function beginReadingPause() {
    // 解答候補は全てグレーのまま、まず文章を読む時間を確保する（この間はタップ無効）
    readingPhase = true;
    locked = true;
    readingPauseStart = performance.now();
    readingPauseTimer = setTimeout(finishReadingPause, READING_PAUSE_MS);
  }

  function finishReadingPause() {
    clearTimeout(readingPauseTimer);
    startTime += performance.now() - readingPauseStart; // 読んでいた時間は参考タイムに含めない
    readingPhase = false;
    locked = false;
    hideHuntIcon();
    updateActiveLabel();
  }

  function finishLevel() {
    const timeMs = performance.now() - startTime;
    const noMiss = missedThisAttempt.size === 0;
    const { mark, nextUnlocked, consumptionComplete, newlyUnlocked } = recordLevelResult(progress, levelDefs, levelDef.level, {
      timeMs,
      noMiss,
    });
    newBadgesThisLevel.push(...newlyUnlocked);
    const seenCount = progress.levels[levelDef.level].seenQuestionIds.length;
    renderResult({ mark, timeMs, noMiss, nextUnlocked, consumptionComplete, seenCount, poolSize: levelDef.pool.length });
  }

  function renderResult({ mark, timeMs, noMiss, nextUnlocked, consumptionComplete, seenCount, poolSize }) {
    const badgeHtml = newBadgesThisLevel
      .map(
        (b) => `
        <div class="badge-unlock">
          <img class="badge-unlock-illustration" src="${b.illustration}" alt="${b.name}">
          <div class="badge-unlock-text">
            <div class="badge-unlock-label">新規収容</div>
            <div class="badge-unlock-designation">${b.designation}</div>
            <div class="badge-unlock-name">${b.name}</div>
          </div>
        </div>
      `,
      )
      .join("");

    container.innerHTML = `
      <div class="screen result-screen">
        <h2>レベル ${levelDef.level} クリア！</h2>
        <div class="result-mark">${mark}</div>
        <div class="result-time">タイム（さんこう） ${formatTime(timeMs)}</div>
        <div class="result-note">${noMiss ? "ノーミスクリア！" : "クリア"}</div>
        <div class="result-note">けいけんした もんだい ${seenCount} / ${poolSize}</div>
        ${consumptionComplete ? `<div class="result-note">プールぜんもんけいけん！★</div>` : ""}
        ${nextUnlocked ? `<div class="result-note">つぎのレベルが解放されました！</div>` : ""}
        ${badgeHtml}
        <div class="result-actions">
          ${nextUnlocked ? `<button type="button" class="next-level">つぎのレベルへ</button>` : ""}
          <button type="button" class="secondary back-to-select">レベル一覧へ</button>
        </div>
      </div>
    `;
    const backBtn = container.querySelector(".back-to-select");
    backBtn.addEventListener("click", onGoToLevelSelect);
    const nextBtn = container.querySelector(".next-level");
    if (nextBtn) nextBtn.addEventListener("click", onNextLevel);
  }

  renderQuestion();
}
