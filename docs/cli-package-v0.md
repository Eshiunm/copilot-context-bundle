# Copilot Bundle npm CLI Package Spec v0

## 目的

這份文件定義 `copilot-bundle` npm CLI package 的命令規格 v0。

它回答的問題是：

- CLI 名稱是什麼
- v0 先支援哪些命令
- 每個命令有哪些參數與責任邊界
- 命令如何讀寫 `.copilot-bundle/manifest.json`
- 本機測試應怎麼進行

這份規格建立在 `docs/manifest-v0.md` 之上；若 manifest schema 與 CLI 命令行為衝突，以 manifest schema 與本文件的命令責任為優先討論對象，再一起調整。

## v0 設計原則

- CLI 先支援最小但完整的生命週期：`install`、`status`、`promote`
- bundle source repo 仍然是 source of truth
- target repo 透過 `.copilot-bundle/manifest.json` 保存安裝狀態
- v0 優先支援本機開發與本機測試；`npx` 發佈是下一階段
- 命令責任清楚，不把 setup、publish、sync 全部塞進第一版

## CLI 名稱

- 套件名稱（暫定）：`copilot-context-bundle`
- CLI 命令名稱：`copilot-bundle`

> v0 階段可以先讓 npm package 名稱與 git repo 名稱一致；如果未來要發佈到 private registry，再根據 scope 改成例如 `@qnap/copilot-context-bundle`。

## package 結構建議

```text
copilot-context-bundle/
├─ shared/
├─ profiles/
├─ bin/
│  └─ copilot-bundle.js
├─ lib/
│  ├─ commands/
│  │  ├─ install.js
│  │  ├─ status.js
│  │  └─ promote.js
│  ├─ manifest.js
│  ├─ checksum.js
│  ├─ copy.js
│  └─ paths.js
├─ docs/
└─ package.json
```

## v0 支援命令

| 命令 | 目的 | 會讀 manifest | 會寫 manifest |
|---|---|---:|---:|
| `install` | 將 `shared/` 與指定 `profile` 注入 target repo | 可選 | ✅ |
| `status` | 檢查 managed items 狀態與 drift | ✅ | 可選 |
| `promote` | 將 target repo 內的檔案回流到 bundle source repo | ✅ | 可選 |
| `help` | 顯示使用說明 | ❌ | ❌ |
| `version` | 顯示 CLI 版本 | ❌ | ❌ |

## v0 不先做的命令

這些可以留到 v1 或後續版本：

- `update`
- `uninstall`
- `doctor`
- `publish`
- `init`

原因：在沒有完整驗證 `install / status / promote` 之前，過早加入更多命令只會把責任邊界攪混。

## 全域行為

### 路徑原則

- 所有命令都接受相對或絕對 target path
- 寫入 manifest 時，檔案映射一律使用相對路徑
- bundle source path 一律以 bundle root 為基準

### bundle source 原則

- v0 預設 bundle source = 目前 CLI package 內含的 `shared/` 與 `profiles/`
- 本機開發模式可直接從 workspace 跑 CLI
- 未來若由 npm package 安裝，CLI 邏輯不變，只是 bundle source 變成 package 內容

### overwrite 原則

- 預設不覆蓋 target repo 中已存在且不在 manifest 管理範圍內的檔案
- 只有使用 `--force` 時，才允許覆蓋預期安裝路徑上的既有檔案

### exit code 原則

| Code | 意義 |
|---:|---|
| `0` | 成功 |
| `1` | 一般錯誤，例如檔案複製失敗 |
| `2` | 使用者輸入錯誤，例如缺少參數、profile 不存在 |
| `3` | 狀態檢查失敗，例如 manifest 不存在或格式不符 |
| `4` | 發現衝突，需要使用者介入，例如 target path 已存在 unmanaged file |

## `install`

### 目的

將 bundle 的 `shared/` 與指定 `profiles/<name>/` 內容安裝到 target repo，並寫出 `.copilot-bundle/manifest.json`。

### 命令形式

```text
copilot-bundle install <targetPath> [options]
```

### 參數

| 參數 | 必填 | 說明 |
|---|---:|---|
| `<targetPath>` | ✅ | 目標 repo 或目標資料夾路徑 |
| `--profile <name>` | ❌ | 要安裝的 profile；若省略則只安裝 shared |
| `--target <value>` | ❌ | `github`、`vscode`、`claude`、`all`；v0 預設 `all`，但實際只安裝 bundle 中存在的 target 類型 |
| `--force` | ❌ | 覆蓋既有檔案 |
| `--dry-run` | ❌ | 只列出預計操作，不實際寫檔 |
| `--bundle-source <path>` | ❌ | 僅供本機開發模式覆寫 bundle source 路徑；預設使用目前 package 內容 |

### 行為

1. 解析 target path 與 options
2. 驗證 profile 是否存在（若有指定）
3. 收集要安裝的 source files
4. 檢查 target repo 是否存在 unmanaged collisions
5. 若不是 `--dry-run`：
   - 複製檔案到 target repo
   - 計算 `sha256`
   - 產生 `managedItems`
   - 寫出 `.copilot-bundle/manifest.json`
6. 輸出摘要：
   - 安裝了多少檔案
   - 使用哪個 profile
   - manifest 路徑

### 讀寫 manifest

- 若 target repo 已存在 manifest：
  - v0 預設視為重新安裝同一 repo
  - 若未指定 `--force`，遇到 manifest 已存在時應提示並中止
- 安裝成功後一定寫 manifest

### 成功輸出建議

```text
Installed shared + profile 'storage-manager-fe' to D:\repo\target
Managed items: 6
Manifest: D:\repo\target\.copilot-bundle\manifest.json
```

## `status`

### 目的

檢查 target repo 中 manifest 記錄的 managed items 目前狀態，讓使用者知道是否有 drift、missing item 或 local override。

### 命令形式

```text
copilot-bundle status <targetPath> [options]
```

### 參數

| 參數 | 必填 | 說明 |
|---|---:|---|
| `<targetPath>` | ✅ | 目標 repo 或目標資料夾路徑 |
| `--json` | ❌ | 以 JSON 輸出結果，便於後續自動化 |
| `--fail-on-drift` | ❌ | 若有 drift 或 missing item，回傳非 0 exit code |

### 行為

1. 讀取 `.copilot-bundle/manifest.json`
2. 驗證 manifest 是否符合 schema
3. 對每個 `managedItem`：
   - 檢查 `targetPath` 是否存在
   - 重新計算 checksum
   - 與 manifest 內的 checksum 比較
4. 產出狀態摘要：
   - `ok`
   - `modified`
   - `missing`
5. 顯示 `localOverrides` 摘要

### `status` 的判定語意

| 狀態 | 說明 |
|---|---|
| `ok` | 檔案存在，且 checksum 與 manifest 一致 |
| `modified` | 檔案存在，但 checksum 與 manifest 不一致 |
| `missing` | manifest 有記錄，但 target repo 中找不到檔案 |

### 輸出示例

```text
Bundle: copilot-context-bundle
Profile: storage-manager-fe
Managed items: 6
OK: 4
Modified: 1
Missing: 1
```

## `promote`

### 目的

將 target repo 中某個檔案的現況回流到 bundle source repo，作為後續在 bundle repo 內 review、commit、再發佈的起點。

### 命令形式

```text
copilot-bundle promote <targetPath> --file <repoRelativePath> [options]
```

### 參數

| 參數 | 必填 | 說明 |
|---|---:|---|
| `<targetPath>` | ✅ | 目標 repo 或目標資料夾路徑 |
| `--file <repoRelativePath>` | ✅ | target repo 內要 promote 的相對路徑 |
| `--to <layer>` | ❌ | 明確指定 promote 目的地，例如 `shared` 或 `profile:storage-manager-fe` |
| `--bundle-source <path>` | ❌ | 本機 bundle source repo 路徑；本機測試 promote 時建議必填 |
| `--dry-run` | ❌ | 顯示預期回填位置，不實際寫檔 |
| `--force` | ❌ | 若 bundle source 目標檔案已存在，允許覆蓋 |

### 行為

1. 讀 manifest
2. 找出 `--file` 對應的 managed item，或判斷它是否為 local candidate
3. 推導回填目的地：
   - 若 managed item 已有 `sourcePath`，預設回填到原來源位置
   - 若使用者提供 `--to`，則以 `--to` 覆蓋預設目的地
4. 若不是 `--dry-run`：
   - 複製 target repo 的檔案到 bundle source repo 對應位置
   - 視需要更新 target repo manifest 的 `localOverrides`
5. 提示使用者下一步：
   - 回到 bundle source repo review diff
   - commit
   - 再重新 publish / install

### v0 限制

- promote 不直接 commit bundle source repo
- promote 不直接 publish npm package
- promote 不自動修改 target repo 中其他 managed items

## `help`

### 目的

顯示命令清單與各命令的基本用法。

### 命令形式

```text
copilot-bundle help
copilot-bundle <command> --help
```

## `version`

### 目的

輸出 CLI 版本，供本機測試與 issue 回報使用。

### 命令形式

```text
copilot-bundle version
copilot-bundle --version
```

## 本機測試模式規格

v0 應明確支援本機開發，不要求一開始就 publish 到 private registry。

### 建議測試順序

1. 直接以 Node 執行 CLI entry：
   - `node bin/copilot-bundle.js install <targetPath> --profile storage-manager-fe`
2. 以 `npm link` 模擬 CLI 安裝體驗
3. 等本機 install / status / promote 都穩定後，再考慮發佈到 registry

### 本機測試時的 bundle source

- 若直接在 repo workspace 內執行 CLI，預設 bundle source 就是目前 workspace
- 若之後從 npm package 執行，預設 bundle source 是 package 內容

## v0 命令邊界總結

- `install`：把資產裝進去，並寫 manifest
- `status`：看目前狀態是否偏離 manifest
- `promote`：把 target repo 的檔案回填到 bundle source repo

這三個命令合起來，就形成 v0 的最小可管理生命週期。

## 下一步

有了這份命令規格 v0 之後，接下來可依序進行：

1. 補 `package.json` 的最小欄位
2. 建立 `bin/copilot-bundle.js`
3. 先實作 `install`
4. 用本機 sandbox repo 測試 manifest 是否正確產生
5. 再補 `status` 與 `promote`