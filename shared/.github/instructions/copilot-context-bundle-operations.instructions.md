---
description: "Use when the user asks to operate copilot-context-bundle locally, especially for install/status/update/promote workflows, sandbox setup, path troubleshooting, or Windows PowerShell command guidance."
name: "Copilot Bundle Operations"
---

# Copilot Context Bundle 操作指南

這份檔案是 `copilot-context-bundle` 的共用操作手冊，目的是讓人在本機操作 bundle 時，有一套一致的判斷與步驟可遵循。

## 何時使用這份指南

當需求屬於以下任一類型時，優先參考這份指南：

- 在本機或 sandbox repo 測試 `install`、`status`、`update`、`promote`
- 協助使用者判斷目前應該用哪一個命令
- 釐清 bundle source、target repo、目前工作目錄三者之間的路徑關係
- 解釋 `--bundle-source`、`--file`、`--force`、`--prune` 等參數該怎麼用
- Windows PowerShell 環境下的 `npm.ps1` / execution policy / 路徑問題排查

## 先釐清三個位置

操作前先把這三個位置講清楚：

1. **bundle source repo**
   - 也就是 `copilot-context-bundle` 本身
   - 例如：`D:\QNAP\copilot-context-bundle`
2. **target repo / target folder**
   - 要被安裝、檢查、更新、回流的目標資料夾
   - 例如：`D:\QNAP\sandbox`
3. **目前工作目錄（cwd）**
   - 只影響相對路徑怎麼解析
   - 不等於實際安裝目標

重點：

- `install <targetPath>` 真正決定寫到哪裡
- `update <targetPath>`、`status <targetPath>`、`promote <targetPath>` 也都以 `<targetPath>` 為主
- 使用者「站在哪個資料夾」執行，只是影響相對路徑，不是命令的真正操作目標

## Windows PowerShell 的推薦執行方式

在 Windows PowerShell 中，優先使用：

```text
node "D:\QNAP\copilot-context-bundle\bin\copilot-bundle.js" <command> ...
```

原因：

- 可以避開 `npm.ps1 cannot be loaded because running scripts is disabled` 這類 execution policy 問題
- 使用者就算不在 bundle repo 根目錄，也能直接執行

若要保留 npm 體驗，可退而求其次使用：

```text
npm.cmd --prefix "D:\QNAP\copilot-context-bundle" run cli -- <command> ...
```

## 命令選擇速查表

| 情境 | 應使用的命令 | 說明 |
|---|---|---|
| 第一次把 bundle 套到 target repo | `install` | 建立 managed files 與 `.copilot-bundle/manifest.json` |
| 想看 target repo 目前狀態 | `status` | 查看 `ok / modified / missing` |
| bundle source 改了，想同步到 target repo | `update` | source → target |
| target repo 改了，想回寫回 bundle source | `promote` | target → source |
| 不確定動作會寫到哪裡 | `--dry-run` | 先看計畫，不先落地 |

## 標準操作順序

### 1. install

在 target repo 尚未安裝過 bundle 時使用。

範例：

```text
node "D:\QNAP\copilot-context-bundle\bin\copilot-bundle.js" install "D:\QNAP\sandbox" --profile storage-manager-fe --bundle-source "D:\QNAP\copilot-context-bundle"
```

操作前檢查：

- 若 target repo 已有 `.copilot-bundle/manifest.json`，不要直接再跑 `install`
- 先判斷應該改用：
  - `status`（只是想看狀態）
  - `update`（想同步最新 source）
  - `install --force`（真的要重裝覆蓋）

### 2. status

用來確認 target repo 目前是否乾淨。

範例：

```text
node "D:\QNAP\copilot-context-bundle\bin\copilot-bundle.js" status "D:\QNAP\sandbox"
```

優先用於：

- install 之後確認是否成功
- promote / update 之前先看是否已有 drift
- promote / update 之後驗證是否回到 `Modified: 0` / `Missing: 0`

### 3. update

當 bundle source 已變更，想把變更同步到 target repo 時使用。

先 dry-run：

```text
node "D:\QNAP\copilot-context-bundle\bin\copilot-bundle.js" update "D:\QNAP\sandbox" --bundle-source "D:\QNAP\copilot-context-bundle" --dry-run
```

正式執行：

```text
node "D:\QNAP\copilot-context-bundle\bin\copilot-bundle.js" update "D:\QNAP\sandbox" --bundle-source "D:\QNAP\copilot-context-bundle"
```

使用原則：

- 若 target repo 已有 drift，預設會被擋下
- 若使用者確認要覆蓋 drifted managed item，再加 `--force`
- 若 bundle source 已移除某個 managed item，且使用者確認要刪 target 檔案，再加 `--prune`

### 4. promote

當 target repo 裡的檔案被修改，而且這份修改應該升格回 bundle source 時使用。

範例：

```text
node "D:\QNAP\copilot-context-bundle\bin\copilot-bundle.js" promote "D:\QNAP\sandbox" --file .github/instructions/storage-manager-fe.instructions.md --bundle-source "D:\QNAP\copilot-context-bundle" --force
```

重點：

- `--file` 是 **target repo 內的相對路徑**
- 建議一律用 `/`，例如：`.github/instructions/storage-manager-fe.instructions.md`
- 若 promote 目的地檔案已存在，通常需要 `--force`

#### 什麼時候要加 `--to`

- 如果檔案原本就是 managed item，且要回寫回原來源，通常不必加 `--to`
- 如果要把檔案搬到另一層，例如：
  - `--to shared`
  - `--to profile:storage-manager-fe`
  才需要明確指定
- 如果檔案原本不是 managed item，則必須加 `--to`

## Promote 後的預期結果

若 promote 的是 managed item：

- bundle source 檔案會被更新
- target repo manifest 內對應 item 的 `checksum` 會更新
- 若來源位置改變，`sourcePath` / `layer` 也會同步更新
- 之後再跑 `status`，通常應回到 `Modified: 0`

若 promote 的是 local-only 檔案：

- bundle source 會新增對應檔案
- target repo 會留下 `localOverrides.reason = promoted`
- v0 不會自動把它加入目前 target repo 的 `managedItems`

## 常見錯誤判讀

### `Manifest already exists ... Re-run with --force`

意思：

- target repo 已經 install 過
- 不應直接再跑第二次 `install`

正確做法：

- 只是想看狀態 → `status`
- 想同步最新 source → `update`
- 真的要重裝 → `install --force`

### `Manifest not found`

意思：

- target repo 尚未安裝過 bundle

正確做法：

- 先跑 `install`

### `Target file does not exist`

意思：

- `promote --file <path>` 指到一個不存在於 target repo 的檔案

正確做法：

- 確認 `--file` 是 target repo 內的相對路徑，而不是 source path

### `npm.ps1 cannot be loaded because running scripts is disabled`

意思：

- PowerShell execution policy 擋住了 `npm.ps1`

正確做法：

- 優先改用 `node <bundleRoot>\bin\copilot-bundle.js ...`
- 或使用 `npm.cmd --prefix ... run cli -- ...`

## 回報與收尾建議

完成操作後，建議依序檢查：

1. `status` 是否回到預期狀態
2. bundle source repo 的 `git status --short`
3. 若這次操作改到了 bundle source，是否需要：
   - review diff
   - commit
   - push
4. 若這次是對 target repo 做驗證，是否需要再跑一次 `update --dry-run` 或 `promote --dry-run` 確認下一步

## 建議的回覆方式

當協助使用者操作時，回覆中盡量包含：

- 目前判斷的 **bundle source 路徑**
- 目前判斷的 **target repo 路徑**
- 為什麼這次該用的是 `install` / `status` / `update` / `promote`
- 若有風險，先提醒是否建議用 `--dry-run`
- 命令執行後應觀察哪個結果（例如 manifest、`Modified: 0`、bundle source diff）

## 更好的下一步（可選）

如果後續要再強化這份指南，建議：

- 再補一份人類導向的 `shared/docs/` runbook，專門放 step-by-step 圖文範例
- 另加一份 `scripts/playground.ps1`，把本機 sandbox 的 install → status → update → promote 變成半自動操作
- 若未來有 CI，可把 `npm test` 與這份指南一起納入 README 的 quick start
