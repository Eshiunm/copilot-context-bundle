# Workspace Positioning

## 類別
- topic: workspace-positioning
- status: active

## 背景
- 這個 repo 不是一般應用程式，而是用來累積可重用的 Copilot context assets。
- 長期目標是把 skills、prompts、instructions、copilot-instructions 與 workflow 規則整理成可移植的 bundle，之後能以 CLI 或簡單指令注入其他專案。
- 專案目前仍在初始化階段，優先採最小可行變更，不先導入大型框架。

## 已定案
- 遠端 repo 名稱為 `copilot-context-bundle`。
- 對外定位偏向「可重用的 Copilot context bundle / 知識資產庫」，而不是 starter app 或完整產品。
- 內容可包含 skills、prompts、instructions、copilot-instructions、MCP 設定與可重用 workflow。
- GitHub MCP 採 workspace 級 `.vscode/mcp.json`，並使用 PAT placeholder 方式隔離驗證資訊。
- 本地對話摘要統一放在 `.copilot-history/`，只保存壓縮摘要，不保存逐字稿，且不納入 git。
- 已建立 `save-conversation-history` workflow skill，負責把可延續的對話脈絡保存到本地摘要。
- QNAP 專案的開發模型偏向「每個 workspace 只開一個專案 repo」，不以父資料夾共享同一組專案客製化作為正式架構。
- `copilot-instructions.md` 應維持為共用基底規則，不作為依專案動態分流或 include 其他客製化檔案的主要機制。
- bundle 套用方向改為 `shared + project profile + repo local overrides` 三層模型，依安裝的 profile 決定各專案拿到哪些 Copilot 客製化內容。
- 若要保留從專案回流到 bundle 的能力，應以 manifest 記錄來源與 managed items，並透過 `install / status / update / promote` 類型的流程處理，而不是依賴手動複製。

## 待確認
- 是否要補一套 CLI 或腳本，將這份 context bundle 套用到其他 repo。
- skills 的長期分類是否要擴充為 `git/`、`workflow/`、`mcp/`、`docs/` 等更明確結構。
- README 與對外說明要公開到什麼粒度，以及何時從 placeholder 轉為正式介紹。
- manifest 的欄位與 schema 要如何設計，才能記錄 bundle 來源、profile、managed items 與內容指紋。
- `install / status / update / promote` 的 CLI 行為定義要做到什麼程度，第一版是否只做半自動決策。
- 哪些 skills、prompts、instructions、hooks、MCP 設定適合放在 `shared`、`profile`、`local`，尤其 hooks 與 MCP 可能更偏向 profile 層。

## 下一步
- 持續把高價值的工作流程整理成 skills 與 instructions。
- 先把 manifest 欄位與同步規則講清楚，再決定 CLI、腳本或更清楚的導入說明。
- 釐清 `shared / profile / local` 三層邊界，避免 bundle 被單一專案語境污染。
- 後續若出現新的長期方向變更，優先更新這份 topic 摘要，而不是重複新增類似檔案。

## 參考
- `.github/copilot-instructions.md`
- `.github/skills/`
- `.github/skills/workflow/save-conversation-history/SKILL.md`
- `.vscode/mcp.json`
- `README.md`
- `.copilot-history/`