# 2026-04-13 Instructions Layering Choice

## 類別
- topic: session-summary
- status: done

## 背景
- 使用者延續 bundle 三層模型的討論，進一步追問 `source of truth`、`profile` 的概念，以及 `copilot-instructions.md` 是否應放在 `shared`、`profile` 或 `local`。
- 在確認 `copilot-instructions.md` 適合作為 shared 基底後，使用者進一步思考要如何替各專案提供客製化 instructions。

## 已定案
- 專案客製化 instructions 的主要方向，採用「方案 2：用 `.instructions.md`，但必要時讓它很容易被套用」。
- `copilot-instructions.md` 仍偏向 shared 基底規則，負責所有 repo 都適用的共通行為與協作原則。
- 專案或 profile 客製化內容，優先由 profile 提供正式的 `.github/instructions/*.instructions.md` 檔案，而不是把 `copilot-instructions.md` 當成 include / import 其他 instructions 的主機制。
- 若需要提高專案客製化 instructions 的命中率，應優先透過 `.instructions.md` 的 `description` 與必要時的 `applyTo` 來設計，而不是在 shared instructions 內硬編排讀檔流程。

## 待確認
- profile 層 `.instructions.md` 的命名慣例要如何設計，例如依專案名稱、技術棧，或依 concern 拆檔。
- 哪些專案規則應視為 always-on 的 shared 基底，哪些應下放到 profile 的 instruction 檔。
- 若某份 profile instruction 幾乎對該 repo 所有工作都成立，應使用較廣的 `applyTo`，還是改由 profile 擁有自己的 `copilot-instructions.md`。

## 下一步
- 實際盤點目前 `.github/copilot-instructions.md` 的內容，區分哪些屬於 shared 基底、哪些更適合拆到 profile `.instructions.md`。
- 為 profile instructions 擬定命名與描述規範，確認如何在不浪費 context 的前提下提高套用率。
- 將這套分層選擇納入後續 manifest 與安裝流程設計。

## 參考
- `.copilot-history/topics/workspace-positioning.md`
- `.github/copilot-instructions.md`
- `.github/instructions/`
- `.copilot-history/INDEX.md`
