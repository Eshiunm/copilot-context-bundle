# Project Guidelines

## Repository Status
- 目前此儲存庫處於初始化階段，尚未建立原始碼、建置與測試流程。
- 針對需求優先採用最小可行變更，避免一次導入大型樣板。

## Build and Test
- 目前尚未定義標準建置、Lint 與測試指令。
- 新增任一技術堆疊時，請在同一個變更中：
  - 新增可直接執行的指令。
  - 在 README.md 記錄安裝、執行、測試方式。

## Architecture
- 這個 repo 已採用 bundle source 結構：`shared/` 放所有 target repo 共用的資產，`profiles/` 放專案或專案家族的客製化資產。
- 根目錄 `.github/` 與 `.vscode/` 是維護這個 bundle repo 本身的工作區設定；可注入其他 repo 的正式來源是 `shared/` 與 `profiles/`。
- 為了維持這個 bundle repo 自身的 Copilot 體驗，部分 shared 類型 customizations 目前會在根目錄保留作者側副本；注入其他 repo 時仍以 `shared/` 為準。
- `shared/.github/copilot-instructions.md` 應維持為共用基底規則；專案特化規則優先放在 `profiles/*/.github/instructions/*.instructions.md`。
- 實作 bundle 安裝流程時，優先維持結構清楚、責任單純，避免把 profile-specific 規則塞進 shared。

## Conventions
- 變更需保持聚焦、可分步審查，便於早期歷史追蹤。
- 僅加入必要依賴；除非有明確需求，避免引入完整框架。
- 新增命名、目錄或工具慣例時，請在 README.md 或 docs/ 以精簡方式補充。
- 使用者要求撰寫 git commit 訊息或執行 git commit 時，預設採用 Conventional Commits，格式優先使用 `type(scope): summary`，並根據實際變更判斷最準確的 type 與 scope。
- 與使用者互動時，一律使用繁體中文回覆。

## Versioning
- `package.json` 的 `version` 是這個專案目前的主要版本號 source of truth；若 CLI 顯示版本、文件範例或測試期望依賴版本號，更新版本時應一併檢查是否需要同步調整。
- 只要這個專案有明確的功能更新、使用者可感知的行為改變，或重要文件 / 指南內容新增，應主動評估是否要同步更新版本號，而不是只改內容不改版號。
- 若使用者已明確指定版本號（例如 `0.2.0`），直接依指定版本更新，不必額外詢問。
- 若使用者尚未指定版本號，但這次變更已達到值得升版的程度，應主動詢問使用者是否要升版，並至少提供 2 到 3 個建議版本號與簡短理由，讓使用者可以直接選擇或自行輸入版本號。
- 版本號的暫行判斷原則如下：
  1. `patch`：小型修正、文件補充、測試補強、非破壞性的細節改善。
  2. `minor`：新功能、明顯流程強化、使用者可感知的 CLI 行為提升、重要教學 / 文件模組新增。
  3. `major`：破壞性變更、命令語意不相容、manifest schema 或安裝模型出現不向下相容調整。
- 若只是很小的內部整理、且沒有明確使用者價值，可不主動要求升版；但若屬於里程碑式進展，應在回合接近結束前詢問使用者是否要一起更新版本號。

## Git Remotes and Sync
- 這個 repo 預設同時維護兩個 remote：`github`（個人 GitHub repo）與 `gitlab`（公司 GitLab repo）。
- 使用者要求「推送至遠端」時，若未特別指定 remote，先檢查目前 branch、工作樹與 upstream 狀態，再依需要推送到 `github` 與 `gitlab`。
- 若 `gitlab` push 因非公司網路環境、VPN / SSH / 權限限制而失敗，這在家用電腦或非公司網路下屬於可預期情況；若 `github` 已成功推送，可將 `gitlab` 失敗視為非致命並在回報中清楚說明，不必將此情況判定為異常。
- 除非使用者明確要求排查 `gitlab` 連線問題，否則遇到上述情境時不需為了 `gitlab` 失敗而回滾已成功的 `github` push。
- 當使用者提到「請同步專案版本」時，預設解讀為同步本地 branch 與遠端 `github` / `gitlab` 的對應 branch；建議流程是：
  1. 先確認工作樹乾淨；若有未提交變更，先提醒使用者提交、stash 或明確決定如何處理。
  2. 執行 fetch，確認本地、`github/<branch>`、`gitlab/<branch>` 的 commit 差異。
  3. 若差異可用 fast-forward 安全同步，先更新本地 branch，再將同一份 commit 推送到另一個 remote，讓本地與兩端遠端對齊。
  4. 若出現分叉、需要 merge / rebase、或遠端彼此不一致，先整理差異並回報，不要未經使用者確認就 force push 或改寫歷史。
  5. 若同步到 `gitlab` 時因非公司網路環境失敗，回報 `github` 與本地已同步成功，並註明 `gitlab` 可待回到公司網路後再補推。

## Local Copilot History
- 本地對話摘要一律放在 `.copilot-history/`。
- `.copilot-history/` 只保存精簡摘要，不保存逐字對話紀錄。
- 如果使用者正在延續先前的長期討論、設計、命名、流程規劃或未完成工作，先檢查 `.copilot-history/INDEX.md`，再視需要讀取 `topics/` 或 `sessions/` 中的相關摘要。
- 如果只是臨時性問答或一次性小任務，不必主動寫入任何摘要。
- 在一次有實質內容的討論接近結束時，主動詢問使用者是否要保存本次討論摘要。
- 只有在使用者明確要求保存，或明確同意保存時，才可寫入 `.copilot-history/`。
- 如果使用者拒絕保存，則不得對 `.copilot-history/` 做任何寫入。
- 長期延續的主題優先寫入 `topics/`；單次 session 回顧優先寫入 `sessions/`。
- 每份摘要都應包含：背景、已定案、待確認、下一步，並保持精簡可讀。
