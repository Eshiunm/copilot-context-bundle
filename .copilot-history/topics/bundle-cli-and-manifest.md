# Bundle CLI and Manifest

## 類別
- topic: workflow
- status: active

## 背景
- 在 bundle source repo 切出 `shared/` 與 `profiles/` 後，討論焦點從純結構設計，進一步延伸到如何以 npm CLI package 形式安裝 bundle，以及如何保留 `promote` 回流能力。
- 使用者特別在意：若未來採 npm CLI package / `npx` 路線，是否仍能透過 manifest 與 promote 滿足雙向同步需求。

## 已定案
- `manifest` 應作為 target repo 中的機器可讀狀態檔，預設位置為 `.copilot-bundle/manifest.json`。
- 已定義 manifest v0 schema，涵蓋：bundle 來源、installer 資訊、profile、targets、checksumAlgorithm、managedItems 與 localOverrides。
- npm CLI package 的 v0 命令規格已定義為 `copilot-bundle install / status / promote`；`update`、`uninstall`、`publish` 等延後。
- npm CLI package 最小骨架 v0 已落地：包含 `package.json`、`bin/copilot-bundle.js`、`lib/` 內的核心模組與三個命令骨架。
- 已完成本機 smoke test：`help`、`install --dry-run`、實際 `install`、`status` 均可正常執行。
- bundle source repo 仍然是 source of truth；npm package 只是 distribution artifact，不是作者端的正式編輯來源。

## 待確認
- `promote` 實測後，是否需要調整 localOverrides 的語意，或在 promote 後同步更新 target repo 的 checksum 基準。
- CLI 是否要在 v1 支援 `update`，以及 `status` / `promote` 的 JSON 或 machine-readable 輸出要做到什麼程度。
- 是否要將當前 package 骨架發佈到公司 GitLab Package Registry，並導入 `npx` 使用體驗。

## 下一步
- 先用 sandbox repo 跑一次 `promote` 的 end-to-end 實測：install → 修改 managed file → status → promote → 驗證 bundle source diff。
- 若 promote 流程可行，再評估是否要進入 `npm link` 測試與 registry 發佈準備。

## 參考
- `docs/manifest-v0.md`
- `docs/schemas/copilot-bundle-manifest.v0.schema.json`
- `docs/cli-package-v0.md`
- `package.json`
- `bin/copilot-bundle.js`
- `lib/commands/install.js`
- `lib/commands/status.js`
- `lib/commands/promote.js`
