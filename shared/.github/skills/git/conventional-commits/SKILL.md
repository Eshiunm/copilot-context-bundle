---
name: conventional-commits
description: "產生符合 Conventional Commits 的 Git commit 訊息。當使用者要求撰寫 commit message、準備 git commit、根據 staged changes 摘要 commit，或提到 feat/fix/docs/chore 這類 commit 類型時使用。"
---

# Conventional Commits

當你要準備或檢查 Git commit 訊息時，使用這個 skill。

## 目標

產生能準確描述實際變更、並符合 Conventional Commits 格式的 commit 訊息。

## 工作流程

1. 在撰寫訊息前，先檢查 staged changes、`git diff` 或實際變更的檔案。
2. 選擇最精準、範圍最窄的 type：
   - `feat`：新增功能
   - `fix`：修正 bug 或回歸問題
   - `docs`：純文件變更
   - `refactor`：不改變外部行為的內部重構
   - `test`：新增或更新測試
   - `build`：建置系統或相依套件管理變更
   - `ci`：CI/CD 流程變更
   - `perf`：效能改善
   - `chore`：不屬於上述類型的維護或雜務
   - `revert`：還原先前的 commit
3. 只有在 scope 能明確提升精準度時才加入，例如功能區域、套件、資料夾或模組。
4. 主旨使用祈使句，並保持精簡。
5. 可行時，優先使用單行主旨，長度盡量控制在 72 個字元內。
6. 只有在額外背景確實有幫助時才加入 body，例如動機、取捨或後續工作。
7. 如果是破壞性變更，在 type 或 scope 後加上 `!`，並加入 `BREAKING CHANGE:` footer。
8. 如果 diff 中混有彼此無關的變更，應建議拆成多個 commit，而不是硬湊成一則訊息。

## 輸出格式

預設使用以下結構：

```text
type(scope): summary
```

需要補充時，延伸為：

```text
type(scope): summary

可選的 body，用來說明這個變更為什麼存在。

BREAKING CHANGE: 說明不相容的變更
```

## 規則

- 訊息必須根據實際 diff，而不是只依賴使用者口頭描述。
- 如果變更沒有清楚邊界，不要硬湊 scope。
- 主旨要具體，避免使用像 `update code` 或 `fix stuff` 這種模糊描述。
- 如果使用者要求你執行 `git commit`，除非對方明確要求立刻提交，否則先提出建議訊息。
- 如果存在多個合理寫法，優先選擇最能描述使用者可感知變更或行為影響的版本。

## 範例

範例 1：

輸入：在 workspace 設定中加入 GitHub MCP 的 PAT 驗證支援。

輸出：

```text
feat(mcp): add PAT-based GitHub MCP authentication
```

範例 2：

輸入：修正壞掉的 repository 搜尋篩選邏輯。

輸出：

```text
fix(search): correct repository filter logic
```

範例 3：

輸入：只更新 README 的安裝步驟。

輸出：

```text
docs(readme): clarify setup instructions
```
