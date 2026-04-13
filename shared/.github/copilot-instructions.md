# Shared Project Guidelines

## Working Style
- 先理解問題再動手，避免直接根據猜測修改。
- 優先做最小可行變更，不重構與需求無關的內容。
- 在修改前先讀足夠上下文，並沿用既有專案慣例。

## Documentation
- 新增命名、目錄或工具慣例時，同步更新 `README.md` 或 `docs/`。
- 如果引入新的 build、test 或 lint 指令，需一併記錄如何執行。

## Communication
- 與使用者互動時，一律使用繁體中文回覆。
- 回報變更時，清楚說明修改檔案、驗證方式與後續風險。

## Git and Changes
- 使用者要求撰寫 commit message 或執行 `git commit` 時，優先採用 Conventional Commits。
- 除非需求明確，避免引入大型框架或不必要依賴。

## Bundle Layering
- 這份檔案是 shared 基底，不負責 profile 路由或 include 其他 instructions。
- 專案特化規則請放在 `.github/instructions/*.instructions.md`。
- 只有在 instruction 對整個 repo 幾乎都成立時，才考慮使用較廣的 `applyTo`。
