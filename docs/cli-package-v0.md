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

- 目前 CLI 實作已支援：`install`、`status`、`promote`
- 本文件補上 `update` 命令 v0 規格，作為下一步實作依據
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
│  │  ├─ update.js
│  │  └─ promote.js
│  ├─ manifest.js
│  ├─ checksum.js
│  ├─ copy.js
│  └─ paths.js
├─ docs/
└─ package.json
```

## v0 支援命令

| 命令 | 目的 | 會讀 manifest | 會寫 manifest | 狀態 |
|---|---|---:|---:|---|
| `install` | 將 `shared/` 與指定 `profile` 注入 target repo | 可選 | ✅ | 已實作 |
| `status` | 檢查 managed items 狀態與 drift | ✅ | 可選 | 已實作 |
| `update` | 依目前 bundle source 更新同一組 managed items | ✅ | ✅ | 規格完成，待實作 |
| `promote` | 將 target repo 內的檔案回流到 bundle source repo | ✅ | 可選 | 已實作 |
| `help` | 顯示使用說明 | ❌ | ❌ | 已實作 |
| `version` | 顯示 CLI 版本 | ❌ | ❌ | 已實作 |

## v0 不先做的命令

這些可以留到 v1 或後續版本：

- `uninstall`
- `doctor`
- `publish`
- `init`

原因：在沒有完整驗證 `install / status / update / promote` 之前，過早加入更多命令只會把責任邊界攪混。

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
| `--detail` | ❌ | 文字模式輸出完整 managed item 相對路徑明細 |
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
5. 預設文字輸出只顯示摘要：
   - `bundle`
   - `profile`
   - `managed items`
   - `ok / modified / missing`
6. 若指定 `--detail`，文字輸出會額外列出相對 `targetPath`：
   - 全部 `managed items`
   - `modified` items
   - `missing` items
7. `--json` 仍輸出完整結構化資料，不受 `--detail` 影響
8. 顯示 `localOverrides` 摘要

### `status` 的判定語意

| 狀態 | 說明 |
|---|---|
| `ok` | 檔案存在，且 checksum 與 manifest 一致 |
| `modified` | 檔案存在，但 checksum 與 manifest 不一致 |
| `missing` | manifest 有記錄，但 target repo 中找不到檔案 |

### 預設輸出示例

```text
Bundle: copilot-context-bundle
Profile: storage-manager-fe
Managed items: 6
OK: 4
Modified: 1
Missing: 1
```

### `--detail` 輸出示例

```text
Profile: storage-manager-fe
Managed items: 6
   - .github/copilot-instructions.md
   - .github/instructions/common/copilot-context-bundle-operations.instructions.md
   - .github/instructions/storage-manager-fe/storage-manager-fe.instructions.md
   - ...
OK: 4
Modified: 1
   - .github/instructions/storage-manager-fe/storage-manager-fe.instructions.md
Missing: 1
   - .vscode/mcp.json
```

## `update`

### 目的

將 target repo 目前已安裝的 bundle 資產更新到「目前 bundle source 的最新內容」，但仍維持同一份 manifest 所描述的 profile 與 targets 邊界。

換句話說，`update` 是「沿用既有安裝身份進行同步」，不是用來切換 profile 或重選 targets；若要改安裝組合，應回到 `install --force`。

### 命令形式

```text
copilot-bundle update <targetPath> [options]
```

### 參數

| 參數 | 必填 | 說明 |
|---|---:|---|
| `<targetPath>` | ✅ | 目標 repo 或目標資料夾路徑 |
| `--bundle-source <path>` | ❌ | 僅供本機開發模式覆寫 bundle source 路徑；預設使用目前 package 內容 |
| `--dry-run` | ❌ | 只列出預計更新 / 新增 / 移除的項目，不實際寫檔 |
| `--force` | ❌ | 允許覆蓋 drifted managed item、受保護的 local override 路徑，或新項目的 target collision |
| `--prune` | ❌ | 允許移除目前 manifest 有記錄、但最新 bundle install plan 已不存在的 managed items |
| `--json` | ❌ | 以 JSON 輸出 update plan / 結果，便於後續自動化 |

### 行為

1. 讀取並驗證 target repo 的 manifest
2. 根據 manifest 內的 `profile` 與 `targets`，從目前 bundle source 重建最新 install plan
3. 以 `targetPath` 作為比對主鍵，將「現有 manifest managed items」與「最新 install plan」分成三類：
   - `matched`：兩邊都有同一個 `targetPath`
   - `added`：最新 install plan 有，但現有 manifest 沒有
   - `removed`：現有 manifest 有，但最新 install plan 沒有
4. 先做完整 preflight，預設只要有衝突就不寫檔：
   - `matched` 項目若目前 target 檔案 checksum 與 manifest 不一致，視為 drift；除非使用 `--force`，否則中止
   - `added` 項目若 target path 已被 unmanaged file 佔用，視為 collision；除非使用 `--force`，否則中止
   - `removed` 項目若未指定 `--prune`，視為需要人工確認的變更；預設中止
   - `localOverrides` 中若同一路徑被標記為 `keep-local` 或 `user-owned`，預設不得覆寫；需 `--force`
   - `localOverrides.reason = promoted` 視為審計紀錄，不會讓該 managed item 永久跳過 update
5. 若不是 `--dry-run`：
   - 將 `matched` 與 `added` 項目依最新 bundle source 寫入 target repo
   - 重新建立原本 `missing`、但仍存在於最新 install plan 的 managed item
   - 若使用 `--prune`，移除 `removed` 項目對應的 target 檔案與 manifest 記錄
   - 以最新 install plan 重建 manifest 的 `bundle` / `installedAt` / `managedItems`
   - 保留仍適用的 `localOverrides`；若某筆 override 對應的 target path 已被 `--prune` 移除，則同步清掉該 override
6. 輸出摘要：
   - `updated`
   - `added`
   - `restored`
   - `pruned`
   - `conflicts`

### `update` 的關鍵語意

- `update` 以 `targetPath` 作為主要對應鍵，而不是只看 `sourcePath`
- 這樣可以接受 bundle source 內部的來源搬移，例如：
  - `profiles/storage-manager-fe/...` → `shared/...`
  - 同一個 target 檔案改由不同 layer 提供
- 只要最新 install plan 仍對應到同一個 `targetPath`，`update` 就應更新 manifest 的 `sourcePath` / `layer` / `checksum`

### `update` v0 限制

- 不支援直接用 `update` 切換 profile；要換 profile 請重新 `install --force`
- 不支援直接改 targets 集合；要從 `github`-only 變成 `all`，請重新 `install --force`
- 若 bundle source 對 target path 發生大規模 rename，v0 先以 `--prune` + 新增項目處理，不做更高階 rename 推斷
- v0 採保守策略：預設先做完整 preflight，有衝突就整體中止，不做部分成功、部分失敗的半套更新

### 成功輸出建議

```text
Updated bundle-managed files in D:\repo\target
Profile: storage-manager-fe
Updated: 4
Added: 1
Restored: 1
Pruned: 0
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
   - 若 managed item 的 promote 目的地與原 `sourcePath` 不同，移除舊的 bundle source 檔案，避免未來 install 出現 duplicate target mapping
   - 若目標檔原本已是 managed item，更新 target repo manifest 中該 item 的 `sourcePath` / `layer`（如有變更）與 `checksum`，將 promote 後內容視為新的 target baseline
   - 更新 target repo manifest 的 `localOverrides`
5. 提示使用者下一步：
   - 回到 bundle source repo review diff
   - commit
   - 再重新 publish / install

### v0 限制

- promote 不直接 commit bundle source repo
- promote 不直接 publish npm package
- promote 不自動修改 target repo 中其他 managed items
- promote 若處理的是原本不在 manifest 內的 local 檔案，v0 不會自動把它新增成新的 managed item；此情況只回填 bundle source 並留下 promote 紀錄

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
3. 等本機 install / status / update / promote 都穩定後，再考慮發佈到 registry

### 本機測試時的 bundle source

- 若直接在 repo workspace 內執行 CLI，預設 bundle source 就是目前 workspace
- 若之後從 npm package 執行，預設 bundle source 是 package 內容

### instruction target path 分類規則

- 來自 `shared/.github/instructions/*.instructions.md` 的檔案，在 target repo 中應安裝到 `.github/instructions/common/`
- 來自 `profiles/<name>/.github/instructions/*.instructions.md` 的檔案，在 target repo 中應安裝到 `.github/instructions/<name>/`
- 這代表 target repo 內的 instruction 路徑會依來源層級分類，而不是全部平鋪在 `.github/instructions/` 根目錄

## v0 命令邊界總結

- `install`：把資產裝進去，並寫 manifest
- `status`：看目前狀態是否偏離 manifest
- `update`：把同一組 managed items 同步到目前 bundle source 的最新版本
- `promote`：把 target repo 的檔案回填到 bundle source repo

這四個命令合起來，就形成 v0 的最小可管理生命週期。

## 下一步

有了這份命令規格 v0 之後，接下來可依序進行：

1. 新增 `lib/commands/update.js`
2. 在 `lib/cli.js` 與 `lib/commands/help.js` 接上 `update`
3. 用本機 sandbox repo 補齊 `update` 情境測試：
   - 正常 refresh
   - drift conflict
   - missing restore
   - added item
   - `--prune` 移除舊項目
4. 再評估是否要把 `update` 一起納入後續 `npx` / registry 發佈流程