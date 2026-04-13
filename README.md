# copilot-context-bundle

這個 repo 用來維護可注入其他專案的 Copilot context bundle。

## 目前定位

- `shared/`：所有 target repo 都會安裝的共用基底。
- `profiles/`：特定專案或專案家族的客製化資產。
- `local`：不存放在這個 bundle repo；由 target repo 自己維護。

## 目錄結構

```text
copilot-context-bundle/
├─ shared/
│  ├─ .github/
│  │  ├─ copilot-instructions.md
│  │  └─ skills/
│  │     ├─ git/
│  │     └─ workflow/
│  └─ .vscode/
│     └─ mcp.json
├─ profiles/
│  ├─ storage-manager-fe/
│  ├─ nasx86/
│  └─ core/
├─ .github/
├─ .vscode/
└─ README.md
```

## 根目錄與 bundle source 的差別

- 根目錄的 `.github/` 與 `.vscode/` 是用來維護這個 bundle repo 本身的工作區設定。
- `shared/` 與 `profiles/` 才是未來注入到 target repo 的正式來源。
- `shared/.github/copilot-instructions.md` 是 shared 基底；專案客製化規則優先放在 `profiles/*/.github/instructions/*.instructions.md`。
- 為了不影響這個 bundle repo 自己的使用體驗，部分 shared 類型的 customizations 目前在根目錄仍保留作者側副本；`shared/` 才是未來注入流程應採用的來源。
- `skill-creator` 目前保留在根目錄 `.github/skills/`，作為維護這個 bundle repo 的作者工具，不列入預設 shared 注入內容。

## 注入模型

未來將 bundle 注入某個 target repo 時，預期流程是：

1. 安裝 `shared/` 內容。
2. 安裝選定 profile 的內容，例如 `profiles/storage-manager-fe/`。
3. 在 target repo 寫入 `.copilot-bundle/manifest.json`，記錄 profile 與 managed items。
4. target repo 若需要 repo 專屬規則，再自行新增 `local` 內容。

## 目前已建立的 shared / profile 骨架

- `shared/.github/copilot-instructions.md`
- `shared/.github/skills/git/conventional-commits/`
- `shared/.github/skills/workflow/save-conversation-history/`
- `shared/.vscode/mcp.json`
- `profiles/storage-manager-fe/.github/instructions/`
- `profiles/nasx86/.github/instructions/`
- `profiles/core/.github/instructions/`

後續如果要把注入流程正式工具化，會以 `install / status / update / promote` 為主要方向。

## npm CLI package skeleton v0

這個 repo 現在已包含 `copilot-bundle` 的最小 npm CLI package 骨架，供本機開發與本機驗證使用。

### 前置條件

- Node.js 18 以上

### 本機執行

```text
npm run cli -- --help
npm run cli -- install ..\bundle-sandbox --profile storage-manager-fe --dry-run
npm run cli -- status ..\bundle-sandbox
```

### 目前命令範圍

- `install`：安裝 `shared/` 與指定 `profile`，並寫出 `.copilot-bundle/manifest.json`
- `status`：根據 manifest 檢查 managed items 是否 drift
- `promote`：將 target repo 檔案回填到 bundle source repo

### 目前限制

- v0 先以本機 workspace 執行與本機測試為主，尚未接 private npm registry 發佈流程。
- `update`、`uninstall`、`doctor` 等命令暫未實作。