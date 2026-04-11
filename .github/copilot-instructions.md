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
- 目前尚未建立固定架構與元件邊界。
- 實作前先提出簡潔的目錄結構，再只實作任務必要範圍。

## Conventions
- 變更需保持聚焦、可分步審查，便於早期歷史追蹤。
- 僅加入必要依賴；除非有明確需求，避免引入完整框架。
- 新增命名、目錄或工具慣例時，請在 README.md 或 docs/ 以精簡方式補充。
- 使用者要求撰寫 git commit 訊息或執行 git commit 時，預設採用 Conventional Commits，格式優先使用 `type(scope): summary`，並根據實際變更判斷最準確的 type 與 scope。
- 與使用者互動時，一律使用繁體中文回覆。

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
