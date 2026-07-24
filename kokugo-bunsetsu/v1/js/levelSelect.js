function formatBestTime(ms) {
  if (ms === null || ms === undefined) return "";
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `さんこう ${minutes}:${seconds.padStart(4, "0")}`;
}

export function renderLevelSelect(container, { levelDefs, progress, onSelectLevel }) {
  const totalClearCount = levelDefs.reduce(
    (sum, def) => sum + (progress.levels[def.level]?.clearCount || 0),
    0
  );

  container.innerHTML = `
    <div class="screen">
      <div class="level-select-header">
        <h1>文の成分トレーニング</h1>
      </div>
      <div class="level-select-total">
        せいかい <strong>${progress.totalCorrectCount}</strong> かい
      </div>
      <div class="level-select-total">
        レベルクリア <strong>${totalClearCount}</strong> かい
      </div>
      <div class="level-grid"></div>
    </div>
  `;

  const grid = container.querySelector(".level-grid");

  grid.innerHTML = levelDefs
    .map((def) => {
      const entry = progress.levels[def.level] || { unlocked: false };
      if (!entry.unlocked) {
        return `
          <div class="level-card locked">
            <div class="level-card-number">レベル ${def.level}</div>
            <div class="level-card-lock">🔒</div>
          </div>
        `;
      }
      const seenCount = entry.seenQuestionIds?.length || 0;
      const consumptionRate = ((seenCount / def.pool.length) * 100).toFixed(1);
      return `
        <button type="button" class="level-card unlocked" data-level="${def.level}">
          <div class="level-card-number">レベル ${def.level}</div>
          <div class="level-card-mark">${entry.mark || "―"}</div>
          <div class="level-card-time">${formatBestTime(entry.bestTimeMs)}</div>
          <div class="level-card-clears">クリア ${entry.clearCount || 0} かい</div>
          <div class="level-card-pool">しょうか ${consumptionRate}%</div>
        </button>
      `;
    })
    .join("");

  grid.querySelectorAll(".level-card.unlocked").forEach((btn) => {
    btn.addEventListener("click", () => {
      onSelectLevel(Number(btn.dataset.level));
    });
  });
}
