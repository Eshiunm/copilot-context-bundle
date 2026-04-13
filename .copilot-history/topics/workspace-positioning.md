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
- 針對專案客製化 instructions，優先採「shared 的 `copilot-instructions.md` + profile 提供 `.github/instructions/*.instructions.md`」的做法；不把 `copilot-instructions.md` 當成讀取其他 instruction 檔的主要路由器。
- 使用者目前偏好採用「用 `.instructions.md`，但必要時讓它很容易被套用」的方案，作為 profile 層專案客製化的主要方向。
- bundle source repo 現已實際切出 `shared/` 與 `profiles/` 目錄，並建立 `storage-manager-fe`、`nasx86`、`core` 三個 profile 骨架。
- 已定義 `.copilot-bundle/manifest.json` 的 v0 schema，作為 install / status / promote 的共同狀態契約。
- 已定義 `copilot-bundle` npm CLI package 的 v0 命令規格，v0 先以 `install / status / promote` 為主。
- 已建立 npm CLI package 最小骨架 v0，並完成本機 smoke test：`help`、`install`、`status` 可正常執行。
- 若要保留從專案回流到 bundle 的能力，應以 manifest 記錄來源與 managed items，並透過 `install / status / update / promote` 類型的流程處理，而不是依賴手動複製。

## 待確認
- 是否要補一套 CLI 或腳本，將這份 context bundle 套用到其他 repo。
- skills 的長期分類是否要擴充為 `git/`、`workflow/`、`mcp/`、`docs/` 等更明確結構。
- README 與對外說明要公開到什麼粒度，以及何時從 placeholder 轉為正式介紹。
- 哪些 skills、prompts、instructions、hooks、MCP 設定適合放在 `shared`、`profile`、`local`，尤其 hooks 與 MCP 可能更偏向 profile 層。
- profile 層的 `.instructions.md` 要如何命名、寫 `description`，以及是否需要少量 `applyTo` 規則來提高命中率。
- `promote` 的實測是否順利、目前 localOverrides 與 managed item checksum 的互動是否需要再調整。
- 是否要在本機 CLI 驗證穩定後，將 package 發佈到 GitLab Package Registry，並導入 `npx` 安裝流程。

## 下一步
- 持續把高價值的工作流程整理成 skills 與 instructions。
- 釐清 `shared / profile / local` 三層邊界，避免 bundle 被單一專案語境污染。
- 依本次選擇，進一步定義 `copilot-instructions.md` 與 profile `.instructions.md` 的責任分界與命名方式。
- 先完成 `promote` 的 end-to-end 實測，確認回流流程是否真的可用，再決定是否需要調整 manifest 或 CLI 行為。
- 等本機 CLI 與回流流程穩定後，再規劃 `npm link`、private registry 發佈與 `npx` 安裝體驗。
- 後續若出現新的長期方向變更，優先更新這份 topic 摘要，而不是重複新增類似檔案。

## 參考
- `.github/copilot-instructions.md`
- `docs/manifest-v0.md`
- `docs/cli-package-v0.md`
- `docs/schemas/copilot-bundle-manifest.v0.schema.json`
- `.github/skills/`
- `.github/skills/workflow/save-conversation-history/SKILL.md`
- `.vscode/mcp.json`
- `README.md`
- `.copilot-history/`
