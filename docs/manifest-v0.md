# Copilot Bundle Manifest Schema v0

## 目的

`manifest` 是 bundle 安裝到 target repo 後留下的機器可讀狀態檔，用來記錄：

- 這次安裝使用了哪個 bundle 來源
- 安裝了哪個 profile
- 實際安裝了哪些 managed items
- 每個 managed item 來自哪個 source path、落到哪個 target path
- 安裝當下的內容校驗值（checksum）

預設位置：`.copilot-bundle/manifest.json`

## 為什麼需要 manifest

如果只有 `install`，沒有 `manifest`，CLI 只能做到「複製檔案」。

加入 `manifest` 後，CLI 才能在後續生命週期中做到：

- `install`：留下正式安裝紀錄
- `status`：比對 drift 與 missing items
- `update`：只更新受管理的檔案
- `promote`：把 target repo 的修改回流到 bundle source repo

## 設計目標

- 讓 bundle source repo 仍然是 source of truth
- 讓 target repo 保留可追蹤的安裝狀態
- 讓 `managedItems` 可以精準對應 source/target 映射
- 支援本機測試安裝與未來 npm package 安裝兩種來源
- 不記錄 secrets、token 或機器專屬絕對路徑

## 非目標

- 不記錄 target repo 的所有檔案
- 不保存檔案完整內容快照
- 不取代 README 或其他人類文件
- 不直接充當 bundle source repo 的作者資料庫

## v0 範圍與限制

- 每次安裝只支援一個 profile；若只安裝 shared，`profile` 可為 `null`
- `managedItems` 以「每一個檔案」為單位，不以整個資料夾為單位
- `checksumAlgorithm` 固定為 `sha256`
- `localOverrides` 先保留為陣列欄位，初期可以是空陣列
- `bundle.sourceType` 目前只支援：
  - `local-workspace`
  - `npm-package`

## 欄位總覽

### Top-level

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---:|---|
| `schemaVersion` | string | ✅ | manifest schema 版本，v0 固定為 `0.1.0` |
| `bundle` | object | ✅ | bundle 來源資訊 |
| `installer` | object | ✅ | 寫入 manifest 的 CLI 工具資訊 |
| `installedAt` | string | ✅ | 安裝時間，ISO 8601 date-time |
| `profile` | string \| null | ✅ | 本次安裝的 profile；shared-only 安裝時為 `null` |
| `targets` | string[] | ✅ | 本次安裝的目標類型，例如 `github`、`vscode`、`claude` |
| `checksumAlgorithm` | string | ✅ | v0 固定為 `sha256` |
| `managedItems` | array | ✅ | 本次安裝所管理的檔案清單 |
| `localOverrides` | array | ✅ | 後續被標記為 local 的項目清單 |

### `bundle`

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---:|---|
| `name` | string | ✅ | bundle 名稱，例如 `copilot-context-bundle` |
| `sourceType` | string | ✅ | `local-workspace` 或 `npm-package` |
| `packageName` | string \| null | ✅ | npm package 名稱；本機測試時可為 `null` |
| `packageVersion` | string \| null | ✅ | npm package 版本；本機測試時可為 `null` |
| `repository` | string \| null | ✅ | source repo 位址，例如 GitLab URL |
| `commit` | string \| null | ✅ | bundle source commit SHA；如果不可得可為 `null` |

### `installer`

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---:|---|
| `name` | string | ✅ | CLI 名稱，例如 `copilot-bundle` |
| `version` | string | ✅ | CLI 版本 |

### `managedItems[]`

每一筆 `managedItem` 對應一個實際受 bundle 管理的檔案。

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---:|---|
| `layer` | string | ✅ | `shared` 或 `profile` |
| `target` | string | ✅ | `github`、`vscode` 或 `claude` |
| `sourcePath` | string | ✅ | 相對於 bundle root 的來源路徑 |
| `targetPath` | string | ✅ | 相對於 target repo root 的目標路徑 |
| `checksum` | string | ✅ | 安裝當下檔案內容的 `sha256` |

### `localOverrides[]`

v0 先保留簡化結構，讓後續 `status` 或 `promote` 可記錄 local 化結果。

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---:|---|
| `targetPath` | string | ✅ | target repo 中的相對路徑 |
| `reason` | string | ✅ | `keep-local`、`user-owned`、`promoted` |
| `recordedAt` | string | ✅ | 記錄時間，ISO 8601 date-time |

## 命令生命週期中的角色

### `install`

- 根據 `shared/` 與 `profiles/<name>/` 產生 `managedItems`
- 計算 checksum
- 在 target repo 寫出 `.copilot-bundle/manifest.json`

### `status`

- 讀 manifest
- 用 `managedItems` 的 `targetPath` 找目前檔案
- 用 `checksum` 比對目前內容是否 drift
- 檢查是否有 missing items 或 local overrides

### `update`

- 讀 manifest 知道目前安裝的是哪個 profile
- 只更新 manifest 中記錄的 managed items
- 不應任意覆蓋 manifest 未記錄的 local 檔案

### `promote`

- 根據 `managedItems.sourcePath` 找回 bundle source repo 應回寫的位置
- 決定 target repo 內的修改應 promote 到 `shared/` 還是某個 `profiles/<name>/`

## 路徑規則

- `sourcePath` 必須是相對於 bundle root 的相對路徑
- `targetPath` 必須是相對於 target repo root 的相對路徑
- v0 不接受絕對路徑
- `shared` layer 的 `sourcePath` 應以 `shared/` 開頭
- `profile` layer 的 `sourcePath` 應以 `profiles/<profile>/` 開頭

## 建議是否納入版控

建議將 `.copilot-bundle/manifest.json` 一併納入 target repo 版控，原因是：

- `status` / `update` / `promote` 需要穩定狀態檔
- 團隊成員切換環境時仍能知道目前 repo 安裝了什麼
- 避免 target repo 只剩下檔案結果，卻不知道來源與層級

## v0 範例

```json
{
  "schemaVersion": "0.1.0",
  "bundle": {
    "name": "copilot-context-bundle",
    "sourceType": "local-workspace",
    "packageName": null,
    "packageVersion": null,
    "repository": "https://gitlab.example.com/team/copilot-context-bundle.git",
    "commit": "d5180b748c55e7dffb454db5a24f544f3c8a76ea"
  },
  "installer": {
    "name": "copilot-bundle",
    "version": "0.1.0"
  },
  "installedAt": "2026-04-13T10:30:00.000Z",
  "profile": "storage-manager-fe",
  "targets": ["github", "vscode"],
  "checksumAlgorithm": "sha256",
  "managedItems": [
    {
      "layer": "shared",
      "target": "github",
      "sourcePath": "shared/.github/copilot-instructions.md",
      "targetPath": ".github/copilot-instructions.md",
      "checksum": "1111111111111111111111111111111111111111111111111111111111111111"
    },
    {
      "layer": "profile",
      "target": "github",
      "sourcePath": "profiles/storage-manager-fe/.github/instructions/storage-manager-fe.instructions.md",
      "targetPath": ".github/instructions/storage-manager-fe.instructions.md",
      "checksum": "2222222222222222222222222222222222222222222222222222222222222222"
    },
    {
      "layer": "shared",
      "target": "vscode",
      "sourcePath": "shared/.vscode/mcp.json",
      "targetPath": ".vscode/mcp.json",
      "checksum": "3333333333333333333333333333333333333333333333333333333333333333"
    }
  ],
  "localOverrides": []
}
```

## 下一步

有了這份 schema v0 之後，下一步可依它設計 npm CLI package 的：

1. `install` 命令參數
2. checksum 計算方式
3. `status` 的 drift 判定規則
4. `promote` 的來源回填策略
