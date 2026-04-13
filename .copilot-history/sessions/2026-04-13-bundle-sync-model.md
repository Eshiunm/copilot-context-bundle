# 2026-04-13 Bundle Sync Model

## 類別
- topic: session-summary
- status: done

## 背景
- 使用者盤點了多個 QNAP 專案，包括 `Storage-manager-fe`、`nasx86`、`Core` 與其他未來新增專案，開始思考 Copilot context bundle 要如何套用到不同 repo。
- 討論從資料夾結構開始，延伸到單一 workspace 是否應包含多個專案、`copilot-instructions.md` 是否應負責專案分流，以及 bundle 更新如何回流到遠端。

## 已定案
- 開發模型採「每個 workspace 只放一個 QNAP 專案」，不以父資料夾共用一套 workspace 級 Copilot 客製化作為正式設計。
- 不建議把 `copilot-instructions.md` 當成專案分流路由器；它應保留為薄的共用基底規則。
- 較穩定的方向是 bundle repo 提供 `shared` 與各專案的 `profile`，安裝時依使用者選擇的專案 profile 將內容落到目標 repo。
- 為了保留雙向更新能力，需要在目標 repo 記錄 manifest，讓工具知道目前安裝了哪個 profile、哪些檔案屬於 managed items，以及它們來自哪一層。
- `shared` 代表可跨專案重用的內容，`profile` 代表某個專案或某類專案專用內容，`local` 代表只屬於當前 repo、只進該 repo 版控而不回 bundle 的內容。
- 後續若在 `Storage-manager-fe` 內改出新 skill，應由人決定它要 promote 到 `shared`、該專案的 `profile`，還是維持 `local`，而不是期待工具自動判斷。

## 待確認
- manifest 應記錄哪些欄位，例如 bundle repo、來源版本、profile、managed items、checksum 與 local overrides。
- CLI 第一版是否實作 `install / status / update / promote` 即可，還是需要更多互動式流程。
- hooks 與 MCP 設定的共享比例要如何控制，避免被單一技術棧或單一專案需求綁死。

## 下一步
- 先定義 manifest schema，因為雙向更新是否成立取決於來源追蹤與 managed item 記錄。
- 再定義 CLI 指令的責任邊界，特別是 `promote` 如何讓使用者明確選擇回流到 `shared`、`profile` 或保留 `local`。
- 等同步模型穩定後，再考慮如何把 bundle 安裝流程包成 CLI 或其他較順手的導入方式。

## 參考
- `topics/workspace-positioning.md`
- `.github/copilot-instructions.md`
- `.vscode/mcp.json`
- `.copilot-history/INDEX.md`