# Shared Assets

這一層是所有 target repo 預設都會安裝的共用基底。

## 目前內容

- `shared/.github/copilot-instructions.md`
- `shared/.github/skills/git/conventional-commits/`
- `shared/.github/skills/workflow/save-conversation-history/`
- `shared/.vscode/mcp.json`

## 原則

- 只放跨專案都成立的基底規則與可重用 workflow。
- 不要把單一 repo 或單一專案家族的規則直接塞進 `shared/`。
- 如果某份規則只對部分專案成立，請改放對應的 `profiles/<name>/`。
