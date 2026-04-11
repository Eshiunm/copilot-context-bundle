---
name: skill-creator
description: 建立新 skills、修改與優化既有 skills，並衡量 skill 效能。當使用者想從零建立 skill、編輯或優化既有 skill、執行 evals 測試 skill、用 variance analysis 做 benchmark，或優化 skill 的 description 以提升觸發準確度時使用。
---

# Skill Creator

這是一個用來建立新 skill，並反覆迭代改善 skill 的技能。

高層次來看，建立一個 skill 的流程如下：

- 決定你希望這個 skill 做什麼，以及大致要怎麼做
- 先寫出 skill 草稿
- 建立幾個測試 prompts，並用能存取該 skill 的 Claude 去執行
- 協助使用者同時從定性與定量角度評估結果
  - 當執行在背景進行時，如果目前還沒有定量 evals，就先草擬一些；如果已經有了，你也可以沿用或依需求修改。之後把這些 evals 解釋給使用者聽；如果原本就存在，也要說明那些既有 evals 在檢查什麼
  - 使用 `eval-viewer/generate_review.py` 腳本把結果展示給使用者，讓他們查看輸出，也查看定量指標
- 根據使用者對結果的評估回饋重寫 skill；如果定量 benchmark 暴露出明顯缺陷，也一併修正
- 重複上述流程，直到你滿意為止
- 擴大測試集，再用更大規模重跑一次

當你使用這個 skill 時，你的工作是先判斷使用者目前處在哪個階段，然後直接介入幫他往下一步推進。比方說，使用者可能會說「我想做一個給 X 用的 skill」。你可以幫他收斂需求、寫草稿、寫測試案例、釐清他想怎麼評估、把 prompts 都跑完，然後持續迭代。

另一方面，使用者也可能已經有一份 skill 草稿。這種情況下，你就可以直接進入 eval 與 iterate 的流程。

當然，請始終保持彈性。如果使用者說「我不需要跑一堆評估，先跟我一起想就好」，你也可以照那種方式進行。

接著，等 skill 完成之後，或其實在任何合適時機，你也可以執行 skill description improver。我們另外有一支獨立腳本專門做這件事，用來優化 skill 的觸發效果。

了解？很好。

## 與使用者溝通

使用 skill creator 的人，對程式術語的熟悉程度可能差很多。最近確實有一種趨勢：Claude 的能力正在讓原本不碰程式的人也開始打開終端機，讓父母長輩開始搜尋「怎麼安裝 npm」。當然，另一方面，多數使用者仍然相當具備電腦使用能力。

所以請留意上下文訊號，調整你的說法，讓溝通方式符合對方程度。預設情況下，給你一個大致感覺：

- `evaluation` 和 `benchmark` 這類詞算是邊界情況，但通常可以接受
- 像 `JSON` 和 `assertion` 這種詞，除非你有很明確的跡象知道使用者懂，不然不要直接丟出來而不解釋

如果你不確定，簡短解釋一下術語是可以的；若你拿不準對方懂不懂，也可以補一句很短的定義。

---

## 建立 skill

### 釐清意圖

先理解使用者真正想做什麼。目前的對話裡可能已經包含某個他想封裝成 skill 的工作流程，例如他說「把這段做成一個 skill」。如果是這樣，先從對話歷史萃取答案，包括：使用過哪些工具、步驟順序、使用者曾修正過什麼、觀察到哪些輸入與輸出格式。使用者可能還需要補齊一些空白，並且在進入下一步前應先確認。

1. 這個 skill 應該讓 Claude 能做到什麼？
2. 這個 skill 應該在什麼情境下觸發？也就是使用者會怎麼說、什麼上下文會需要它？
3. 預期輸出格式是什麼？
4. 是否要建立測試案例來驗證這個 skill？如果技能的輸出可以客觀驗證，例如檔案轉換、資料擷取、程式碼產生、固定流程步驟，測試案例通常很有幫助。若輸出偏主觀，例如寫作風格或藝術內容，通常就不一定需要。你可以依 skill 類型提出預設建議，但最後讓使用者決定。

### 訪談與研究

主動詢問邊界情況、輸入與輸出格式、範例檔案、成功標準，以及相依需求。在這些部分尚未釐清之前，先不要急著寫測試 prompts。

檢查有哪些可用的 MCP。若研究會有幫助，例如搜尋文件、找相似 skill、查詢最佳實務，且有 subagent 可用，就平行做研究；否則就直接在當前流程中完成。你應該帶著足夠背景資訊來，減少使用者要自己補充的負擔。

### 撰寫 SKILL.md

根據與使用者訪談的結果，補齊以下幾個部分：

- **name**：skill 的識別名稱
- **description**：說明何時觸發、它能做什麼。這是主要的觸發機制，必須同時包含 skill 的用途，以及它該在什麼具體情境下使用。所有「何時使用」的資訊都應放在這裡，而不是正文中。注意：目前 Claude 有偏向「低觸發」skill 的傾向，也就是明明用得上卻沒有調用。為了抵消這點，請把 skill description 寫得稍微主動一點。例如，與其寫「How to build a simple fast dashboard to display internal Anthropic data.」，不如寫成「How to build a simple fast dashboard to display internal Anthropic data. Make sure to use this skill whenever the user mentions dashboards, data visualization, internal metrics, or wants to display any kind of company data, even if they don't explicitly ask for a 'dashboard.'」
- **compatibility**：所需工具與相依條件（可選，且通常不常需要）
- **the rest of the skill :)**：skill 其餘內容

### Skill 撰寫指南

#### Skill 的結構

```text
skill-name/
├── SKILL.md (必填)
│   ├── YAML frontmatter（name、description 必填）
│   └── Markdown instructions
└── Bundled Resources（選填）
    ├── scripts/    - 可執行程式碼，用來處理可重複、可決定性的任務
    ├── references/ - 需要時才讀入上下文的文件
    └── assets/     - 輸出會用到的檔案（例如 templates、icons、fonts）
```

#### 漸進式揭露

Skills 使用三層式載入系統：
1. **Metadata**（name + description）- 永遠都在 context 中，約 100 字
2. **SKILL.md body** - 只要 skill 被觸發就會進入 context，理想上小於 500 行
3. **Bundled resources** - 需要時才讀取，沒有明確上限，而且 scripts 可以不先載入內容就直接執行

這些字數與行數只是大致參考；如果真的有需要，可以更長。

**關鍵模式：**
- 讓 SKILL.md 保持在 500 行以下；如果快接近上限，就新增一層階層結構，並清楚指出使用該 skill 的模型下一步該去讀哪裡
- 在 SKILL.md 中明確引用其他檔案，並說明什麼時候應該去讀它們
- 對於大型 reference files（大於 300 行），請加上目錄

**領域組織方式**：如果一個 skill 支援多個領域或框架，請依變體來組織：

```text
cloud-deploy/
├── SKILL.md (workflow + selection)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

Claude 只會去讀相關的 reference file。

#### 不讓人意外的原則

這點其實不言自明，但 skill 內容絕對不能包含惡意程式、漏洞利用程式碼，或任何可能危害系統安全的內容。如果 skill 的描述已經說明了用途，那它的實際內容就不應該做出令使用者意外的事。不要配合建立具有誤導性、協助未授權存取、資料外洩，或其他惡意行為的 skill。像是「roleplay as an XYZ」這類內容則是可以的。

#### 撰寫模式

在 instructions 中，優先使用祈使句。

**定義輸出格式**：你可以像下面這樣寫：

```markdown
## 報告結構
務必使用這個精確模板：
# [Title]
## Executive summary
## Key findings
## Recommendations
```

**Examples 模式**：加入範例通常很有幫助。你可以像這樣排版：

```markdown
## Commit message format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

### 撰寫風格

盡量向模型解釋事情為什麼重要，而不是塞滿生硬的 MUST。請運用對使用者與模型意圖的理解，讓這個 skill 盡量保持通用，而不是只適用於少數特定範例。先寫草稿，然後隔一點距離再回頭看一次，把它修得更好。

### 測試案例

寫完 skill 草稿後，想出 2 到 3 個真實感足夠的測試 prompts，也就是使用者真的可能會這樣說的那種。把它們分享給使用者，例如你可以說：「我想先試幾個測試案例。這些看起來對嗎？還是你想再加一些？」接著就去執行它們。

把測試案例存進 `evals/evals.json`。先不要寫 assertions，只放 prompts。你會在下一步、也就是執行進行中的時候，再草擬 assertions。

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "files": []
    }
  ]
}
```

完整 schema 請參考 `references/schemas.md`，其中也包含你稍後會加入的 `assertions` 欄位。

## 執行與評估測試案例

這一節是一個連續流程，中途不要停下來。不要使用 `/skill-test` 或任何其他測試 skill。

把結果放在 `<skill-name>-workspace/`，位置與 skill 目錄同層。workspace 內部再依 iteration 組織，例如 `iteration-1/`、`iteration-2/`；在每個 iteration 裡，每個測試案例各自有一個目錄，例如 `eval-0/`、`eval-1/`。不要一開始就把全部目錄都建好，邊做邊建就可以。

### 第 1 步：同一輪內啟動所有 runs（with-skill 與 baseline 都要）

對每個測試案例，在同一輪內啟動兩個 subagents，一個有 skill，一個沒有。這點很重要：不要先把 with-skill 的 runs 跑完，再回頭補 baseline。要一次全部發出去，讓它們大致同時完成。

**With-skill run：**

```text
Execute this task:
- Skill path: <path-to-skill>
- Task: <eval prompt>
- Input files: <eval files if any, or "none">
- Save outputs to: <workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/
- Outputs to save: <what the user cares about — e.g., "the .docx file", "the final CSV">
```

**Baseline run**（同一個 prompt，但 baseline 會依情境不同）：
- **Creating a new skill**：完全不用 skill。同一個 prompt、不提供 skill path，輸出存到 `without_skill/outputs/`。
- **Improving an existing skill**：使用舊版本 skill。在編輯前先備份 skill（`cp -r <skill-path> <workspace>/skill-snapshot/`），然後讓 baseline subagent 指向這個 snapshot。輸出存到 `old_skill/outputs/`。

為每個測試案例寫一份 `eval_metadata.json`，此時 assertions 可以先留空。每個 eval 都要用描述性名稱，指出它在測什麼，而不只是 `eval-0`。目錄名稱也要用這個描述性名稱。如果這一輪 iteration 使用了新的或修改過的 eval prompts，就要為每個新的 eval 目錄建立這些檔案，不要假設前一輪的會自動沿用。

```json
{
  "eval_id": 0,
  "eval_name": "descriptive-name-here",
  "prompt": "The user's task prompt",
  "assertions": []
}
```

### 第 2 步：在 runs 進行時，草擬 assertions

不要只是等著 runs 結束，你可以利用這段時間做更有價值的事。為每個測試案例草擬可量化的 assertions，並把它們解釋給使用者聽。如果 `evals/evals.json` 已經有 assertions，就先檢查並說明它們各自在驗證什麼。

好的 assertions 應該是可客觀驗證、而且名稱清楚易懂的。它們在 benchmark viewer 中應該讓人一眼就知道在檢查什麼。對於主觀型 skill，例如寫作風格或設計品質，更適合做定性評估，不要勉強把本來需要人工判斷的東西硬塞進 assertions。

草擬完成後，更新 `eval_metadata.json` 與 `evals/evals.json`。同時也向使用者解釋 viewer 裡會看到什麼，包括定性輸出與定量 benchmark。

### 第 3 步：當 runs 完成時，立即記錄 timing data

每個 subagent 任務完成時，你會收到包含 `total_tokens` 和 `duration_ms` 的通知。要立刻把這些資料存到該 run 目錄下的 `timing.json`：

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3
}
```

這是唯一能取得這些資料的時機，因為它們只會出現在任務完成通知裡，不會另外被持久保存。收到通知時就立刻處理，不要想等全部完成後再一起補。

### 第 4 步：評分、彙整，並啟動 viewer

當所有 runs 都結束後：

1. **Grade each run**：啟動 grader subagent（或直接在主流程評分），讓它讀取 `agents/grader.md`，並根據輸出評估每一條 assertion。把結果存進每個 run 目錄下的 `grading.json`。`grading.json` 的 expectations array 必須使用 `text`、`passed`、`evidence` 這幾個欄位，不能用 `name`、`met`、`details` 或其他變體，因為 viewer 依賴這些精確欄位名稱。對於可以程式化檢查的 assertions，請寫腳本去檢查，而不是人工目測，因為腳本更快、更穩定，也能在之後重複使用。

2. **Aggregate into benchmark**：從 skill-creator 目錄執行彙整腳本：

   ```bash
   python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
   ```

   這會產生 `benchmark.json` 與 `benchmark.md`，內容包含每個配置的 pass_rate、時間與 token 數，以及平均值 ± 標準差和 delta。如果你要手動產生 `benchmark.json`，請參考 `references/schemas.md` 中 viewer 所要求的精確 schema。
   每一組 with_skill 版本都要排在對應 baseline 前面。

3. **Do an analyst pass**：讀取 benchmark data，找出彙總統計容易掩蓋的模式。可參考 `agents/analyzer.md` 中的 "Analyzing Benchmark Results" 段落，像是：某些 assertions 無論 skill 有沒有用都會通過，代表它們不具區辨性；某些 evals 方差過大，可能有 flaky 問題；或時間與 token 使用上的取捨。

4. **Launch the viewer**：帶著定性輸出與定量資料一起啟動 viewer：

   ```bash
   nohup python <skill-creator-path>/eval-viewer/generate_review.py \
     <workspace>/iteration-N \
     --skill-name "my-skill" \
     --benchmark <workspace>/iteration-N/benchmark.json \
     > /dev/null 2>&1 &
   VIEWER_PID=$!
   ```

   如果是第 2 輪以上，還要加上 `--previous-workspace <workspace>/iteration-<N-1>`。

   **Cowork / headless environments：** 如果 `webbrowser.open()` 不可用，或環境沒有顯示介面，請使用 `--static <output_path>` 產出獨立 HTML，而不是啟動伺服器。當使用者按下 `Submit All Reviews` 時，feedback 會下載成 `feedback.json`。下載後，把它複製到 workspace 目錄中，供下一輪 iteration 使用。

注意：請使用 `generate_review.py` 來建立 viewer，不需要自己手寫 HTML。

5. **Tell the user**：對使用者說類似這樣的話：「我已經在你的瀏覽器打開結果了。裡面有兩個分頁，`Outputs` 可以逐一查看每個測試案例並留下回饋，`Benchmark` 則顯示定量比較結果。你看完後再回來告訴我。」

### 使用者在 viewer 裡會看到什麼

`Outputs` 分頁一次顯示一個測試案例：
- **Prompt**：當時給的任務
- **Output**：skill 產出的檔案，若可行會直接內嵌顯示
- **Previous Output**（第 2 輪以上）：摺疊區塊，顯示上一輪輸出
- **Formal Grades**（如果有跑 grading）：摺疊區塊，顯示 assertion 的通過與否
- **Feedback**：會自動儲存的文字輸入框
- **Previous Feedback**（第 2 輪以上）：顯示上一次使用者留下的回饋

`Benchmark` 分頁則顯示統計摘要：每個配置的 pass rate、時間、token 使用量，以及逐個 eval 的拆解與 analyst observations。

導航方式是上一個／下一個按鈕，或方向鍵。完成後，使用者會按下 `Submit All Reviews`，所有回饋會儲存成 `feedback.json`。

### 第 5 步：讀取 feedback

當使用者告訴你他看完了，就讀取 `feedback.json`：

```json
{
  "reviews": [
    {"run_id": "eval-0-with_skill", "feedback": "the chart is missing axis labels", "timestamp": "..."},
    {"run_id": "eval-1-with_skill", "feedback": "", "timestamp": "..."},
    {"run_id": "eval-2-with_skill", "feedback": "perfect, love this", "timestamp": "..."}
  ],
  "status": "complete"
}
```

空白 feedback 代表使用者覺得沒問題。你應該把改善重點放在那些有具體抱怨的測試案例上。

用完 viewer 後，記得把它關掉：

```bash
kill $VIEWER_PID 2>/dev/null
```

---

## 改善 skill

這是整個迴圈的核心。你已經跑完測試案例、使用者也看完結果，接下來你要根據他們的回饋讓 skill 變得更好。

### 如何思考改善方向

1. **從回饋中做一般化。** 這裡真正的大局是：我們想做出能被使用很多很多次的 skills。你和使用者之所以反覆用少數幾個例子迭代，是因為這樣比較快；使用者對那些例子很熟，也能很快判斷新輸出好不好。但如果你和使用者共同開發的 skill 只對那幾個例子有效，它其實是沒用的。與其加一些過度擬合的細碎規則，或塞進一大堆壓迫式的 MUST，不如在遇到頑固問題時，試著換比喻、換工作模式建議、換思考框架。這樣的嘗試成本其實不高，而且有機會得到很好的結果。

2. **讓 prompt 保持精簡。** 刪掉那些沒有實際貢獻的內容。記得要讀 transcripts，而不只是看最後輸出；如果看起來這個 skill 正在讓模型花很多時間做無效工作，你可以試著移除造成這些浪費的段落，再看看結果。

3. **解釋背後原因。** 盡可能解釋你要求模型做每件事背後的 `why`。現在的 LLM 很聰明，也有不錯的 theory of mind。只要你提供好的框架，它們能超越死板指令，真的把事情做好。即使使用者的回饋很短、很煩躁，你也要試著真正理解他在做什麼、為什麼這樣寫、以及他實際上寫了什麼，然後把這種理解轉譯進 instructions。如果你發現自己一直寫全大寫的 ALWAYS 或 NEVER，或寫出非常僵硬的結構，那通常是個黃旗。若有可能，請換個方式，把原因講清楚，讓模型理解為什麼這件事重要。

4. **找出不同測試案例之間重複出現的工作。** 讀取測試 runs 的 transcripts，注意 subagents 是否各自獨立寫出類似的 helper scripts，或反覆採取同樣的多步驟做法。如果 3 個測試案例裡，subagent 都各自寫了一份 `create_docx.py` 或 `build_chart.py`，那就是非常明確的訊號，代表這個 skill 應該把那支 script 內建進去。寫一次，放到 `scripts/`，然後告訴 skill 去用它。這能避免未來每次執行都重複造輪子。

這項工作其實非常重要，你的思考時間不是瓶頸，所以請慢慢想清楚。建議你先寫一份修訂草稿，隔一下再回頭看，用新的眼光再改一輪。務必要盡力進入使用者的腦中，理解他真正想要什麼。

### 迭代循環

改善 skill 之後：

1. 把改善套用到 skill 上
2. 將所有測試案例重新跑到新的 `iteration-<N+1>/` 目錄中，包含 baseline runs。如果你是在建立新 skill，baseline 永遠都是 `without_skill`（完全不使用 skill），這在各輪之間都不變。如果你是在改善既有 skill，請自行判斷哪個 baseline 最合理：使用者一開始帶進來的原始版本，或上一輪迭代版本。
3. 啟動 reviewer，並讓 `--previous-workspace` 指向前一輪 iteration
4. 等待使用者完成檢視並告訴你他看完了
5. 讀取新的 feedback，再改善一次，然後重複

持續進行，直到：
- 使用者說他滿意了
- feedback 全部都是空白（代表一切都很好）
- 你已經沒有實質進展

---

## 進階：Blind comparison

如果你想更嚴謹地比較 skill 的兩個版本，例如使用者問「新版本真的比較好嗎？」，可以使用 blind comparison 系統。詳細做法請閱讀 `agents/comparator.md` 與 `agents/analyzer.md`。基本概念是：把兩個輸出交給一個獨立 agent，且不告訴它哪個是哪個，讓它自己判斷品質，之後再分析為什麼贏家會贏。

這是可選功能，需要 subagents，多數使用者不會用到。一般來說，人類 review 迴圈通常就已經足夠。

---

## Description Optimization

SKILL.md frontmatter 中的 description 欄位，是決定 Claude 是否會調用某個 skill 的主要機制。建立或改善 skill 之後，應主動提供是否要優化 description，以提升觸發準確度。

### 第 1 步：產生 trigger eval queries

建立 20 個 eval queries，混合 should-trigger 與 should-not-trigger，並存成 JSON：

```json
[
  {"query": "the user prompt", "should_trigger": true},
  {"query": "another prompt", "should_trigger": false}
]
```

queries 必須足夠真實，看起來像 Claude Code 或 Claude.ai 的使用者真的會輸入的內容。不要寫抽象請求，而要寫具體、細節明確的請求，例如檔案路徑、使用者的工作背景、欄位名稱與值、公司名稱、網址，或一點前情提要。有些 query 可以全小寫、帶縮寫、錯字或口語說法。長度要有變化，並著重在邊界案例，而不是寫成一看就很明顯的例子，因為之後還會給使用者審核。

Bad: `"Format this data"`, `"Extract text from PDF"`, `"Create a chart"`

Good: `"ok so my boss just sent me this xlsx file (its in my downloads, called something like 'Q4 sales final FINAL v2.xlsx') and she wants me to add a column that shows the profit margin as a percentage. The revenue is in column C and costs are in column D i think"`

對於 **should-trigger** queries（8 到 10 個），要思考覆蓋範圍。你要用不同說法表達同一種意圖，有正式、有口語。也要包含一些使用者沒有明講 skill 名稱或檔案類型，但其實明顯需要這個 skill 的情境。再加一些不常見用途，以及這個 skill 會跟其他 skill 競爭、但應該由它勝出的案例。

對於 **should-not-trigger** queries（8 到 10 個），最有價值的是那些幾乎打到邊的 near-miss，也就是共享某些關鍵字或概念，但其實真正需要的是別的東西。想想相鄰領域、容易誤判的模糊說法、或雖然碰到這個 skill 的領域，但在該情境下應該由其他工具接手的案例。

要避免的一點是：不要讓 should-not-trigger queries 明顯到與 skill 無關。像是拿 `"Write a fibonacci function"` 當 PDF skill 的反例就太簡單了，測不出任何東西。負向案例應該真的有迷惑性。

### 第 2 步：和使用者一起審核

使用 HTML 模板把 eval set 呈現給使用者審核：

1. 讀取 `assets/eval_review.html`
2. 取代 placeholders：
   - `__EVAL_DATA_PLACEHOLDER__` → eval items 的 JSON array（不要再加引號，這會直接成為 JS 變數賦值）
   - `__SKILL_NAME_PLACEHOLDER__` → skill 名稱
   - `__SKILL_DESCRIPTION_PLACEHOLDER__` → skill 現有 description
3. 寫到暫存檔，例如 `/tmp/eval_review_<skill-name>.html`，然後打開它：`open /tmp/eval_review_<skill-name>.html`
4. 使用者可以編輯 queries、切換 should-trigger、新增或移除項目，最後按下 `Export Eval Set`
5. 檔案會下載到 `~/Downloads/eval_set.json`。如果有多個版本，例如 `eval_set (1).json`，就到 Downloads 資料夾找最新的一份

這一步很重要，因為糟糕的 eval queries 會導致糟糕的 descriptions。

### 第 3 步：執行優化迴圈

告訴使用者：「這會花一些時間，我會在背景執行優化迴圈，並定期回來查看進度。」

先把 eval set 存到 workspace，接著在背景執行：

```bash
python -m scripts.run_loop \
  --eval-set <path-to-trigger-eval.json> \
  --skill-path <path-to-skill> \
  --model <model-id-powering-this-session> \
  --max-iterations 5 \
  --verbose
```

請使用 system prompt 中的 model ID，也就是目前這個 session 真正使用的模型，這樣觸發測試才會反映使用者實際體驗。

執行期間，要定期 tail 輸出，回報目前跑到第幾輪，以及分數表現如何。

這個流程會自動處理完整優化迴圈。它會先把 eval set 分成 60% training 與 40% held-out test，評估目前的 description（每個 query 會跑 3 次，以取得較可靠的 trigger rate），然後呼叫 Claude 根據失敗案例提出改善版本。接著它會在 training 與 test 上重新評估每個新 description，最多迭代 5 輪。完成後，它會在瀏覽器打開 HTML 報告，顯示每一輪結果，並回傳包含 `best_description` 的 JSON。這個最佳描述是根據 test score，而不是 train score 來選，以避免 overfitting。

### Skill triggering 的運作方式

理解觸發機制會幫助你設計更好的 eval queries。Skills 會以 name + description 的形式出現在 Claude 的 `available_skills` 清單中，而 Claude 會根據 description 決定是否去查詢某個 skill。你需要知道的重點是：Claude 只會在它自己不容易直接處理的任務上調用 skills。像 `read this PDF` 這種簡單、單步驟任務，就算 description 完美匹配，也可能不會觸發 skill，因為 Claude 可以直接用基本工具完成。相反地，複雜、多步驟或高度專門的任務，只要 description 對得上，就比較穩定會觸發 skill。

這表示你的 eval queries 要足夠有內容，讓 Claude 真正能從 skill 中受益。像 `read file X` 這類簡單 query 就是很差的測試案例，因為無論 description 寫得多好，skill 都可能不會被觸發。

### 第 4 步：套用結果

從 JSON 輸出中取出 `best_description`，更新 skill 的 SKILL.md frontmatter。向使用者展示前後版本差異，並回報分數。

---

### 打包並交付（僅當 `present_files` tool 可用）

先檢查你是否能使用 `present_files` tool。如果沒有，就跳過這一步。如果有，就把 skill 打包，並把 `.skill` 檔案呈現給使用者：

```bash
python -m scripts.package_skill <path/to/skill-folder>
```

打包完成後，告訴使用者產生的 `.skill` 檔案位置，讓他安裝。

---

## Claude.ai 專用說明

在 Claude.ai 中，核心流程仍然一樣（草稿 → 測試 → review → 改善 → 重複），但因為 Claude.ai 沒有 subagents，所以某些做法需要調整：

**執行測試案例**：因為沒有 subagents，所以不能平行執行。每個測試案例都要先讀 skill 的 SKILL.md，再自己依照指示完成該測試 prompt，而且要一個一個來。這沒有獨立 subagents 那麼嚴謹，因為 skill 是你寫的，執行時你也知道完整背景，但這仍然是很有用的 sanity check，而且人類 review 可以補上這部分。baseline runs 直接跳過，只需要使用 skill 完成任務。

**檢視結果**：如果你不能打開瀏覽器，例如 Claude.ai 的 VM 沒有顯示介面，或你在遠端伺服器上，就完全跳過 browser reviewer，改成直接在對話中呈現結果。對每個測試案例，展示 prompt 與 output。如果 output 是使用者需要親自查看的檔案，例如 `.docx` 或 `.xlsx`，就把它存到檔案系統，告訴對方檔案位置，讓他下載檢查。然後直接在對話中詢問回饋，例如：「這看起來如何？有什麼想改的嗎？」

**Benchmarking**：跳過定量 benchmark，因為它依賴 baseline 比較，而在沒有 subagents 的情況下這種比較意義不大。把重點放在來自使用者的定性回饋。

**迭代循環**：和前面一樣，改善 skill、重跑測試案例、詢問回饋，只是中間沒有 browser reviewer。如果你有檔案系統，也仍然可以把結果按 iteration 目錄整理好。

**Description optimization**：這一節需要 `claude` CLI 工具，特別是 `claude -p`，而它只在 Claude Code 中可用。如果你是在 Claude.ai，就跳過。

**Blind comparison**：需要 subagents，跳過。

**Packaging**：`package_skill.py` 腳本在任何有 Python 與檔案系統的環境都能使用。在 Claude.ai 中，你可以執行它，然後讓使用者下載產生的 `.skill` 檔案。

**Updating an existing skill**：使用者也可能是要你更新既有 skill，而不是建立新 skill。這種情況下：
- **保留原本名稱。** 記下 skill 目錄名稱與 `name` frontmatter 欄位，保持不變。例如，如果安裝中的 skill 叫 `research-helper`，那輸出就應該是 `research-helper.skill`，而不是 `research-helper-v2`。
- **編輯前先複製到可寫位置。** 已安裝的 skill 路徑可能是唯讀的。先複製到 `/tmp/skill-name/`，在那邊編輯，再從副本打包。
- **如果要手動打包，先在 `/tmp/` 暫存。** 然後再複製到輸出目錄，因為直接寫入目標位置可能會遇到權限問題。

---

## Cowork 專用說明

如果你是在 Cowork 環境，主要要知道的是：

- 你有 subagents，所以主要 workflow 都可用，包括平行啟動測試案例、跑 baselines、grading 等等。（不過，如果你遇到嚴重 timeout，也可以接受改成依序執行測試 prompts，而不是平行。）
- 你沒有瀏覽器或顯示介面，所以在產生 eval viewer 時，請用 `--static <output_path>` 輸出獨立 HTML，而不是啟動伺服器。之後提供一個連結，讓使用者自行點開 HTML。
- 不知道為什麼，在 Cowork 中 Claude 似乎比較不傾向在跑完測試後自動產生 eval viewer，所以這裡再強調一次：不論你是在 Cowork 還是 Claude Code，在跑完測試後，你都應該先用 `generate_review.py` 產生 eval viewer，讓人類先看範例、給回饋，再由你自己修 skill 並嘗試修正。不要自己手寫一份客製 HTML。這裡直接講重點：在你自己評估輸入之前，先產生 eval viewer。你要盡快把結果送到人類面前。
- Feedback 的運作方式不同：因為沒有執行中的伺服器，viewer 的 `Submit All Reviews` 會把 `feedback.json` 下載成檔案。之後你可以從那裡讀取它，必要時可能要先申請存取權。
- Packaging 可以正常使用，`package_skill.py` 只需要 Python 與檔案系統。
- Description optimization（`run_loop.py` / `run_eval.py`）在 Cowork 應該也能正常運作，因為它透過 subprocess 執行 `claude -p`，而不是依賴瀏覽器；但請等到 skill 完整做完、使用者也同意它狀態良好之後，再進行這一步。
- **Updating an existing skill**：使用者也可能是要你更新既有 skill，而不是建立新 skill。這種情況下，請遵循前面 claude.ai 段落中的更新指引。

---

## 參考檔案

`agents/` 目錄中包含給專門 subagents 使用的說明文件。當你需要啟動對應的 subagent 時，再去讀它們。

- `agents/grader.md` — 如何根據 outputs 評估 assertions
- `agents/comparator.md` — 如何對兩個 outputs 做 blind A/B comparison
- `agents/analyzer.md` — 如何分析某個版本為什麼勝過另一個版本

`references/` 目錄則包含額外文件：
- `references/schemas.md` — `evals.json`、`grading.json` 等檔案的 JSON 結構

---

再重複一次核心迴圈，強調重點：

- 先搞清楚這個 skill 是要做什麼的
- 起草或編輯這個 skill
- 用能存取該 skill 的 Claude 對測試 prompts 執行
- 和使用者一起評估 outputs：
  - 建立 `benchmark.json`，並執行 `eval-viewer/generate_review.py`，幫助使用者 review
  - 執行定量 evals
- 重複以上流程，直到你和使用者都滿意
- 打包最終 skill，並把它交給使用者

如果你有 TodoList，請把這些步驟加進去，避免遺漏。如果你是在 Cowork，請特別把「Create evals JSON and run `eval-viewer/generate_review.py` so human can review test cases」放進 TodoList，確保這件事真的發生。

祝你好運！
