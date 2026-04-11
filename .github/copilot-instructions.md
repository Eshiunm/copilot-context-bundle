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
