# 2026-04-14 Install Guides, Remotes, and Versioning

## 類別
- topic: session-summary
- status: done

## 背景
- 在 `install / status / update / promote` 的核心流程逐漸穩定後，討論焦點轉向兩類補強：
  1. 讓一般使用者在安裝後，也能在 target repo 看到更清楚的人類導向教學。
  2. 讓這個 bundle repo 本身在雙 remote（`github` / `gitlab`）與版本升級上有一致的操作規則。
- 使用者也明確指出：在家用網路環境下，push 到公司 `gitlab` 失敗屬於正常情況，不應被誤判成異常。

## 已定案
- 已新增 install 的人類導向教學文件：
  - `shared/.github/instructions/copilot-context-bundle-command-guides/install.instructions.md`
  - 內容以繁體中文與表格為主，整理 `install` 的使用方式、效果、參數、常見情境與操作後檢查。
- `shared/.github/instructions/copilot-context-bundle-operations.instructions.md`、`shared/README.md` 與 `README.md` 已同步補上這份 install 教學的入口與索引。
- `status` 預設文字輸出不再顯示 manifest 路徑；`install --force` 會將重裝視為替換既有 install 身分，切換 profile 時會清除舊 install 殘留的 managed files。
- CLI 自動化測試已擴充到 8 個情境，本機驗證通過。
- 這個 repo 的 remote 已調整為：
  - `github`：個人 GitHub repo
  - `gitlab`：公司 GitLab repo
- 若 `gitlab` push 因非公司網路、VPN / SSH 或權限限制失敗，只要 `github` 已成功，即可視為非致命並在回報中註明即可。
- 當使用者提到「請同步專案版本」時，預設應先比對本地、`github/<branch>`、`gitlab/<branch>` 的差異；若可 fast-forward 再同步，若有分叉則先回報，不直接 force push。
- `.github/copilot-instructions.md` 已新增 versioning 規則：
  - `package.json.version` 是專案版本號 source of truth
  - 若變更達到值得升版的程度，應主動詢問使用者是否要升版，並提供建議版本號
- 依目前 install / CLI / 文件成熟度，專案版本已升到 `0.2.0`。

## 待確認
- 是否要依同樣格式補齊 `status`、`update`、`promote` 的人類導向教學。
- 是否要為 `github` / `gitlab` 的 `main` 進一步設定 branch protection。
- 若版本開始穩定提升，是否要建立最小 release note / changelog 流程。

## 下一步
- 若文件優先，先補 `status` 指令教學，再逐步補 `update` / `promote`。
- 若發佈治理優先，先決定 branch protection、release note 與 changelog 的最小規則。
- 若工程流程優先，則可考慮把 `npm test` 納入 CI 或 pre-push 驗證。

## 參考
- `.copilot-history/topics/bundle-cli-and-manifest.md`
- `.github/copilot-instructions.md`
- `package.json`
- `lib/commands/install.js`
- `lib/commands/status.js`
- `shared/.github/instructions/copilot-context-bundle-operations.instructions.md`
- `shared/.github/instructions/copilot-context-bundle-command-guides/install.instructions.md`