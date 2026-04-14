# Bundle CLI and Manifest

## 類別
- topic: workflow
- status: active

## 背景
- 在 bundle source repo 切出 `shared/` 與 `profiles/` 後，討論焦點從純結構設計，進一步延伸到如何以 npm CLI package 形式安裝 bundle，以及如何保留 `promote` 回流能力。
- 使用者特別在意：若未來採 npm CLI package / `npx` 路線，是否仍能透過 manifest 與 promote 滿足雙向同步需求。
- 在 `promote` 與 `update` 的第一版實作完成後，討論重點再往前推進到：如何用自動化測試保護 `install / status / update / promote` 的回歸品質，以及如何把目前命令狀態同步回 README。
- 接著又進一步收斂到：instruction 安裝目錄分類、`install --force` 的重裝語意、人類導向的 install 教學、repo 雙 remote 推送規則，以及版本治理與升版節奏。

## 已定案
- `manifest` 應作為 target repo 中的機器可讀狀態檔，預設位置為 `.copilot-bundle/manifest.json`。
- 已定義 manifest v0 schema，涵蓋：bundle 來源、installer 資訊、profile、targets、checksumAlgorithm、managedItems 與 localOverrides。
- npm CLI package 的 v0 核心生命週期已擴展為 `copilot-bundle install / status / update / promote`，其中 `update` 第一版已可實際執行。
- `update` v0 第一版已採 `targetPath` 作為主要對位鍵，支援 `--dry-run`、`--json`、`--force`、`--prune`，並已覆蓋 refresh / add / restore / drift / prune / source relocation 等核心路徑。
- npm CLI package 最小骨架 v0 已落地：包含 `package.json`、`bin/copilot-bundle.js`、`lib/` 內的核心模組與四個命令實作骨架。
- 已加入 `node --test` 自動化測試與 `npm test` 腳本，並建立 `test/cli-commands.test.js`，覆蓋 `help`、`version`、`install`、`status`、`update`、`promote` 的核心情境。
- README 已同步補上命令 / 參數 / 完成度 / 是否測過的對照表，並記錄目前 CLI v0 的測試覆蓋狀態。
- bundle source repo 仍然是 source of truth；npm package 只是 distribution artifact，不是作者端的正式編輯來源。
- shared instructions 安裝到 target repo 時，會分類到 `.github/instructions/common/`；profile instructions 則落到 `.github/instructions/<profile>/`。
- `status` 預設文字輸出不再顯示 manifest 路徑；`install --force` 現在視為替換既有 install 身分，切換 profile 時會清掉舊 install 已管理但新計畫不再需要的 stale managed files。
- 已新增 shared 的人類導向 install 教學：`shared/.github/instructions/copilot-context-bundle-command-guides/install.instructions.md`，並在操作指南與 README 補上入口。
- 這個 repo 目前預設維護 `github` 與 `gitlab` 兩個 remote；若在非公司網路下 push 到 `gitlab` 失敗，可視為可預期且非致命的狀況，只要 `github` 已同步成功即可。
- 已為這個 repo 補上版本治理規則：`package.json.version` 是主要版本號 source of truth；若變更達到值得升版的程度，應主動詢問使用者是否要升版並提供建議版本號。
- 依目前 install / CLI / 文件完成度，專案版本已升到 `0.2.0`。

## 待確認
- 自動化測試是否要再往 CI workflow 擴充，讓 `npm test` 成為提交前或 PR 的固定驗證步驟。
- `update` 是否需要再補更高階的 rename 推斷，或更完整的長期 regression test matrix。
- 是否要將當前 package 骨架發佈到公司 GitLab Package Registry，並導入 `npx` 使用體驗。
- 是否要延續同一路徑，再補 `status`、`update`、`promote` 的人類導向詳細教學。
- 是否要為 `github` / `gitlab` 的 `main` 補上 branch protection 與 release note / changelog 流程。

## 下一步
- 先把 `npm test` 納入後續固定驗證流程，並視需要補 CI 或 pre-push 驗證。
- 再決定下一個命令是 `doctor`、`uninstall`，還是進一步整理 registry / `npx` 發佈流程。
- 若文件優先度較高，可沿用 `shared/.github/instructions/copilot-context-bundle-command-guides/` 補齊其餘命令教學。
- 若版本發布節奏開始穩定，可再定義 changelog / release note 的最小流程。

## 參考
- `docs/manifest-v0.md`
- `docs/schemas/copilot-bundle-manifest.v0.schema.json`
- `docs/cli-package-v0.md`
- `docs/update-command-implementation-v0.md`
- `.github/copilot-instructions.md`
- `package.json`
- `README.md`
- `bin/copilot-bundle.js`
- `lib/commands/install.js`
- `lib/commands/status.js`
- `lib/commands/update.js`
- `lib/commands/promote.js`
- `shared/.github/instructions/copilot-context-bundle-operations.instructions.md`
- `shared/.github/instructions/copilot-context-bundle-command-guides/install.instructions.md`
- `test/cli-commands.test.js`
