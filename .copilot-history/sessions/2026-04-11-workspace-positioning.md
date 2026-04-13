# 2026-04-11 Workspace Positioning

## 類別
- topic: session-summary
- status: done

## 背景
- 今天先完成 GitHub MCP、skills、git workflow、README 與 remote push 等基礎整理，之後聚焦在這個 workspace 的長期定位。
- 使用者希望這個 repo 能作為未來可重用的 Copilot context 資產庫，而不是一次性的實驗專案。

## 已定案
- 這個 workspace 的核心定位是公開、可重用、可逐步累積的 Copilot context bundle。
- 主要內容會放 skills、prompts、instructions、copilot-instructions 與 workflow 規則。
- 本地對話保存方式採 `.copilot-history/`，只保存低 token 摘要，不保存逐字對話，且只在使用者要求或同意時寫入。
- 未來延續話題時，應先讀 `.copilot-history/INDEX.md`，再讀對應的 topic 或 session。
- 已新增 `save-conversation-history` skill，讓「保存對話內容 / 保存目前 session / 記錄今天討論」這類需求更容易被正確觸發。

## 待確認
- 是否要把 bundle 的匯入流程產品化成 CLI 或腳本。
- 是否要針對「保存對話內容」之外，再補更多 workflow 類 skills。

## 下一步
- 後續實際使用 `save-conversation-history` skill，視觸發效果再調整 description。
- 之後遇到重要且可延續的討論結束時，主動詢問是否保存本次摘要。

## 參考
- `topics/workspace-positioning.md`
- `.github/copilot-instructions.md`
- `.copilot-history/README.md`
- `.github/skills/workflow/save-conversation-history/SKILL.md`