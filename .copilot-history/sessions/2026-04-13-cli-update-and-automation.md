# 2026-04-13 CLI Update and Automation

## 類別
- topic: session-summary
- status: done

## 背景
- 在 `update` v0 第一版與 README 命令矩陣完成後，使用者要求進一步建立 CLI 的自動化測試，確保 `install`、`status`、`update`、`promote` 能夠穩定執行。
- 同時也要求把這次討論的成果精簡保存到 `.copilot-history/`，並一併提交版控。

## 已定案
- CLI 自動化測試採用 Node 內建 `node:test`，避免額外引入第三方測試框架。
- 已新增 `npm test` 腳本與 `test/cli-commands.test.js`，測試涵蓋：
  - `help` / `version`
  - `install` + `status`
  - `update` 的 refresh / add / restore / drift / `--force` / `--prune` / relocation
  - `promote` 的 baseline reset 與 managed file relocate
- `npm test` 已在本機成功執行，7 個測試全數通過。
- README 已同步更新，加入「指令 / 參數 / 完成度 / 是否測過」對照表，以及 `npm test` 的使用說明。

## 待確認
- 是否要把目前的 `npm test` 接進 CI workflow，作為未來提交或 PR 的固定驗證。
- 測試規模變大後，是否要把單一測試檔拆分成多個命令或情境導向的測試檔。
- 下一個優先命令應該是 `doctor`、`uninstall`，還是先處理 registry / `npx` 發佈流程。

## 下一步
- 先決定是否把自動化測試接進 CI / pre-push 驗證。
- 再依優先順序選下一個 CLI 能力：`doctor` 或 `uninstall`。
- 若功能暫時不再擴張，可先補更多 README / quick start / end-to-end 使用範例。

## 參考
- `.copilot-history/topics/bundle-cli-and-manifest.md`
- `package.json`
- `README.md`
- `test/cli-commands.test.js`
- `lib/commands/update.js`
- `lib/commands/promote.js`
