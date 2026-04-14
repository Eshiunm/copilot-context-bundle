# Update 命令實作設計 v0

## 目的

這份文件是 `docs/cli-package-v0.md` 中 `update` 命令規格的實作設計稿。

它回答的問題是：

- `update` 實作時應改哪些檔案
- 目前既有模組哪些可以直接重用
- 哪些地方需要先做小幅重構
- `update` 應如何切分成 preflight / apply 兩個階段
- `--force`、`--prune`、`localOverrides` 應在程式裡怎麼判斷

這份文件的目標不是取代命令規格，而是讓下一步建立 `lib/commands/update.js` 時，有一份可直接照著落地的骨架。

## 現況盤點

### 已可重用的模組

- `lib/args.js`
  - 可直接沿用參數解析與 `CliError`
- `lib/constants.js`
  - 可直接沿用 `EXIT_CODES`、`MANIFEST_RELATIVE_PATH`
- `lib/bundle.js`
  - 已有 `resolveBundleRoot`
  - 已有 `collectLayerItems` 所需的底層能力
  - 已有 `buildInstallPlan` 的整體思路
- `lib/manifest.js`
  - 已有 `readManifest`
  - 已有 `buildManifest`
  - 已有 `writeManifest`
- `lib/checksum.js`
  - 可直接沿用 `sha256File`

### 目前的關鍵缺口

#### 1. `buildInstallPlan` 目前只接受單一 `targetOption`

現況：

- `install` 用 `targetOption = github | vscode | claude | all`
- `update` 則需要根據 manifest 內的 `targets: string[]` 重建 install plan

因此需要補一層新的 plan builder，例如：

- `buildInstallPlanForTargets({ bundleRoot, profile, targets })`

或將既有 `buildInstallPlan` 重構成：

- `resolveRequestedTargetsFromOption(targetOption)`
- `buildInstallPlanFromTargets({ bundleRoot, profile, requestedTargets })`
- `buildInstallPlan({ bundleRoot, profile, targetOption })` 僅保留為 `install` 的薄 wrapper

#### 2. `buildManifest` 目前預設 `localOverrides: []`

`update` 成功後需要保留仍適用的 `localOverrides`，因此建議讓 `buildManifest` 支援可選參數：

- `localOverrides`
- `installedAt`（可選；若不傳仍用現在時間）

例如：

```js
buildManifest({
  bundleRoot,
  profile,
  items,
  localOverrides: preservedOverrides
})
```

#### 3. target path 絕對路徑組裝邏輯目前散在 command 內

目前：

- `install.js` 有 `buildTargetAbsolutePath`
- `status.js` 直接 `path.join(...)`
- `update.js` 未來也會需要同樣邏輯

建議抽成共用 helper，例如：

- `lib/target-path.js`
- 或直接加到 `lib/bundle.js`

函式可簡化為：

```js
function toTargetAbsolutePath(targetRoot, targetPath) {}
```

## 建議調整的檔案

### 必改

- `lib/commands/update.js`
- `lib/cli.js`
- `lib/commands/help.js`
- `lib/bundle.js`
- `lib/manifest.js`

### 建議新增的小工具（可選）

- `lib/target-path.js`
- 或在 `lib/commands/update.js` 內先以私有 helper 開始，之後再抽出

## `update` 命令責任切分

`update` 建議拆成兩大階段：

1. `preflight`
   - 不寫檔
   - 只做 plan 計算與衝突判定
2. `apply`
   - 依 plan 實際寫入 / 刪除檔案
   - 重寫 manifest

這樣做的好處是：

- `--dry-run` 可以直接重用 `preflight` 結果
- `--json` 可以輸出完整 plan
- 未來測試時可以分開驗證「規劃對不對」和「執行對不對」

## 建議的 `update.js` 骨架

```js
async function runUpdate(argv) {
  const input = parseUpdateInput(argv);
  const context = await loadUpdateContext(input);
  const plan = await buildUpdatePlan(context);

  if (input.dryRun) {
    return printUpdatePlan(plan, input);
  }

  assertUpdatePlanCanApply(plan, input);
  const result = await applyUpdatePlan(plan, input);
  return printUpdateResult(result, input);
}
```

## 建議的輸入解析

### `UPDATE_ARG_SCHEMA`

```js
const UPDATE_ARG_SCHEMA = {
  aliases: {
    '-h': '--help'
  },
  options: {
    '--help': { name: 'help', type: 'boolean' },
    '--bundle-source': { name: 'bundleSource', type: 'string' },
    '--dry-run': { name: 'dryRun', type: 'boolean' },
    '--force': { name: 'force', type: 'boolean' },
    '--prune': { name: 'prune', type: 'boolean' },
    '--json': { name: 'json', type: 'boolean' }
  }
};
```

## 建議的資料流

### 1. `loadUpdateContext`

輸入：

- `targetRoot`
- `bundleSource`

輸出：

- `targetRoot`
- `bundleRoot`
- `manifest`
- `manifestPath`
- `currentManagedItemsByTargetPath`
- `nextInstallPlan`
- `nextInstallItemsByTargetPath`
- `overrideByTargetPath`

### 2. `buildUpdatePlan`

以 `targetPath` 為 key，比對：

- `manifest.managedItems`
- `nextInstallPlan.items`

並產生下列集合：

- `matched`
- `added`
- `removed`
- `drifted`
- `missing`
- `conflicts`
- `blockedByOverride`

### 3. `applyUpdatePlan`

依序處理：

1. 寫入 `matched` 中需要 refresh 的項目
2. 寫入 `added` 項目
3. 重建 `missing` 項目
4. 若 `--prune`，移除 `removed` 項目
5. 重建 manifest

## `buildUpdatePlan` 的詳細判定

### `matched`

條件：

- 舊 manifest 與新 plan 都存在同一個 `targetPath`

對每個 matched item 再判定目前 target repo 狀態：

- `upToDate`
- `drifted`
- `missing`
- `needsRefresh`

其中：

- `drifted`：target 檔案存在，但 checksum != manifest.checksum
- `missing`：target 檔案不存在
- `needsRefresh`：bundle source 的新 checksum != manifest.checksum，且 target 目前沒 drift

### `added`

條件：

- 新 plan 有
- 舊 manifest 沒有

再判定 target path：

- 不存在：可直接新增
- 已存在：視為 unmanaged collision，需 `--force`
- 若同路徑在 `localOverrides` 中為 `keep-local` / `user-owned`：也需 `--force`

### `removed`

條件：

- 舊 manifest 有
- 新 plan 沒有

v0 採保守策略：

- 預設只回報，不動它
- 只有 `--prune` 才真的刪 target 檔案並從 manifest 移除

## `localOverrides` 判定規則

### 應阻擋 update 的 reason

- `keep-local`
- `user-owned`

### 不應阻擋 update 的 reason

- `promoted`

原因：

- `promoted` 是「這個檔案曾被 promote 過」的審計紀錄
- 不是「從此脫離 bundle 管理」的宣告

## manifest 重建策略

`update` 成功後，建議直接以新 plan 產出的 items 重建整份 manifest，而不是只做局部 patch。

原因：

- `sourcePath` 可能改變
- `layer` 可能改變
- `checksum` 一定要刷新
- `bundle` metadata（例如 commit）也應更新
- 用完整重建比局部修 patch 更不容易留下不一致狀態

### 需要保留的欄位

- `profile`
- `targets`
- 仍適用的 `localOverrides`

### 需要刷新/重建的欄位

- `bundle`
- `installedAt`
- `managedItems`

## 建議的 plan 資料結構

```js
{
  targetRoot,
  bundleRoot,
  manifestPath,
  profile,
  targets,
  matched: [],
  added: [],
  removed: [],
  refresh: [],
  restore: [],
  prune: [],
  conflicts: [],
  blockedByOverride: [],
  summary: {
    updated: 0,
    added: 0,
    restored: 0,
    pruned: 0,
    conflicts: 0
  }
}
```

## CLI 輸出建議

### 一般文字輸出

```text
Profile: storage-manager-fe
Targets: github, vscode
Updated: 4
Added: 1
Restored: 1
Pruned: 0
Conflicts: 0
```

### `--dry-run`

應列出：

- 哪些檔案會更新
- 哪些檔案會新增
- 哪些檔案會重建
- 哪些檔案需要 `--prune`
- 哪些路徑目前被 drift / override / collision 阻擋

### `--json`

建議輸出完整 plan，這樣未來如果要接 CI 或更高階工具，不需要再 parse 人類文字輸出。

## exit code 建議

- 成功：`0`
- 使用者參數錯誤：`2`
- manifest / 狀態錯誤：`3`
- 衝突或需要人工介入：`4`

`update` 若因以下原因被 preflight 擋下，建議回 `4`：

- drifted managed items
- added item collision
- protected override
- removed items without `--prune`

## 第一階段建議實作順序

### Phase 1：先做可跑的核心路徑

- 支援 `matched` refresh
- 支援 `missing` restore
- 支援 `added` 新增
- 支援 `--dry-run`
- 支援 `--json`
- 先不做 `--prune` 實刪，只先偵測並擋下

### Phase 2：補齊保守移除

- 支援 `--prune`
- prune 後同步清理不再適用的 `localOverrides`

### Phase 3：整理共用 helper

- 抽 target absolute path helper
- 若 `install` / `update` 的 plan builder 開始共用更多邏輯，再把 command 內私有 helper 往共用模組抽

## 建議測試案例

1. **正常 refresh**
   - bundle source 內容更新
   - target repo 無 drift
   - `update` 成功

2. **drift conflict**
   - target repo 先手動修改 managed file
   - 未加 `--force` 應中止

3. **missing restore**
   - 手動刪除 managed file
   - `update` 應重建它

4. **added item**
   - bundle source 新增同 profile / targets 的檔案
   - `update` 應補裝

5. **removed item without prune**
   - bundle source 刪除舊 managed file
   - `update` 未加 `--prune` 應擋下

6. **removed item with prune**
   - 加 `--prune`
   - target 檔案與 manifest 記錄應被移除

7. **source relocation**
   - 同一 `targetPath` 的來源由 `profile/...` 移到 `shared/...`
   - `update` 後 manifest 的 `sourcePath` / `layer` 應更新

## 結論

`update` v0 的關鍵不在「把檔案複製過去」而已，而在於：

- 用 `targetPath` 做穩定對位
- 用 preflight 保護 target repo
- 用完整 manifest 重建維持狀態一致性

若照這份設計走，下一步實作 `lib/commands/update.js` 時，應能以最小風險把 `update` 接進既有 `install / status / promote` 生命週期。