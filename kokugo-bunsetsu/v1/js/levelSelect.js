import { getRankTitle, getRpMultiplier, getStarCount } from "./state.js";
import { formatBigNumber } from "./format.js";

function formatBestTime(ms) {
  if (ms === null || ms === undefined) return "";
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `さんこう ${minutes}:${seconds.padStart(4, "0")}`;
}

export function renderLevelSelect(container, { levelDefs, progress, onSelectLevel, onOpenCollection }) {
  const totalClearCount = levelDefs.reduce(
    (sum, def) => sum + (progress.levels[def.level]?.clearCount || 0),
    0
  );
  const rankTitle = getRankTitle(progress.totalCorrectCount);
  const starCount = getStarCount(progress);
  const rpMultiplier = getRpMultiplier(progress);

  container.innerHTML = `
    <div class="screen">
      <div class="level-select-header">
        <div class="hazard-stripe"></div>
        <div class="brand-eyebrow">⚠ SCP FOUNDATION ⚠</div>
        <h1 class="brand-title">SCP財団 入社試験</h1>
        <div class="brand-tagline">適性検査「文の成分」判定センター</div>
        <div class="hazard-stripe"></div>
      </div>
      <div class="rank-badge">${rankTitle}</div>
      <div class="rp-display">
        <div class="rp-label">研究ポイント</div>
        <div class="rp-value">${formatBigNumber(progress.researchPoints)}</div>
        <div class="rp-sub">研究レベル ${progress.researchLevel}　<span class="is-star">★</span>${starCount}個（×${rpMultiplier.toFixed(2)}）</div>
      </div>
      <div class="level-select-total">
        せいかい <strong>${progress.totalCorrectCount}</strong> かい
      </div>
      <div class="level-select-total">
        レベルクリア <strong>${totalClearCount}</strong> かい
      </div>
      <button type="button" class="collection-link">収容リストを見る</button>
      <div class="level-grid"></div>
      <div class="site-license">
        特に指定がない限り、このサイトのすべてのコンテンツは<a href="https://creativecommons.org/licenses/by-sa/3.0/deed.ja" target="_blank" rel="noopener">クリエイティブ・コモンズ 表示 - 継承3.0ライセンス</a>の元で利用可能です。
      </div>
    </div>
  `;

  container.querySelector(".collection-link").addEventListener("click", onOpenCollection);

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
          <div class="level-card-mark${entry.mark === "★" ? " is-star" : ""}">${entry.mark || "―"}</div>
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
