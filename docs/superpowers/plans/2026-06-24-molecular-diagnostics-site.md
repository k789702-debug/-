# 醫學分子檢驗學複習網站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個資料驅動的「醫學分子檢驗學」國考複習網站，兩個互連模組（🧬 技術 ↔ 🏥 臨床應用），只編 `data/*.json` 即可維護內容。

**Architecture:** 沿用參考專案 `C:\Users\User\Desktop\培養基\Microbiology` 的形狀：每個模組 = `index.html` + `assets/app.js` + `data/*.json`，兩模組共用根目錄 `assets/cards.css`；以 JSON Schema + 零相依 Node 驗證器把關資料；前端在瀏覽器讀 JSON 渲染卡片並以名稱比對自動產生跨模組連結。內容工作流以 `moex-exam` MCP 查國考題為骨幹，Tavily/PubMed 輔助蒐料與佐證。

**Tech Stack:** 純前端（原生 JS，無框架）、Node.js（驗證器，零相依）、JSON Schema draft-07、GitHub Actions、既有 `moex-exam` MCP（Node + @modelcontextprotocol/sdk + zod）。

## Global Constraints

- 設計依據：`docs/superpowers/specs/2026-06-24-molecular-diagnostics-design.md`（每個任務都應對照）。
- 兩模組：`tech/`（技術）與 `clinical/`（臨床應用），互相連結。
- 資料即內容：作者只編 `*/data/*.json`，不寫 HTML；文字中 `**重點**` 自動轉粗體，禁止手寫 HTML 標籤。
- `stars` 為整數 1–3；`qa` 格式為 `["民國年 第N題","說明"]`（國考題引用是骨幹，必填）。
- 驗證器**零相依**（只用 Node 內建 `fs`/`path`），失敗時 `process.exit(1)`。
- 不做（YAGNI，未來增強）：離線單檔 HTML、DOCX、判讀圖示、第三個基礎分生模組。
- 參考檔（複製/改寫來源）：
  - 驗證器 `Microbiology/scripts/validate_media.js`
  - Schema `Microbiology/schema/media.schema.json`
  - 前端 `Microbiology/media/assets/app.js`、`Microbiology/media/index.html`
  - 總入口 `Microbiology/index.html`
  - 工作流 `Microbiology/.github/workflows/validate.yml`
  - MCP `Microbiology/tools/moex-exam-mcp/`（整個資料夾複製，科目無關）
- 本機預覽需經 HTTP（瀏覽器禁止 `file://` 載入 JSON）：`python -m http.server`。
- 提交訊息結尾固定加：
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File Structure

```
醫學分子檢驗學/
├── index.html                       總入口（技術 / 臨床應用）
├── assets/
│   ├── home.css                     總入口樣式
│   └── cards.css                    兩模組共用卡片樣式（tech 與 clinical 都連它）
├── README.md
├── .gitignore
├── package.json                     scripts: validate
├── .mcp.json                        指向 moex-exam
├── tech/
│   ├── index.html
│   ├── assets/app.js
│   └── data/tech.json               ← 編這個
├── clinical/
│   ├── index.html
│   ├── assets/app.js
│   └── data/clinical.json           ← 編這個
├── schema/{tech,clinical}.schema.json
├── scripts/{validate_tech,validate_clinical}.js
├── tools/moex-exam-mcp/             （從 Microbiology 複製）
└── .github/workflows/validate.yml
```

每個檔案單一職責：schema 定義形狀、validator 把關、app.js 只負責渲染與連結、html 只負責結構與控制項。

---

## Task 1: Repo 骨架、工具鏈與 MCP 複製

**Files:**
- Create: `.gitignore`, `package.json`, `README.md`, `.mcp.json`
- Create: 空資料夾佔位 `tech/data/`, `clinical/data/`, `schema/`, `scripts/`, `.github/workflows/`
- Copy: `tools/moex-exam-mcp/`（從 Microbiology 整個資料夾複製）

**Interfaces:**
- Produces: `npm run validate`（指令存在，呼叫兩支驗證器；驗證器在 Task 2/3 才寫，本任務先放可執行的 placeholder npm script 指向它們）；`.mcp.json` 讓 Claude Code 能啟動 `moex-exam`。

- [ ] **Step 1: 建立 `.gitignore`**

```
# 依賴（可由 package.json 還原，不進版控）
node_modules/

# 雜項
*.log
.DS_Store

# moex-exam-mcp
tools/moex-exam-mcp/node_modules/
tools/moex-exam-mcp/test/fixtures/*.pdf
```

- [ ] **Step 2: 建立 `package.json`**

```json
{
  "name": "molecular-diagnostics-exam-outline",
  "version": "1.0.0",
  "private": true,
  "description": "醫事檢驗師「醫學分子檢驗學」：技術與臨床應用大綱（資料驅動、零相依驗證器）",
  "scripts": {
    "validate": "node scripts/validate_tech.js && node scripts/validate_clinical.js"
  }
}
```

- [ ] **Step 3: 複製 moex-exam MCP（整個資料夾，含其 package.json 與 src/）**

Run（Git Bash）:
```bash
cp -r "/c/Users/User/Desktop/培養基/Microbiology/tools/moex-exam-mcp" "/c/Users/User/Desktop/醫學分子檢驗學/tools/moex-exam-mcp"
rm -rf "/c/Users/User/Desktop/醫學分子檢驗學/tools/moex-exam-mcp/node_modules"
```

- [ ] **Step 4: 在 MCP 資料夾安裝相依**

Run:
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學/tools/moex-exam-mcp" && npm install
```
Expected: 安裝完成，產生 `node_modules/`（含 `@modelcontextprotocol/sdk`、`zod`）。

- [ ] **Step 5: 建立 `.mcp.json`**

```json
{
  "mcpServers": {
    "moex-exam": {
      "command": "node",
      "args": ["tools/moex-exam-mcp/src/server.mjs"]
    }
  }
}
```

- [ ] **Step 6: 驗證 MCP server 可載入（語法/匯入無誤）**

Run:
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學" && node --check tools/moex-exam-mcp/src/server.mjs && echo OK
```
Expected: 印出 `OK`（無語法錯誤）。

- [ ] **Step 7: 建立 README 起始版 `README.md`**

```markdown
# 醫學分子檢驗學複習大綱

醫事檢驗師國家考試「**醫學分子檢驗學**」複習網站。兩套互相連結、資料驅動的大綱：

| 模組 | 內容 | 入口 |
|------|------|------|
| 🧬 **tech** 技術 | 核酸萃取／擴增／分離／雜交／定序／原位／晶片…，含原理、流程、判讀、品管排錯、技術鑑別、考點 | `tech/index.html` |
| 🏥 **clinical** 臨床應用 | 遺傳病／腫瘤分子標記／感染症分子診斷／藥物基因體學／產前篩檢，含檢測標的、常用技術、臨床意義、判讀、陷阱、考點 | `clinical/index.html` |

兩者互連：技術卡的「應用」可點進對應臨床卡；臨床卡的「常用技術」可點回技術卡。

## 如何維護內容

只編輯 `tech/data/tech.json` 與 `clinical/data/clinical.json`，不必寫 HTML。
`**重點**` 會自動變粗體；`stars` 為 1–3；`qa` 格式 `["112年 第30題","題目說明"]`。

## 驗證（零相依，純 Node）

\`\`\`bash
npm run validate
\`\`\`

## 本機預覽

\`\`\`bash
python -m http.server   # 開 http://localhost:8000/
\`\`\`

## 內容工作流（MCP）

moex-exam 查國考題填 `qa`（骨幹）→ Tavily 蒐料 → PubMed 補可引用 PMID。
```

- [ ] **Step 8: Commit**

```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學"
git add -A
git commit -m "chore: repo 骨架、package.json、moex-exam MCP 複製與 .mcp.json

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 技術模組 schema 與驗證器（TDD）

**Files:**
- Create: `schema/tech.schema.json`
- Create: `scripts/validate_tech.js`
- Create: `tech/data/tech.json`（含 1 張真實種子卡 qPCR，作為通過案例）

**Interfaces:**
- Consumes: 無（首個資料任務）。
- Produces: `tech.json` 形狀 — 物件含 `meta{subject, groups[]}`、選用 `flows{}`、`tech[]`。每張 `tech[]` 物件欄位見下。`scripts/validate_tech.js` 可由 `node scripts/validate_tech.js` 執行，失敗 exit 1。

技術卡欄位（schema 與驗證器需一致）：
- 必填：`h1`(string), `abbr`(string), `en`(string), `zh`(string), `stars`(int 1–3), `principle`(string), `hot`(string[]≥1), `qa`(2-tuple[])
- 選填：`steps`(string[]), `keypoints`(string[]), `interpret`(string), `qc`(3-tuple[] `["現象","假陽/假陰·原因","QC對策"]`), `pros_cons`(object `{pros:string[], cons:string[]}`), `compare`(string[][] 表格列，第一列為表頭), `applications`(string[] 連到臨床卡名稱)

- [ ] **Step 1: 寫 schema `schema/tech.schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "醫學分子檢驗學 技術模組 資料結構",
  "type": "object",
  "required": ["meta", "tech"],
  "properties": {
    "meta": {
      "type": "object",
      "required": ["subject", "groups"],
      "properties": {
        "subject": { "type": "string" },
        "version": { "type": "string" },
        "updated": { "type": "string" },
        "source": { "type": "string" },
        "groups": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    },
    "flows": {
      "type": "object",
      "additionalProperties": { "type": "array", "items": { "type": "string" } }
    },
    "tech": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["h1","abbr","en","zh","stars","principle","hot","qa"],
        "additionalProperties": false,
        "properties": {
          "h1": { "type": "string" },
          "abbr": { "type": "string" },
          "en": { "type": "string" },
          "zh": { "type": "string" },
          "stars": { "type": "integer", "minimum": 1, "maximum": 3 },
          "principle": { "type": "string" },
          "steps": { "type": "array", "items": { "type": "string" } },
          "keypoints": { "type": "array", "items": { "type": "string" } },
          "interpret": { "type": "string" },
          "qc": {
            "type": "array",
            "items": { "type": "array", "items": { "type": "string" }, "minItems": 3, "maxItems": 3 }
          },
          "pros_cons": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "pros": { "type": "array", "items": { "type": "string" } },
              "cons": { "type": "array", "items": { "type": "string" } }
            }
          },
          "compare": {
            "type": "array",
            "items": { "type": "array", "items": { "type": "string" }, "minItems": 2 }
          },
          "applications": { "type": "array", "items": { "type": "string" } },
          "hot": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
          "qa": {
            "type": "array",
            "items": { "type": "array", "items": { "type": "string" }, "minItems": 2, "maxItems": 2 }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: 寫驗證器 `scripts/validate_tech.js`**

```js
#!/usr/bin/env node
/* tech/data/tech.json 驗證器（零相依，供本機與 GitHub Actions 使用）
   執行： node scripts/validate_tech.js  失敗時 exit 1。 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'tech', 'data', 'tech.json');
const REQUIRED = ['h1','abbr','en','zh','stars','principle','hot','qa'];
const STR_FIELDS = ['principle','interpret'];
const STRLIST_FIELDS = ['steps','keypoints','applications'];
const errors = [], warns = [];

let raw, data;
try { raw = fs.readFileSync(FILE, 'utf8'); } catch (e) { console.error('✗ 無法讀取 tech/data/tech.json'); process.exit(1); }
try { data = JSON.parse(raw); } catch (e) { console.error('✗ JSON 格式錯誤：' + e.message); process.exit(1); }

if (!data.meta || !Array.isArray(data.meta.groups)) errors.push('meta.groups 缺失或不是陣列');
if (!Array.isArray(data.tech) || data.tech.length === 0) errors.push('tech 缺失或為空');

const flowKeys = new Set(Object.keys(data.flows || {}));
const groupSet = new Set((data.meta && data.meta.groups) || []);
const seenAbbr = new Map();
const okStars = s => Number.isInteger(s) && s >= 1 && s <= 3;
const boldBalanced = s => (String(s).match(/\*\*/g) || []).length % 2 === 0;
const noHtml = (s, id, f) => { if (/<[a-zA-Z/]/.test(s)) warns.push(`${id}: 欄位 "${f}" 含疑似 HTML 標籤`); };

(data.tech || []).forEach((t, i) => {
  const id = `tech[${i}] ${t.abbr || t.en || '(無名)'}`;
  REQUIRED.forEach(f => { if (!(f in t)) errors.push(`${id}: 缺少欄位 "${f}"`); });
  if ('stars' in t && !okStars(t.stars)) errors.push(`${id}: stars 必須 1–3，目前=${t.stars}`);
  if (t.abbr) { if (seenAbbr.has(t.abbr)) errors.push(`${id}: 縮寫重複`); else seenAbbr.set(t.abbr, i); }
  if (t.h1 && groupSet.size && !groupSet.has(t.h1)) warns.push(`${id}: h1 "${t.h1}" 不在 meta.groups`);

  STR_FIELDS.forEach(f => {
    if (typeof t[f] === 'string') { if (!boldBalanced(t[f])) errors.push(`${id}: 欄位 "${f}" 的 ** 未成對`); noHtml(t[f], id, f); }
  });
  STRLIST_FIELDS.forEach(f => {
    if (f in t) {
      if (!Array.isArray(t[f])) errors.push(`${id}: 欄位 "${f}" 必須為陣列`);
      else t[f].forEach((s, j) => { if (typeof s !== 'string') errors.push(`${id}: ${f}[${j}] 必須為字串`); else if (!boldBalanced(s)) errors.push(`${id}: ${f}[${j}] 的 ** 未成對`); });
    }
  });
  if ('qc' in t) {
    if (!Array.isArray(t.qc)) errors.push(`${id}: qc 必須為陣列`);
    else t.qc.forEach((r, j) => { if (!Array.isArray(r) || r.length !== 3) errors.push(`${id}: qc[${j}] 必須為 ["現象","假陽/假陰·原因","QC對策"]`); });
  }
  if ('pros_cons' in t) {
    const pc = t.pros_cons;
    if (typeof pc !== 'object' || Array.isArray(pc) || pc === null) errors.push(`${id}: pros_cons 必須為物件 {pros,cons}`);
    else ['pros','cons'].forEach(k => { if (k in pc && !Array.isArray(pc[k])) errors.push(`${id}: pros_cons.${k} 必須為陣列`); });
  }
  if ('compare' in t) {
    if (!Array.isArray(t.compare)) errors.push(`${id}: compare 必須為陣列`);
    else {
      const w = (t.compare[0] || []).length;
      t.compare.forEach((r, j) => { if (!Array.isArray(r)) errors.push(`${id}: compare[${j}] 必須為陣列`); else if (r.length !== w) errors.push(`${id}: compare[${j}] 欄數(${r.length}) 與表頭(${w}) 不符`); });
    }
  }
  (t.hot || []).forEach((h, j) => { if (!boldBalanced(h)) errors.push(`${id}: hot[${j}] 的 ** 未成對`); });
  if (Array.isArray(t.qa)) t.qa.forEach((q, j) => { if (!Array.isArray(q) || q.length !== 2) errors.push(`${id}: qa[${j}] 必須為 ["年度題號","說明"]`); });
  else if ('qa' in t) errors.push(`${id}: qa 必須為陣列`);
});

console.log(`檢查 ${(data.tech||[]).length} 張技術卡、${groupSet.size} 技術群、${flowKeys.size} 分流。`);
warns.forEach(w => console.log('⚠ ' + w));
if (errors.length) { console.error(`\n✗ 發現 ${errors.length} 個錯誤：`); errors.forEach(e => console.error('  - ' + e)); process.exit(1); }
console.log(`✓ 通過驗證${warns.length ? '（含 ' + warns.length + ' 項提醒）' : ''}。`);
```

- [ ] **Step 3: 先建立「會驗證失敗」的暫存資料以確認驗證器抓得到錯**

寫入 `tech/data/tech.json`（故意缺 `qa`、stars 超界）：
```json
{
  "meta": { "subject": "醫學分子檢驗學", "groups": ["核酸擴增"] },
  "tech": [
    { "h1": "核酸擴增", "abbr": "qPCR", "en": "Real-time quantitative PCR", "zh": "即時定量PCR", "stars": 5, "principle": "壞掉的 **粗體", "hot": ["x"] }
  ]
}
```

- [ ] **Step 4: 執行驗證器，確認它失敗（紅燈）**

Run:
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學" && node scripts/validate_tech.js
```
Expected: FAIL（exit 1），列出 `缺少欄位 "qa"`、`stars 必須 1–3`、`principle 的 ** 未成對` 等錯誤。

- [ ] **Step 5: 換成正確的種子資料（1 張真實 qPCR 卡）**

覆寫 `tech/data/tech.json`：
```json
{
  "meta": {
    "subject": "醫學分子檢驗學",
    "version": "0.1.0",
    "updated": "2026-06-24",
    "groups": ["核酸萃取與分離", "核酸擴增", "定序", "雜交與原位", "甲基化與突變偵測", "品管與實驗室設計"]
  },
  "flows": {
    "核酸擴增": [
      "提取核酸 → 設計引子/探針 → **加內控(IC)與陰控(NTC)** → 擴增 → 即時偵測螢光 → 判讀 Ct/熔解曲線"
    ]
  },
  "tech": [
    {
      "h1": "核酸擴增",
      "abbr": "qPCR",
      "en": "Real-time quantitative PCR",
      "zh": "即時定量PCR",
      "stars": 3,
      "principle": "於每個 PCR 循環即時偵測螢光，螢光強度與產物量成正比。**Ct（threshold cycle）越小代表起始模板越多**。化學法：插入型染料 **SYBR Green**（非特異、需熔解曲線確認）與 **水解探針 TaqMan**（特異、利用 5'→3' 外切酶活性釋放螢光）。",
      "steps": [
        "萃取核酸並測定純度（A260/A280）",
        "配置反應液：引子、探針或染料、聚合酶、dNTP、Mg²⁺",
        "設定 NTC（無模板陰控）與內控 IC",
        "跑擴增並即時讀取螢光，設定閾值取得 Ct"
      ],
      "keypoints": ["TaqMan 探針 5' 報告子／3' 淬熄子", "SYBR Green 需跑熔解曲線", "標準曲線換算絕對定量", "效率宜 90–110%（斜率約 −3.3）"],
      "interpret": "**Ct 越小 → 模板越多**；SYBR Green 熔解曲線**單峰**=特異、多峰/低 Tm=引子二聚體或非特異。NTC 不應有訊號。",
      "qc": [
        ["NTC 出現訊號", "假陽／污染或引子二聚體", "設 NTC、分區操作、用 TaqMan 提高特異性"],
        ["IC 無訊號但標的也陰性", "假陰／抑制物或萃取失敗", "加內控 IC、稀釋去抑制、重萃取"],
        ["熔解曲線多峰", "非特異產物", "最佳化引子與退火溫度、改用探針法"]
      ],
      "pros_cons": {
        "pros": ["定量、靈敏、閉管降低污染", "可同時偵測多標的（多重）"],
        "cons": ["設備與試劑成本高", "SYBR Green 特異性較低"]
      },
      "compare": [
        ["項目", "傳統PCR", "qPCR", "數位PCR(dPCR)"],
        ["定量", "終點/半定量", "相對/絕對(標準曲線)", "絕對(分割計數)"],
        ["靈敏度", "中", "高", "極高"],
        ["需標準曲線", "—", "是", "否"]
      ],
      "applications": ["BCR-ABL1"],
      "hot": ["**Ct 與起始模板量成反比**", "TaqMan 用 5'→3' 外切酶活性釋放螢光", "SYBR Green 需熔解曲線確認特異性"],
      "qa": [["範例 第N題", "（種子資料：待以 moex-exam 查得真實國考題替換）"]]
    }
  ]
}
```

- [ ] **Step 6: 執行驗證器，確認通過（綠燈）**

Run:
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學" && node scripts/validate_tech.js
```
Expected: PASS — 印出 `✓ 通過驗證`，exit 0。

- [ ] **Step 7: Commit**

```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學"
git add schema/tech.schema.json scripts/validate_tech.js tech/data/tech.json
git commit -m "feat(tech): 技術模組 schema、零相依驗證器與 qPCR 種子卡

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 臨床應用模組 schema 與驗證器（TDD）

**Files:**
- Create: `schema/clinical.schema.json`
- Create: `scripts/validate_clinical.js`
- Create: `clinical/data/clinical.json`（含 1 張真實種子卡 BCR-ABL1）

**Interfaces:**
- Consumes: 無（與 Task 2 平行，各自獨立檔案）。
- Produces: `clinical.json` 形狀 — `meta{subject, groups[]}`、選用 `flows{}`、`clinical[]`。每張 `clinical[]`：必填 `h1, name, en, zh, stars, target, method(string[]≥1), clinical, hot(string[]≥1), qa`；選填 `interpret, pitfall`。`method[]` 之值會在前端比對 `tech[].abbr/en/zh` 自動連結。

- [ ] **Step 1: 寫 schema `schema/clinical.schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "醫學分子檢驗學 臨床應用模組 資料結構",
  "type": "object",
  "required": ["meta", "clinical"],
  "properties": {
    "meta": {
      "type": "object",
      "required": ["subject", "groups"],
      "properties": {
        "subject": { "type": "string" },
        "version": { "type": "string" },
        "updated": { "type": "string" },
        "source": { "type": "string" },
        "groups": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
      }
    },
    "flows": {
      "type": "object",
      "additionalProperties": { "type": "array", "items": { "type": "string" } }
    },
    "clinical": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["h1","name","en","zh","stars","target","method","clinical","hot","qa"],
        "additionalProperties": false,
        "properties": {
          "h1": { "type": "string" },
          "name": { "type": "string" },
          "en": { "type": "string" },
          "zh": { "type": "string" },
          "stars": { "type": "integer", "minimum": 1, "maximum": 3 },
          "target": { "type": "string" },
          "method": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
          "clinical": { "type": "string" },
          "interpret": { "type": "string" },
          "pitfall": { "type": "string" },
          "hot": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
          "qa": {
            "type": "array",
            "items": { "type": "array", "items": { "type": "string" }, "minItems": 2, "maxItems": 2 }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: 寫驗證器 `scripts/validate_clinical.js`**

```js
#!/usr/bin/env node
/* clinical/data/clinical.json 驗證器（零相依）。執行： node scripts/validate_clinical.js 失敗 exit 1。 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'clinical', 'data', 'clinical.json');
const REQUIRED = ['h1','name','en','zh','stars','target','method','clinical','hot','qa'];
const STR_FIELDS = ['target','clinical','interpret','pitfall'];
const errors = [], warns = [];

let raw, data;
try { raw = fs.readFileSync(FILE, 'utf8'); } catch (e) { console.error('✗ 無法讀取 clinical/data/clinical.json'); process.exit(1); }
try { data = JSON.parse(raw); } catch (e) { console.error('✗ JSON 格式錯誤：' + e.message); process.exit(1); }

if (!data.meta || !Array.isArray(data.meta.groups)) errors.push('meta.groups 缺失或不是陣列');
if (!Array.isArray(data.clinical) || data.clinical.length === 0) errors.push('clinical 缺失或為空');

const flowKeys = new Set(Object.keys(data.flows || {}));
const groupSet = new Set((data.meta && data.meta.groups) || []);
const seenName = new Map();
const okStars = s => Number.isInteger(s) && s >= 1 && s <= 3;
const boldBalanced = s => (String(s).match(/\*\*/g) || []).length % 2 === 0;

(data.clinical || []).forEach((c, i) => {
  const id = `clinical[${i}] ${c.name || c.en || '(無名)'}`;
  REQUIRED.forEach(f => { if (!(f in c)) errors.push(`${id}: 缺少欄位 "${f}"`); });
  if ('stars' in c && !okStars(c.stars)) errors.push(`${id}: stars 必須 1–3，目前=${c.stars}`);
  if (c.name) { if (seenName.has(c.name)) errors.push(`${id}: name 重複`); else seenName.set(c.name, i); }
  if (c.h1 && groupSet.size && !groupSet.has(c.h1)) warns.push(`${id}: h1 "${c.h1}" 不在 meta.groups`);

  STR_FIELDS.forEach(f => {
    if (typeof c[f] === 'string') {
      if (!boldBalanced(c[f])) errors.push(`${id}: 欄位 "${f}" 的 ** 未成對`);
      if (/<[a-zA-Z/]/.test(c[f])) warns.push(`${id}: 欄位 "${f}" 含疑似 HTML 標籤`);
    }
  });
  if ('method' in c) {
    if (!Array.isArray(c.method) || c.method.length === 0) errors.push(`${id}: method 必須為非空陣列`);
    else c.method.forEach((m, j) => { if (typeof m !== 'string') errors.push(`${id}: method[${j}] 必須為字串`); });
  }
  (c.hot || []).forEach((h, j) => { if (!boldBalanced(h)) errors.push(`${id}: hot[${j}] 的 ** 未成對`); });
  if (Array.isArray(c.qa)) c.qa.forEach((q, j) => { if (!Array.isArray(q) || q.length !== 2) errors.push(`${id}: qa[${j}] 必須為 ["年度題號","說明"]`); });
  else if ('qa' in c) errors.push(`${id}: qa 必須為陣列`);
});

console.log(`檢查 ${(data.clinical||[]).length} 張臨床卡、${groupSet.size} 應用群、${flowKeys.size} 分流。`);
warns.forEach(w => console.log('⚠ ' + w));
if (errors.length) { console.error(`\n✗ 發現 ${errors.length} 個錯誤：`); errors.forEach(e => console.error('  - ' + e)); process.exit(1); }
console.log(`✓ 通過驗證${warns.length ? '（含 ' + warns.length + ' 項提醒）' : ''}。`);
```

- [ ] **Step 3: 先放會失敗的暫存資料（缺 `method`）**

寫入 `clinical/data/clinical.json`：
```json
{
  "meta": { "subject": "醫學分子檢驗學", "groups": ["腫瘤分子標記"] },
  "clinical": [
    { "h1": "腫瘤分子標記", "name": "BCR-ABL1", "en": "BCR-ABL1 fusion", "zh": "費城染色體", "stars": 3, "target": "t(9;22)", "clinical": "CML 診斷與監測", "hot": ["x"], "qa": [["範例","x"]] }
  ]
}
```

- [ ] **Step 4: 執行驗證器，確認失敗**

Run:
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學" && node scripts/validate_clinical.js
```
Expected: FAIL（exit 1），列出 `缺少欄位 "method"`。

- [ ] **Step 5: 換成正確種子資料（1 張真實 BCR-ABL1 卡）**

覆寫 `clinical/data/clinical.json`（內容依 2026-06-24 Tavily 實測素材，IS 國際標準與 MR 分級）：
```json
{
  "meta": {
    "subject": "醫學分子檢驗學",
    "version": "0.1.0",
    "updated": "2026-06-24",
    "groups": ["腫瘤分子標記", "藥物基因體學", "感染症分子診斷", "遺傳病與產前篩檢"]
  },
  "flows": {
    "腫瘤分子標記": [
      "懷疑 CML → 偵測 **t(9;22) BCR-ABL1** → 確診後以 **RT-qPCR 定量(IS)** 監測治療反應(MMR/DMR)"
    ]
  },
  "clinical": [
    {
      "h1": "腫瘤分子標記",
      "name": "BCR-ABL1",
      "en": "BCR-ABL1 fusion transcript",
      "zh": "費城染色體 t(9;22) 融合基因",
      "stars": 3,
      "target": "**t(9;22)(q34;q11)** 形成的 BCR-ABL1 融合 mRNA（主要型 **p210** e13a2/e14a2；ALL 常見 p190）",
      "method": ["RT-qPCR", "FISH"],
      "clinical": "**慢性骨髓性白血病(CML)** 的診斷、分型與治療監測；指導 TKI（如 imatinib）療效評估與微量殘存疾病(MRD)追蹤。",
      "interpret": "結果以 **國際標準 IS(%)** 表示（BCR-ABL1/內控基因比值）。**MMR(MR3)=≤0.1%IS**（自基準 3-log 下降）；EMR=≤10%IS；DMR：MR4=≤0.01%、MR4.5=≤0.0032%。Ct/比值越低代表殘存越少。",
      "pitfall": "不同實驗室需以 **IS 換算係數** 校正才能比較；內控基因(ABL1/GUSB/BCR)選擇影響結果；dPCR 與 RT-qPCR 在深層反應分級可能略有位移。",
      "hot": ["**MMR=MR3=0.1%IS**", "p210 對應 CML、p190 對應 Ph⁺ ALL", "監測首選 **RT-qPCR + 國際標準(IS)**"],
      "qa": [["範例 第N題", "（種子資料：待以 moex-exam 查得真實國考題替換）"]]
    }
  ]
}
```

- [ ] **Step 6: 執行驗證器，確認通過**

Run:
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學" && node scripts/validate_clinical.js
```
Expected: PASS — `✓ 通過驗證`，exit 0。

- [ ] **Step 7: Commit**

```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學"
git add schema/clinical.schema.json scripts/validate_clinical.js clinical/data/clinical.json
git commit -m "feat(clinical): 臨床應用模組 schema、驗證器與 BCR-ABL1 種子卡

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 技術模組前端（index.html + 共用 cards.css + app.js）

**Files:**
- Create: `tech/index.html`
- Create: `assets/cards.css`（兩模組共用樣式；clinical 在 Task 5 直接連用，不再複製）
- Create: `tech/assets/app.js`

**Interfaces:**
- Consumes: `tech/data/tech.json`（Task 2）、`../clinical/data/clinical.json`（Task 3，用於建立 applications→clinical 連結白名單；載入失敗則不連結、不報錯）。
- Produces: 可在 HTTP 下開啟、依 `h1` 分群、可折疊/搜尋的技術卡頁面。連結規則：`applications[]` 中等於某 `clinical[].name` 者連到 `../clinical/index.html?q=<name>`。

- [ ] **Step 1: 寫 `tech/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'">
<meta name="referrer" content="no-referrer">
<title>分子檢驗技術大綱｜醫學分子檢驗學</title>
<link rel="stylesheet" href="../assets/cards.css?v=20260624.1">
</head>
<body>
<header class="top">
  <div class="title-row">
    <span class="th-badge">技術</span>
    <div>
      <h1>分子檢驗技術大綱</h1>
      <div class="sub" id="sub">科目：醫學分子檢驗學</div>
    </div>
    <nav class="nav">
      <a href="../index.html">總入口</a>
      <a href="index.html" class="cur">技術</a>
      <a href="../clinical/index.html">臨床應用</a>
    </nav>
  </div>
  <div class="controls">
    <input id="search" type="text" placeholder="🔍 即時搜尋：技術、原理、試劑、判讀、考點…（例 qPCR、TaqMan、Ct、熔解曲線）">
    <button type="button" class="btn-mini" id="expandAll">全部展開</button>
    <button type="button" class="btn-mini" id="collapseAll">全部收合</button>
  </div>
  <div class="legend">⭐⭐⭐ 極高頻 ⭐⭐ 高頻 ⭐ 常見。點「應用」可跳到臨床應用大綱。資料維護：編輯 <code>data/tech.json</code>。</div>
</header>
<main>
  <div id="cards"></div>
  <div class="nohit" id="nohit">查無符合條件的技術，請調整搜尋。</div>
</main>
<script src="assets/app.js?v=20260624.1"></script>
</body>
</html>
```

- [ ] **Step 2: 寫共用 `assets/cards.css`（tech 與 clinical 共用同一份卡片樣式）**

```css
:root{--bg:#0f1115;--card:#171a21;--ink:#e8eaed;--mut:#9aa3b2;--acc:#4ea1ff;--line:#272b34;--hot:#ffce5a}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:"Segoe UI","Microsoft JhengHei",system-ui,sans-serif;line-height:1.6}
.top{position:sticky;top:0;z-index:5;background:#0f1115ee;backdrop-filter:blur(6px);border-bottom:1px solid var(--line);padding:12px 16px}
.title-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.th-badge{background:var(--acc);color:#04101f;font-weight:700;border-radius:8px;padding:4px 10px}
h1{font-size:1.25rem;margin:0}
.sub{color:var(--mut);font-size:.85rem}
.nav{margin-left:auto;display:flex;gap:6px}
.nav a{color:var(--mut);text-decoration:none;padding:4px 10px;border-radius:8px;border:1px solid var(--line)}
.nav a.cur{color:#04101f;background:var(--acc);font-weight:700}
.controls{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
#search{flex:1;min-width:240px;background:#0c0e13;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:8px 12px}
.btn-mini{background:#0c0e13;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:8px 12px;cursor:pointer}
.legend{color:var(--mut);font-size:.8rem;margin-top:8px}
main{max-width:1000px;margin:0 auto;padding:16px}
.group{margin:18px 0;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.group-head{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#12151c;cursor:pointer;font-weight:700}
.group.collapsed .group-body{display:none}
.flow{padding:10px 14px;border-bottom:1px solid var(--line);color:var(--mut)}
.flow .ln{font-size:.9rem}
.cards{padding:12px;display:grid;gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.card-head{display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;flex-wrap:wrap}
.card-head .en{color:var(--mut);font-size:.85rem}
.card-head .abbr{font-weight:800;font-size:1.05rem}
.card-head .zh{color:var(--ink)}
.card-head .stars{color:var(--hot);margin-left:auto}
.card.collapsed .card-body{display:none}
.card-body{padding:0 14px 14px;border-top:1px solid var(--line)}
.field{margin-top:12px}
.field .k{font-weight:700;color:var(--acc);font-size:.9rem;margin-bottom:4px}
table{border-collapse:collapse;width:100%;font-size:.88rem}
th,td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th{background:#12151c}
.tags a,.xref{color:var(--acc);text-decoration:none;border-bottom:1px dashed var(--acc)}
.pc{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pc .pros{color:#8ee6a8}.pc .cons{color:#ff9a9a}
.hot{margin-top:14px;background:#1b1709;border:1px solid #3a2f12;border-radius:10px;padding:8px 12px}
.hot .k{color:var(--hot);font-weight:700}
table.qa td.yr{white-space:nowrap;color:var(--mut)}
b{color:#fff}
.nohit{display:none;color:var(--mut);text-align:center;padding:30px}
.err{color:#ff9a9a;padding:20px;border:1px solid #3a1212;border-radius:10px}
```

- [ ] **Step 3: 寫 `tech/assets/app.js`**

```js
/* 分子檢驗技術大綱 — 前端渲染
   資料來源：data/tech.json（共編者只需編輯該檔）
   ** 文字 ** → 粗體；applications 中等於臨床卡 name 者連到 ../clinical/index.html?q=name */
(function(){
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  let DATA=null, CLINICAL=new Set();

  // 先抓臨床卡名稱白名單（失敗不影響主流程，只是不連結）
  const xref = fetch('../clinical/data/clinical.json')
    .then(r=>r.ok?r.json():null).then(d=>{ if(d&&Array.isArray(d.clinical)) d.clinical.forEach(c=>CLINICAL.add(c.name)); }).catch(()=>{});

  const boot = fetch('data/tech.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); });
  Promise.all([boot, xref]).then(([d])=>{ DATA=d; render(); })
    .catch(e=>{ $('#cards').innerHTML='<div class="err">無法載入 <b>data/tech.json</b>（'+esc(e.message)+'）。請用本機伺服器（<code>python -m http.server</code>）或 GitHub Pages 網址開啟，勿用 file://。</div>'; });

  function listField(title, arr){
    if(!Array.isArray(arr)||!arr.length) return '';
    return '<div class="field"><div class="k">'+title+'</div><ul>'+arr.map(x=>'<li>'+md(x)+'</li>').join('')+'</ul></div>';
  }
  function strField(title, s){
    if(typeof s!=='string'||!s.trim()) return '';
    return '<div class="field"><div class="k">'+title+'</div><div class="v">'+md(s)+'</div></div>';
  }
  function qcTable(qc){
    if(!Array.isArray(qc)||!qc.length) return '';
    const rows=qc.map(r=>'<tr><td>'+md(r[0])+'</td><td>'+md(r[1])+'</td><td>'+md(r[2])+'</td></tr>').join('');
    return '<div class="field"><div class="k">品管與排錯</div><table><thead><tr><th>現象</th><th>假陽/假陰·原因</th><th>QC對策</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }
  function prosCons(pc){
    if(!pc||(!pc.pros&&!pc.cons)) return '';
    const col=(t,a,cls)=>'<div class="'+cls+'"><b>'+t+'</b><ul>'+((a||[]).map(x=>'<li>'+md(x)+'</li>').join(''))+'</ul></div>';
    return '<div class="field"><div class="k">優缺點</div><div class="pc">'+col('優點',pc.pros,'pros')+col('限制',pc.cons,'cons')+'</div></div>';
  }
  function cmpTable(rows){
    if(!Array.isArray(rows)||rows.length<2) return '';
    const head='<tr>'+rows[0].map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr>';
    const body=rows.slice(1).map(r=>'<tr>'+r.map((c,ci)=>'<td>'+(ci===0?md(c):esc(c))+'</td>').join('')+'</tr>').join('');
    return '<div class="field"><div class="k">技術鑑別</div><table><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>';
  }
  function appsField(apps){
    if(!Array.isArray(apps)||!apps.length) return '';
    const items=apps.map(a=> CLINICAL.has(a)
      ? '<a class="xref" href="../clinical/index.html?q='+encodeURIComponent(a)+'" title="到臨床應用大綱查 '+esc(a)+'">'+esc(a)+'</a>'
      : esc(a)).join('、');
    return '<div class="field"><div class="k">臨床應用</div><div class="v tags">'+items+'</div></div>';
  }

  function techCard(d){
    const card=document.createElement('article');
    card.className='card'; card.id=d.abbr;
    const fields=
      strField('原理', d.principle)+
      listField('操作流程', d.steps)+
      listField('關鍵試劑／參數', d.keypoints)+
      strField('結果判讀', d.interpret)+
      qcTable(d.qc)+
      prosCons(d.pros_cons)+
      cmpTable(d.compare)+
      appsField(d.applications);
    const hot=(d.hot||[]).map(h=>'<li>'+md(h)+'</li>').join('');
    const qa=(d.qa||[]).map(q=>'<tr><td class="yr">'+esc(q[0])+'</td><td>'+esc(q[1])+'</td></tr>').join('');
    card.innerHTML=
      '<div class="card-head"><span class="en">'+esc(d.en)+'</span><span class="abbr">'+esc(d.abbr)+'</span>'+
      '<span class="zh">'+esc(d.zh)+'</span><span class="stars">'+'★'.repeat(d.stars||0)+'</span><span class="arrow">▼</span></div>'+
      '<div class="card-body">'+fields+
      '<div class="hot"><div class="k">⭐ 高頻考點</div><ol>'+hot+'</ol>'+
      '<table class="qa"><tbody>'+qa+'</tbody></table></div></div>';
    card.querySelector('.card-head').onclick=()=>card.classList.toggle('collapsed');
    return card;
  }

  function render(){
    $('#sub').textContent='科目：'+DATA.meta.subject+'｜共 '+DATA.tech.length+' 張技術卡';
    const wrap=$('#cards'); wrap.innerHTML='';
    const h1order=[...new Set(DATA.tech.map(t=>t.h1))];
    h1order.forEach(h1=>{
      const g=document.createElement('section');
      g.className='group'; g.dataset.group=h1;
      const flow=(DATA.flows&&DATA.flows[h1]||[]).map(l=>'<div class="ln">'+md(l)+'</div>').join('');
      g.innerHTML='<div class="group-head"><span class="arrow">▼</span><span>'+esc(h1)+'</span></div>'+
        '<div class="group-body">'+(flow?'<div class="flow"><h3>🧭 流程</h3>'+flow+'</div>':'')+'</div>';
      const body=g.querySelector('.group-body');
      g.querySelector('.group-head').onclick=()=>g.classList.toggle('collapsed');
      const cc=document.createElement('div'); cc.className='cards';
      DATA.tech.filter(t=>t.h1===h1).forEach(t=>cc.appendChild(techCard(t)));
      body.appendChild(cc);
      wrap.appendChild(g);
    });
    $('#search').addEventListener('input',applyFilter);
    $('#expandAll').onclick=()=>document.querySelectorAll('.card,.group').forEach(e=>e.classList.remove('collapsed'));
    $('#collapseAll').onclick=()=>document.querySelectorAll('.card,.group').forEach(e=>e.classList.add('collapsed'));
    const q=new URLSearchParams(location.search).get('q');
    if(q){ $('#search').value=q; }
    applyFilter();
  }

  function applyFilter(){
    const q=$('#search').value.trim().toLowerCase();
    let any=false;
    document.querySelectorAll('.group').forEach(g=>{
      let gHas=false;
      g.querySelectorAll('.card').forEach(card=>{
        const show=!q||card.textContent.toLowerCase().includes(q);
        card.style.display=show?'':'none';
        if(show){gHas=true;any=true;}
      });
      g.style.display=gHas?'':'none';
    });
    $('#nohit').style.display=any||!q?'none':'block';
  }
})();
```

- [ ] **Step 4: 語法檢查 app.js（無瀏覽器的快速把關）**

Run:
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學" && node --check tech/assets/app.js && echo OK
```
Expected: 印出 `OK`。

- [ ] **Step 5: 啟伺服器手動驗收**

Run（背景啟動後用瀏覽器開 http://localhost:8000/tech/index.html）:
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學" && python -m http.server 8000
```
Expected: 看到「核酸擴增」群組、qPCR 卡可展開；「臨床應用」欄的 `BCR-ABL1` 為可點連結；搜尋「Ct」可篩選。確認後 Ctrl-C 結束伺服器。

- [ ] **Step 6: Commit**

```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學"
git add assets/cards.css tech/index.html tech/assets/app.js
git commit -m "feat(tech): 技術模組前端渲染、共用 cards.css、applications→clinical 連結

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 臨床應用模組前端（index.html + 共用 cards.css + app.js）

**Files:**
- Create: `clinical/index.html`（連用 Task 4 建立的共用 `../assets/cards.css`，不另建樣式檔）
- Create: `clinical/assets/app.js`

**Interfaces:**
- Consumes: `clinical/data/clinical.json`（Task 3）、`../tech/data/tech.json`（Task 2，建立 method→tech 連結白名單；以 `abbr`/`en`/`zh` 任一比對；載入失敗則不連結）。
- Produces: 依 `h1` 分群的臨床卡頁面；`method[]` 中能對應某技術卡者連到 `../tech/index.html?q=<abbr>`。

- [ ] **Step 1: 寫 `clinical/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'">
<meta name="referrer" content="no-referrer">
<title>分子檢驗臨床應用大綱｜醫學分子檢驗學</title>
<link rel="stylesheet" href="../assets/cards.css?v=20260624.1">
</head>
<body>
<header class="top">
  <div class="title-row">
    <span class="th-badge">應用</span>
    <div>
      <h1>分子檢驗臨床應用大綱</h1>
      <div class="sub" id="sub">科目：醫學分子檢驗學</div>
    </div>
    <nav class="nav">
      <a href="../index.html">總入口</a>
      <a href="../tech/index.html">技術</a>
      <a href="index.html" class="cur">臨床應用</a>
    </nav>
  </div>
  <div class="controls">
    <input id="search" type="text" placeholder="🔍 即時搜尋：疾病、標的、技術、判讀、考點…（例 BCR-ABL、CML、MMR、CYP2C19）">
    <button type="button" class="btn-mini" id="expandAll">全部展開</button>
    <button type="button" class="btn-mini" id="collapseAll">全部收合</button>
  </div>
  <div class="legend">⭐⭐⭐ 極高頻 ⭐⭐ 高頻 ⭐ 常見。點「常用技術」可跳到技術大綱。資料維護：編輯 <code>data/clinical.json</code>。</div>
</header>
<main>
  <div id="cards"></div>
  <div class="nohit" id="nohit">查無符合條件的項目，請調整搜尋。</div>
</main>
<script src="assets/app.js?v=20260624.1"></script>
</body>
</html>
```

- [ ] **Step 2: 共用樣式（無需建立樣式檔）**

`clinical/index.html`（Step 1）已連用 Task 4 建立的共用 `../assets/cards.css`，兩模組共享同一份卡片樣式。本步驟僅確認該檔存在：
```bash
test -f "/c/Users/User/Desktop/醫學分子檢驗學/assets/cards.css" && echo OK || echo "缺少 assets/cards.css（應由 Task 4 建立）"
```
Expected: 印出 `OK`。

- [ ] **Step 3: 寫 `clinical/assets/app.js`**

```js
/* 分子檢驗臨床應用大綱 — 前端渲染
   資料來源：data/clinical.json（共編者只需編輯該檔）
   ** 文字 ** → 粗體；method 中能對應技術卡(abbr/en/zh)者連到 ../tech/index.html?q=abbr */
(function(){
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  let DATA=null, TECH=new Map(); // key: abbr/en/zh → abbr

  const xref = fetch('../tech/data/tech.json')
    .then(r=>r.ok?r.json():null).then(d=>{ if(d&&Array.isArray(d.tech)) d.tech.forEach(t=>{ [t.abbr,t.en,t.zh].forEach(k=>{ if(k) TECH.set(k,t.abbr); }); }); }).catch(()=>{});

  const boot = fetch('data/clinical.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); });
  Promise.all([boot, xref]).then(([d])=>{ DATA=d; render(); })
    .catch(e=>{ $('#cards').innerHTML='<div class="err">無法載入 <b>data/clinical.json</b>（'+esc(e.message)+'）。請用本機伺服器（<code>python -m http.server</code>）或 GitHub Pages 網址開啟，勿用 file://。</div>'; });

  function strField(title, s){
    if(typeof s!=='string'||!s.trim()) return '';
    return '<div class="field"><div class="k">'+title+'</div><div class="v">'+md(s)+'</div></div>';
  }
  function methodField(methods){
    if(!Array.isArray(methods)||!methods.length) return '';
    const items=methods.map(m=> TECH.has(m)
      ? '<a class="xref" href="../tech/index.html?q='+encodeURIComponent(TECH.get(m))+'" title="到技術大綱查 '+esc(m)+'">'+esc(m)+'</a>'
      : esc(m)).join('、');
    return '<div class="field"><div class="k">常用技術</div><div class="v tags">'+items+'</div></div>';
  }

  function clinicalCard(d){
    const card=document.createElement('article');
    card.className='card'; card.id=encodeURIComponent(d.name);
    const fields=
      strField('檢測標的', d.target)+
      methodField(d.method)+
      strField('臨床意義', d.clinical)+
      strField('結果判讀', d.interpret)+
      strField('常見陷阱／鑑別', d.pitfall);
    const hot=(d.hot||[]).map(h=>'<li>'+md(h)+'</li>').join('');
    const qa=(d.qa||[]).map(q=>'<tr><td class="yr">'+esc(q[0])+'</td><td>'+esc(q[1])+'</td></tr>').join('');
    card.innerHTML=
      '<div class="card-head"><span class="abbr">'+esc(d.name)+'</span><span class="en">'+esc(d.en)+'</span>'+
      '<span class="zh">'+esc(d.zh)+'</span><span class="stars">'+'★'.repeat(d.stars||0)+'</span><span class="arrow">▼</span></div>'+
      '<div class="card-body">'+fields+
      '<div class="hot"><div class="k">⭐ 高頻考點</div><ol>'+hot+'</ol>'+
      '<table class="qa"><tbody>'+qa+'</tbody></table></div></div>';
    card.querySelector('.card-head').onclick=()=>card.classList.toggle('collapsed');
    return card;
  }

  function render(){
    $('#sub').textContent='科目：'+DATA.meta.subject+'｜共 '+DATA.clinical.length+' 張臨床卡';
    const wrap=$('#cards'); wrap.innerHTML='';
    const h1order=[...new Set(DATA.clinical.map(c=>c.h1))];
    h1order.forEach(h1=>{
      const g=document.createElement('section');
      g.className='group'; g.dataset.group=h1;
      const flow=(DATA.flows&&DATA.flows[h1]||[]).map(l=>'<div class="ln">'+md(l)+'</div>').join('');
      g.innerHTML='<div class="group-head"><span class="arrow">▼</span><span>'+esc(h1)+'</span></div>'+
        '<div class="group-body">'+(flow?'<div class="flow"><h3>🧭 流程</h3>'+flow+'</div>':'')+'</div>';
      const body=g.querySelector('.group-body');
      g.querySelector('.group-head').onclick=()=>g.classList.toggle('collapsed');
      const cc=document.createElement('div'); cc.className='cards';
      DATA.clinical.filter(c=>c.h1===h1).forEach(c=>cc.appendChild(clinicalCard(c)));
      body.appendChild(cc);
      wrap.appendChild(g);
    });
    $('#search').addEventListener('input',applyFilter);
    $('#expandAll').onclick=()=>document.querySelectorAll('.card,.group').forEach(e=>e.classList.remove('collapsed'));
    $('#collapseAll').onclick=()=>document.querySelectorAll('.card,.group').forEach(e=>e.classList.add('collapsed'));
    const q=new URLSearchParams(location.search).get('q');
    if(q){ $('#search').value=q; }
    applyFilter();
  }

  function applyFilter(){
    const q=$('#search').value.trim().toLowerCase();
    let any=false;
    document.querySelectorAll('.group').forEach(g=>{
      let gHas=false;
      g.querySelectorAll('.card').forEach(card=>{
        const show=!q||card.textContent.toLowerCase().includes(q);
        card.style.display=show?'':'none';
        if(show){gHas=true;any=true;}
      });
      g.style.display=gHas?'':'none';
    });
    $('#nohit').style.display=any||!q?'none':'block';
  }
})();
```

- [ ] **Step 4: 語法檢查**

Run:
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學" && node --check clinical/assets/app.js && echo OK
```
Expected: 印出 `OK`。

- [ ] **Step 5: 啟伺服器手動驗收雙向互連**

Run:
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學" && python -m http.server 8000
```
驗收（瀏覽器）：
- 開 http://localhost:8000/clinical/index.html → BCR-ABL1 卡的「常用技術」中 `RT-qPCR` 顯示為連結（注意：`RT-qPCR` 需能對應到技術卡；若技術卡 abbr 為 `qPCR` 則 `RT-qPCR` 不會連結 → 見下方 Step 6 修正）。
- 從技術頁 qPCR 卡點 `BCR-ABL1` → 跳到臨床頁並自動帶入搜尋。
確認後 Ctrl-C。

- [ ] **Step 6: 對齊互連命名（讓種子卡確實互連）**

為使種子資料雙向連結成立，將 `tech/data/tech.json` 的 qPCR 卡 `applications` 已為 `["BCR-ABL1"]`（OK）；把 `clinical/data/clinical.json` BCR-ABL1 卡的 `method` 中與技術卡對應者改為與技術卡 `abbr` 一致的字串 `"qPCR"`（保留 `FISH` 為未連結純文字，待日後新增 FISH 技術卡）：

將 `"method": ["RT-qPCR", "FISH"]` 改為 `"method": ["qPCR", "FISH"]`。

Run 驗證仍通過：
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學" && node scripts/validate_clinical.js
```
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學"
git add clinical/index.html clinical/assets/app.js clinical/data/clinical.json
git commit -m "feat(clinical): 臨床應用前端與 method→tech 雙向互連對齊

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 總入口頁與 GitHub Actions 驗證

**Files:**
- Create: `index.html`
- Create: `assets/home.css`
- Create: `.github/workflows/validate.yml`

**Interfaces:**
- Consumes: `tech/index.html`、`clinical/index.html`（連結目標）；`scripts/validate_*.js`（CI 呼叫）。
- Produces: 根目錄入口（GitHub Pages 來源）與 push/PR 自動驗證。

- [ ] **Step 1: 寫 `index.html`（總入口）**

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'">
<meta name="referrer" content="no-referrer">
<title>醫學分子檢驗學大綱｜總入口</title>
<link rel="stylesheet" href="assets/home.css?v=20260624.1">
</head>
<body>
<div class="wrap">
  <div class="kicker">醫事檢驗師國家考試</div>
  <h1>醫學分子檢驗學 ‧ 複習大綱</h1>
  <div class="sub">兩套互連的資料驅動大綱：依技術或臨床應用查詢，點擊可互相跳轉。</div>
  <div class="grid">
    <a class="tile tech" href="tech/index.html">
      <span class="badge">技術</span>
      <h2>分子檢驗技術大綱</h2>
      <p>核酸萃取／擴增／分離／雜交／定序／原位／晶片，含原理、操作流程、結果判讀、品管排錯、技術鑑別與高頻考點。</p>
      <div class="meta">技術原理 ‧ 進入 →</div>
    </a>
    <a class="tile clinical" href="clinical/index.html">
      <span class="badge">臨床應用</span>
      <h2>分子檢驗臨床應用大綱</h2>
      <p>遺傳病／腫瘤分子標記／感染症分子診斷／藥物基因體學／產前篩檢，含檢測標的、常用技術、臨床意義、判讀與陷阱。</p>
      <div class="meta">臨床應用 ‧ 進入 →</div>
    </a>
  </div>
  <footer>
    資料維護見各模組 <code>data/*.json</code> 與 README。國考題引用以 moex-exam 查得（考選部醫檢師考題）。
  </footer>
</div>
</body>
</html>
```

- [ ] **Step 2: 寫 `assets/home.css`**

```css
:root{--bg:#0f1115;--ink:#e8eaed;--mut:#9aa3b2;--tech:#4ea1ff;--clin:#7ee0a3;--line:#272b34}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 50% -10%,#16202e,#0f1115);color:var(--ink);font-family:"Segoe UI","Microsoft JhengHei",system-ui,sans-serif;line-height:1.6;min-height:100vh}
.wrap{max-width:900px;margin:0 auto;padding:60px 20px}
.kicker{color:var(--mut);letter-spacing:.2em;font-size:.8rem}
h1{font-size:2rem;margin:.2em 0}
.sub{color:var(--mut);margin-bottom:28px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:680px){.grid{grid-template-columns:1fr}}
.tile{display:block;text-decoration:none;color:var(--ink);background:#171a21;border:1px solid var(--line);border-radius:16px;padding:20px;transition:transform .12s,border-color .12s}
.tile:hover{transform:translateY(-3px)}
.tile.tech:hover{border-color:var(--tech)}
.tile.clinical:hover{border-color:var(--clin)}
.badge{display:inline-block;font-weight:700;border-radius:8px;padding:3px 10px;color:#04101f}
.tile.tech .badge{background:var(--tech)}
.tile.clinical .badge{background:var(--clin)}
.tile h2{margin:10px 0 6px;font-size:1.2rem}
.tile p{color:var(--mut);font-size:.92rem}
.tile .meta{color:var(--ink);font-weight:600;margin-top:8px}
footer{color:var(--mut);font-size:.82rem;margin-top:30px;border-top:1px solid var(--line);padding-top:14px}
code{background:#0c0e13;padding:1px 5px;border-radius:5px}
```

- [ ] **Step 3: 寫 `.github/workflows/validate.yml`**

```yaml
name: Validate data

on:
  push:
    paths:
      - '**/data/**'
      - 'schema/**'
      - 'scripts/**'
      - '.github/workflows/validate.yml'
  pull_request:
    paths:
      - '**/data/**'
      - 'schema/**'
      - 'scripts/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: 驗證技術資料
        run: node scripts/validate_tech.js
      - name: 驗證臨床應用資料
        run: node scripts/validate_clinical.js
```

- [ ] **Step 4: 跑完整驗證（兩支驗證器）確認綠燈**

Run:
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學" && npm run validate
```
Expected: 兩支都印 `✓ 通過驗證`，exit 0。

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學"
git add index.html assets/home.css .github/workflows/validate.yml
git commit -m "feat: 總入口頁與 GitHub Actions 自動驗證

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 以 MCP 工作流擴充種子內容（端到端驗證 qa 來源）

此任務驗證「moex-exam 國考題為骨幹」的內容工作流確實可行，並把種子卡的 `qa` 佔位字串換成真實國考題。屬內容/編輯性質，產出後仍以驗證器把關。

**Files:**
- Modify: `tech/data/tech.json`、`clinical/data/clinical.json`

**Interfaces:**
- Consumes: `moex-exam` MCP（`list_papers` 先確認科目正確名稱，`search_questions`/`get_paper` 取題）、Tavily/PubMed（補素材與 PMID）。

- [ ] **Step 1: 確認國考科目在網站上的正確名稱**

用 `moex-exam` 的 `list_papers`（yearStart 例如 110、yearEnd 115）列出醫檢師各科考卷，找出「分子」相關科目的正確 `subjectName`（例如「醫學分子（生物學與）檢驗學」實際字串）。記錄其子字串（如 `分子`）。

- [ ] **Step 2: 為 qPCR 卡查真實考題**

用 `search_questions`，`keyword` 例如 `即時定量 PCR` 或 `Ct`，`subject` 用 Step 1 的子字串，`yearStart/yearEnd` 涵蓋近年。挑 1–3 題，把 `tech/data/tech.json` qPCR 卡的 `qa` 佔位 `["範例 第N題", ...]` 換成真實 `["1XX年 第N題","題幹重點"]`。

- [ ] **Step 3: 為 BCR-ABL1 卡查真實考題**

用 `search_questions`，`keyword` 例如 `BCR-ABL` 或 `慢性骨髓性白血病`，替換 `clinical/data/clinical.json` 該卡的 `qa` 佔位。

- [ ] **Step 4: （可選）以 Tavily/PubMed 補強內容依據**

若需補 `principle`/`interpret` 的權威數值，Tavily 蒐料、PubMed 取 PMID，更新 `meta.source`（如標註依 ELN/NCCN 指引與 PMID）。

- [ ] **Step 5: 驗證並 Commit**

Run:
```bash
cd "/c/Users/User/Desktop/醫學分子檢驗學" && npm run validate
```
Expected: PASS。

```bash
git add tech/data/tech.json clinical/data/clinical.json
git commit -m "content: 以 moex-exam 查得真實國考題替換種子卡 qa

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage（對照 design.md 各節）：**
- §2 兩模組 tech/clinical → Task 2–6 ✅
- §3 卡片資料形狀（tech 11 欄、clinical 8 欄含 qc/interpret）→ Task 2/3 schema+validator、Task 4/5 渲染 ✅
- §4 模組互連（applications↔method 名稱比對）→ Task 4 Step 3、Task 5 Step 3/6 ✅
- §5 MCP 工作流（moex-exam 骨幹 + Tavily + PubMed）→ Task 1（MCP 接好）、Task 7（實際取題）✅
- §6 驗證與基建（schema/validator/Action/HTTP 預覽）→ Task 2/3/6 ✅
- §7 YAGNI（不做離線/DOCX/圖示/第三模組）→ 計畫未含這些 ✅
- §8 資料夾結構 → File Structure 一致 ✅

**2. Placeholder scan：** 每個 step 皆含實際程式碼或可執行指令；Task 7 的「種子 qa」佔位是**刻意的內容待辦**並由該任務替換，非計畫缺漏。無 TBD/「類似 Task N」。

**3. Type consistency：**
- tech 欄位在 schema、validator（`REQUIRED`）、app.js 渲染三處一致：`h1,abbr,en,zh,stars,principle,steps,keypoints,interpret,qc,pros_cons,compare,applications,hot,qa`。
- clinical 欄位三處一致：`h1,name,en,zh,stars,target,method,clinical,interpret,pitfall,hot,qa`。
- 互連：tech `applications:string[]` 比對 clinical `name`；clinical `method:string[]` 比對 tech `abbr/en/zh`。Task 5 Step 6 已對齊種子資料命名（`qPCR`）使連結成立。
- `meta.groups`（非 media 的 `media_types`）在 schema 與兩驗證器一致。
```
