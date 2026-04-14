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
- `shared/.github/instructions/copilot-context-bundle-operations.instructions.md`
- `shared/.github/skills/git/conventional-commits/`
- `shared/.github/skills/workflow/save-conversation-history/`
- `shared/.vscode/mcp.json`
- `profiles/storage-manager-fe/.github/instructions/`
- `profiles/nasx86/.github/instructions/`
- `profiles/core/.github/instructions/`

後續如果要把注入流程正式工具化，會以 `install / status / update / promote` 為主要方向。

## npm CLI package v0 現況

這個 repo 現在已包含 `copilot-bundle` 的 v0 CLI 實作，可供本機開發、本機驗證與 bundle round-trip 測試使用。

### 前置條件

- Node.js 18 以上

### 本機執行

```text
npm test
npm run cli -- --help
npm run cli -- install ..\bundle-sandbox --profile storage-manager-fe --dry-run
npm run cli -- status ..\bundle-sandbox
npm run cli -- update ..\bundle-sandbox --bundle-source . --dry-run
npm run cli -- promote ..\bundle-sandbox --file .github\instructions\storage-manager-fe\storage-manager-fe.instructions.md --bundle-source .
```

### 自動化測試

```text
npm test
```

目前自動化測試已覆蓋：

- `help` / `version` 基本 CLI 輸出
- `install` 與 `status` 基本安裝狀態
- `update` 的 refresh / add / restore / drift / `--force` / `--prune` / relocation
- `promote` 的 baseline reset 與 managed file relocate

### 指令、參數、完成度、測試狀態對照表

| 指令 | 主要參數 | 功能摘要 | 完成度 | 是否測過 |
|---|---|---|---|---|
| `install` | `<targetPath>`、`--profile`、`--target`、`--force`、`--dry-run`、`--bundle-source` | 安裝 `shared/` 與指定 `profile`，並寫出 `.copilot-bundle/manifest.json` | 已完成 | 是（自動化測試 + smoke test） |
| `status` | `<targetPath>`、`--detail`、`--json`、`--fail-on-drift` | 根據 manifest 檢查 managed items 狀態；文字輸出顯示 `profile / managed items / modified / missing`，`--detail` 可展開相對路徑明細 | 已完成 | 是（自動化測試 + smoke test） |
| `update` | `<targetPath>`、`--bundle-source`、`--dry-run`、`--force`、`--prune`、`--json` | 依目前 bundle source 更新同一組 managed items，支援 refresh / add / restore / prune / relocation | 已完成（v0 第一版） | 是（自動化測試 + smoke test） |
| `promote` | `<targetPath>`、`--file`、`--to`、`--bundle-source`、`--dry-run`、`--force` | 將 target repo 檔案回填到 bundle source repo，並更新 target baseline 與來源對位 | 已完成 | 是（自動化測試 + happy path / edge cases） |
| `help` | `help [command]`、`<command> --help` | 顯示整體或單一命令的使用說明 | 已完成 | 是（自動化測試） |
| `version` | `version`、`--version` | 顯示 CLI 版本 | 已完成 | 是（自動化測試） |

註：上表的「是否測過」代表目前已具備本地自動化驗證與手動 smoke / 邊界驗證；但仍不等同完整 CI 級別覆蓋。

### 目前已完成的命令生命週期

- `install`：把資產裝進 target repo，並寫 manifest
- `status`：檢查 target repo 是否偏離 manifest
- `update`：沿用既有 manifest 身分同步最新 bundle source
- `promote`：把 target repo 的修改回填到 bundle source repo

這四個命令已形成目前 v0 的最小可管理生命週期。

### 目前限制

- v0 先以本機 workspace 執行與本機測試為主，尚未接 private npm registry 發佈流程。
- `uninstall`、`doctor`、`publish`、`init` 等命令尚未實作。
- `update` 目前為 v0 第一版，已支援核心同步路徑與自動化測試，但尚未加入更高階的 rename 推斷與更完整的長期回歸測試矩陣。