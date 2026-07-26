import { levels } from "./data/levels.js";
import { badges } from "./data/badges.js";
import { loadProgress, saveProgress, resetProgress, getRankTitle, getStarCount } from "./state.js";

const app = document.getElementById("app");
let progress = loadProgress(levels);

function render() {
  app.innerHTML = `
    <div class="screen manage-screen">
      <h1>進捗管理</h1>

      <section class="manage-section">
        <h2>全体ステータス</h2>
        <div class="manage-row">
          <label>正解数 <input type="number" id="totalCorrectCount" value="${progress.totalCorrectCount}"></label>
          <label>研究レベル <input type="number" id="researchLevel" value="${progress.researchLevel}"></label>
          <label>研究ポイント <input type="number" id="researchPoints" value="${Math.floor(progress.researchPoints)}"></label>
        </div>
        <div class="manage-hint">称号（正解数と★の数から自動計算）：${getRankTitle(progress.totalCorrectCount, getStarCount(progress))}</div>
      </section>

      <section class="manage-section">
        <h2>レベル進捗</h2>
        <div class="manage-table-wrap">
          <table class="manage-table">
            <thead>
              <tr>
                <th>Lv</th><th>解放</th><th>クリア</th><th>ノーミス</th><th>マーク</th>
                <th>クリア回数</th><th>ベストタイム(ms)</th><th>けいけん済み</th>
              </tr>
            </thead>
            <tbody>
              ${levels
                .map((def) => {
                  const e = progress.levels[def.level];
                  return `
                    <tr data-level="${def.level}">
                      <td>${def.level}</td>
                      <td><input type="checkbox" class="f-unlocked" ${e.unlocked ? "checked" : ""}></td>
                      <td><input type="checkbox" class="f-cleared" ${e.cleared ? "checked" : ""}></td>
                      <td><input type="checkbox" class="f-noMiss" ${e.noMissClear ? "checked" : ""}></td>
                      <td>
                        <select class="f-mark">
                          <option value="" ${!e.mark ? "selected" : ""}>なし</option>
                          <option value="〇" ${e.mark === "〇" ? "selected" : ""}>〇</option>
                          <option value="◎" ${e.mark === "◎" ? "selected" : ""}>◎</option>
                          <option value="★" ${e.mark === "★" ? "selected" : ""}>★</option>
                        </select>
                      </td>
                      <td><input type="number" class="f-clearCount" value="${e.clearCount}"></td>
                      <td><input type="number" class="f-bestTime" value="${e.bestTimeMs ?? ""}"></td>
                      <td>
                        ${e.seenQuestionIds.length} / ${def.pool.length}
                        <button type="button" class="mini-btn f-seen-all" data-level="${def.level}">全問済みに</button>
                        <button type="button" class="mini-btn f-seen-clear" data-level="${def.level}">0に</button>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="manage-section">
        <h2>収容バッジ</h2>
        <div class="manage-badge-list">
          ${badges
            .map(
              (b) => `
              <label class="manage-badge-check">
                <input type="checkbox" class="f-badge" data-id="${b.id}" ${progress.unlockedBadgeIds.includes(b.id) ? "checked" : ""}>
                ${b.designation} ${b.name}${b.secret ? "（隠し）" : ""}
              </label>
            `,
            )
            .join("")}
        </div>
      </section>

      <div class="manage-actions">
        <button type="button" id="save-btn">保存</button>
        <button type="button" id="reset-btn" class="danger">初期状態にリセット</button>
      </div>
      <div class="manage-saved-note" id="saved-note"></div>
    </div>
  `;

  document.getElementById("save-btn").addEventListener("click", onSave);
  document.getElementById("reset-btn").addEventListener("click", onReset);

  app.querySelectorAll(".f-seen-all").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lvl = Number(btn.dataset.level);
      const def = levels.find((l) => l.level === lvl);
      progress.levels[lvl].seenQuestionIds = [...def.pool];
      render();
    });
  });

  app.querySelectorAll(".f-seen-clear").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lvl = Number(btn.dataset.level);
      progress.levels[lvl].seenQuestionIds = [];
      render();
    });
  });
}

function onSave() {
  progress.totalCorrectCount = Number(document.getElementById("totalCorrectCount").value) || 0;
  progress.researchLevel = Number(document.getElementById("researchLevel").value) || 0;
  progress.researchPoints = Number(document.getElementById("researchPoints").value) || 0;

  app.querySelectorAll("tr[data-level]").forEach((row) => {
    const lvl = Number(row.dataset.level);
    const e = progress.levels[lvl];
    e.unlocked = row.querySelector(".f-unlocked").checked;
    e.cleared = row.querySelector(".f-cleared").checked;
    e.noMissClear = row.querySelector(".f-noMiss").checked;
    e.mark = row.querySelector(".f-mark").value || null;
    e.clearCount = Number(row.querySelector(".f-clearCount").value) || 0;
    const bestTimeVal = row.querySelector(".f-bestTime").value;
    e.bestTimeMs = bestTimeVal === "" ? null : Number(bestTimeVal);
  });

  progress.unlockedBadgeIds = [...app.querySelectorAll(".f-badge:checked")].map((el) => el.dataset.id);

  saveProgress(progress);
  const note = document.getElementById("saved-note");
  note.textContent = "保存しました";
  setTimeout(() => {
    note.textContent = "";
  }, 2000);
}

function onReset() {
  if (!confirm("本当に初期状態にリセットしますか？")) return;
  progress = resetProgress(levels);
  render();
}

render();
