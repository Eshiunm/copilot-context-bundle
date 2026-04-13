# Local Copilot History

這個資料夾只用來保存「與 Copilot 討論後整理出的重點摘要」，不保存逐字對話紀錄。

設計目標：

- 僅保留後續延續討論所需的重點
- 內容要短、可分類、低 token 成本
- 一律只在使用者明確要求保存，或在對話結束前詢問並得到同意後才寫入

建議結構：

- `topics/`：長期主題摘要，例如 repo 命名、skills 分類、workflow 設計
- `sessions/`：單次 session 的壓縮摘要，適合需要回溯特定一次討論時使用
- `INDEX.md`：索引與分類入口，先看這份再決定要讀哪一份摘要

建議摘要格式：

```md
# 標題

## 類別
- topic: naming / workflow / skills / mcp / git / docs
- status: active / paused / done

## 背景
- 只寫延續討論真正需要知道的前情

## 已定案
- 具體決策

## 待確認
- 尚未定案或需要追問的點

## 下一步
- 下次接續時最應先做的事

## 參考
- 相關檔案、指令、repo 連結
```