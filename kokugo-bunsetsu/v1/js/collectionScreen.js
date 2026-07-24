import { badges } from "./data/badges.js";
import { formatBigNumber } from "./format.js";

export function renderCollection(container, { progress, onBack }) {
  container.innerHTML = `
    <div class="screen">
      <div class="game-top">
        <button class="game-exit" type="button">← レベル一覧</button>
        <div class="game-progress">収容リスト</div>
      </div>
      <div class="badge-grid"></div>
      <div class="badge-attribution">
        収容物の項目番号・設定、ロゴのモチーフは<a href="https://scp-wiki.wikidot.com" target="_blank" rel="noopener">SCP Foundation</a>（CC BY-SA 3.0）を参考にしています。イラスト・ロゴはオリジナルの再構成です。
      </div>
    </div>
  `;

  container.querySelector(".game-exit").addEventListener("click", onBack);

  const grid = container.querySelector(".badge-grid");
  grid.innerHTML = badges
    .filter((b) => !b.secret || progress.unlockedBadgeIds.includes(b.id))
    .map((b) => {
      const unlocked = progress.unlockedBadgeIds.includes(b.id);
      if (!unlocked) {
        return `
          <div class="badge-card locked">
            <div class="badge-card-designation">${b.designation}</div>
            <div class="badge-card-redacted">[削除済み]</div>
            <div class="badge-card-threshold">RP ${formatBigNumber(b.threshold)} で収容</div>
          </div>
        `;
      }
      return `
        <div class="badge-card unlocked class-${b.objectClass.toLowerCase()}">
          <img class="badge-card-illustration" src="${b.illustration}" alt="${b.name}">
          <div class="badge-card-designation">${b.designation}</div>
          <div class="badge-card-class">オブジェクトクラス：${b.objectClass}</div>
          <div class="badge-card-name">${b.name}</div>
          <div class="badge-card-procedure"><strong>特別収容プロトコル：</strong>${b.procedure}</div>
          <div class="badge-card-desc">${b.description}</div>
        </div>
      `;
    })
    .join("");
}
