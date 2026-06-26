# 醫學分子檢驗學複習網站 — 設計文件

- 日期：2026-06-24
- 狀態：設計核可，待撰寫實作計畫
- 參考專案：`C:\Users\User\Desktop\培養基\Microbiology`（資料驅動國考複習網站）

## 1. 目標與定位

醫事檢驗師國家考試「**醫學分子檢驗學**」複習網站。沿用 Microbiology 專案的
**資料驅動**精神：只編輯 `data/*.json`，HTML 自動渲染；附零相依 Node 驗證器與
GitHub Action 自動驗證。

與 Microbiology 的本質差異：微生物學以「實體」（細菌/真菌/培養基）分類，
分子檢驗則以「**技術方法 + 臨床應用**」為主軸。因此模組切法不同，但工程形狀相同。

## 2. 模組決策

兩個互相連結的模組（複製 Microbiology 細菌↔培養基的互連模式）：

| 模組 | 內容 | 入口 |
|------|------|------|
| 🧬 **tech** 技術 | 一張卡 = 一個技術（核酸萃取/擴增/分離/雜交/定序/原位/晶片…），含原理、流程、判讀、品管排錯、優缺點、技術鑑別、考點 | `tech/index.html` |
| 🏥 **clinical** 臨床應用 | 一張卡 = 一個檢測項目/疾病（遺傳病/腫瘤分子標記/感染症分子診斷/藥物基因體學/產前篩檢），含檢測標的、常用技術、臨床意義、判讀、陷阱、考點 | `clinical/index.html` |

**不另立「基礎分子生物學」模組**（YAGNI）：基礎概念需要時融入技術卡的 `principle` 欄。

## 3. 卡片資料形狀

### 3.1 技術卡（tech.json → `tech[]`）

```jsonc
{
  "abbr": "qPCR", "en": "Real-time quantitative PCR", "zh": "即時定量PCR",
  "h1": "核酸擴增",          // 技術群（同群收在一起）
  "stars": 3,               // 考頻 1–3（⭐常見/⭐⭐高頻/⭐⭐⭐極高頻）
  "principle": "**重點**自動粗體；必要時在此帶入基礎分生概念",
  "steps": ["操作流程，條列"],
  "keypoints": ["關鍵試劑/參數，如 Taq、引子、探針、Tm、內控"],
  "interpret": "結果判讀（純文字）：如 Ct<35 判陽性、熔解單峰=特異",
  "qc": [["現象/問題", "假陽 or 假陰 / 原因", "QC對策"]],  // 品管與排錯表
  "pros_cons": { "pros": ["..."], "cons": ["..."] },
  "compare": [["項目", "PCR", "qPCR", "dPCR"]],            // 與相近技術鑑別
  "applications": ["BCR-ABL1", "..."],   // 自動連到臨床應用卡（名稱比對）
  "hot": ["高頻考點"],
  "qa": [["112年 第30題", "題目說明"]]   // 歷年國考題引用
}
```

### 3.2 臨床應用卡（clinical.json → `clinical[]`）

```jsonc
{
  "name": "BCR-ABL1", "en": "...", "zh": "費城染色體 t(9;22)",
  "h1": "腫瘤分子標記",      // 應用群
  "stars": 3,
  "target": "檢測標的：基因/突變/病原核酸（如 t(9;22)、HBB、HPV16/18 E6E7）",
  "method": ["RT-qPCR", "FISH"],   // 自動連回技術卡（名稱比對）
  "clinical": "臨床意義：診斷/分型/預後/用藥/監測",
  "interpret": "結果判讀：陽性/陰性/數值代表什麼（如 MR3=0.1%IS）",
  "pitfall": "常見陷阱/鑑別：假陰、變異型、窗口期",
  "hot": ["高頻考點"],
  "qa": [["111年 第15題", "..."]]
}
```

**識別與骨幹欄位必填，補充欄位選填**：識別欄（h1、abbr/name、en、zh、stars）、骨幹欄（技術卡 principle/hot/qa；臨床卡 target/method/clinical/hot/qa）為必填，其中 `qa` 至少一筆（國考題引用是骨幹）；其餘補充欄（steps、keypoints、interpret、qc、pros_cons、compare、applications、pitfall）皆為選填，無資料的欄位不渲染，卡片密度因主題自動調整（沿用 Microbiology 慣例）。
文字慣例：`**重點**` 自動轉粗體，作者不寫 HTML 標籤；`stars` 1–3；
`qa` 格式 `["民國年 第N題", "說明"]`。

## 4. 模組互連

複製細菌↔培養基的雙向連結：

- 技術卡 `applications[]` → 臨床應用卡（以 `clinical[].name` 比對自動生成連結）
- 臨床應用卡 `method[]` → 技術卡（以 `tech[].abbr`/`en`/`zh` 比對自動生成連結）
- 連結由 `app.js` 在渲染時依名稱比對產生，作者不手寫 `<a>`。

## 5. 內容工作流（MCP）

實測比較後（2026-06-24，主題 BCR-ABL1 監測）採三段式：

1. **moex-exam MCP（骨幹，必做）** — 查醫檢師國考題庫填 `qa`。該 MCP 科目無關，
   以科目名稱子字串過濾，將 `subject` 指向「分子」即可查到本科考卷，程式不需修改。
2. **Tavily MCP（蒐料）** — 廣度檢索，快速取得可直接寫入 `principle`/`interpret`/`clinical`
   的具體素材（實測一次回傳即含 IS 國際標準、MMR/MR3=0.1%、EMR/DMR 分級等）。
3. **PubMed MCP（權威佐證）** — 補可引用的 PMID 作為內容依據。

`.mcp.json` 指向自 Microbiology 複製來的 `tools/moex-exam-mcp/`。

## 6. 驗證與基礎建設（沿用 Microbiology）

- `schema/{tech,clinical}.schema.json` — JSON Schema。
- `scripts/validate_tech.js`、`scripts/validate_clinical.js` — 零相依純 Node 驗證器。
- `.github/workflows/validate.yml` — push/PR 自動驗證。
- 本機預覽需經 HTTP（瀏覽器禁止 `file://` 載入 JSON）：`python -m http.server`。

## 7. 範圍與 YAGNI 決策

**納入：** 兩模組資料驅動網站、schema + 驗證器、互連、GitHub Action、moex-exam MCP。

**先不做（未來可增強）：**
- 離線單檔 HTML（`build_offline.js`）與 DOCX 列印（`build_docx.js`）——使用者較少用，
  內容做滿後要再加很快。
- 判讀圖示（SVG/圖片）——`interpret` 先純文字；國考多考文字判讀邏輯。
- 第三個「基礎分子生物學」模組。

## 8. 資料夾結構

```
醫學分子檢驗學/
├── index.html                  總入口（技術 / 臨床應用）
├── README.md
├── .gitignore
├── .mcp.json                   指向 moex-exam
├── tech/
│   ├── index.html
│   ├── assets/{style.css, app.js}
│   └── data/tech.json          ← 編這個
├── clinical/
│   ├── index.html
│   ├── assets/{style.css, app.js}
│   └── data/clinical.json      ← 編這個
├── schema/{tech,clinical}.schema.json
├── scripts/{validate_tech,validate_clinical}.js
├── tools/moex-exam-mcp/        （從 Microbiology 複製）
└── .github/workflows/validate.yml
```

## 9. 成功標準

- 編輯 `data/*.json` 即可新增/修改內容，不需碰 HTML。
- 驗證器對缺漏/格式錯誤回報明確；GitHub Action 綠燈。
- 兩模組互連可雙向跳轉。
- 每張卡的 `qa` 來自真實國考題（moex-exam 查得）。
- 內容依據可追溯（Tavily 素材 + PubMed PMID）。
