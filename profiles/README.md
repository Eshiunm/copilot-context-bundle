# Profiles

每個資料夾代表一個可注入 target repo 的 profile。

## 原則

- `profiles/<name>/` 只放該 profile 需要的客製化資產。
- 專案客製化 instructions 優先放在 `profiles/<name>/.github/instructions/*.instructions.md`。
- `local` override 不放在這裡；它們應由 target repo 自己維護。

## 目前骨架

- `profiles/storage-manager-fe/`
- `profiles/nasx86/`
- `profiles/core/`

後續若 profile 需要自己的 skills、hooks 或 `.vscode/` 設定，也應放在各自的 profile 目錄下。
