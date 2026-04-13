# 2026-04-13 Manifest CLI v0 and Promote Plan

## 類別
- topic: session-summary
- status: done

## 背景
- 使用者延續 bundle 注入與回流設計，進一步詢問 `npx`、npm CLI package、manifest 在生命週期中的角色，以及如果未來改走 npm CLI package，是否仍能支援回流。
- 之後實際落地了 manifest v0 schema、CLI 命令規格 v0 與 npm CLI package 最小骨架，並完成本機 smoke test。

## 已定案
- 設計順序採「先 manifest，後 CLI package」，因為 manifest 是 install / status / promote 的共同狀態契約。
- manifest v0 預設位置為 `.copilot-bundle/manifest.json`，並以 `managedItems` 的 sourcePath / targetPath / checksum 作為核心欄位。
- CLI v0 命令以 `copilot-bundle install / status / promote` 為主，不急著在第一版加入 `update` 或 publish 能力。
- npm CLI package 最小骨架已建立並推到遠端，現在具備本機可跑的 CLI entry 與核心命令雛形。
- 下一步優先不是 registry 發佈，而是先做 `promote` 的 end-to-end 實測，驗證回流是否真正走得通。

## 待確認
- `promote` 完成後，target repo manifest 是否需要同步更新 checksum，還是只標記 `localOverrides` 即可。
- 若 promote 行為合理，是否接著補 `npm link` 體驗與 GitLab Package Registry 發佈流程。

## 下一步
- 建立 sandbox repo 與 bundle source 測試副本。
- 跑 `install`、手動修改 managed file、再執行 `status` 與 `promote`。
- 依 promote 測試結果決定 CLI v0 是否要修正。

## 參考
- `.copilot-history/topics/bundle-cli-and-manifest.md`
- `docs/manifest-v0.md`
- `docs/cli-package-v0.md`
- `package.json`
