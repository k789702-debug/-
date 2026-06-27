# microscopy 模組設計（臨床鏡檢學，含寄生蟲學）

- 日期：2026-06-27
- 範圍：在既有 `醫學分子檢驗學` repo 內，新增第三個模組 `microscopy/`（與分子同一張國考合卷，`subject=鏡檢`）。
- 依循 skill：`exam-review-site-builder`（資料驅動、qa 必來自真實國考題、零相依驗證器 + `--strict-links`、依 `meta.groups` 排序、cache-busting）。
- 現況基準：tech 17 + clinical 24 = 41 卡，`validate:strict` 綠燈；moex-exam MCP 可用。

## 1. 模組形狀（單軸）

獨立、依官方 11 章分群的模組，重用共用基建、**無跨模組互連**：

```
microscopy/
├── index.html              掛 cards.css + enhance.css + 自己的 app.js + enhance.js
├── assets/app.js           渲染（port 自 clinical，移除 xref/method 連結）
└── data/microscopy.json    ← 作者只編這個
schema/microscopy.schema.json
scripts/validate_microscopy.js
```

- 重用 `assets/cards.css`、`assets/enhance.css`、`assets/enhance.js`（搜尋高亮／只看極高頻 ★★★／收合記憶／a11y／?q= 深連結）。
- **不** 設 `applications[]`/`method[]`/xref/`methodField`（鏡檢無技術↔應用雙軸）。

## 2. meta.groups（官方 11 章，全列、依序渲染）

```json
["顯微鏡原理與操作","尿液常規檢查","糞便常規檢查","痰液一般鏡檢",
 "腦脊髓液檢查","穿刺液檢查","滑膜液檢查","精液檢查",
 "懷孕試驗","醫用寄生蟲檢查","綜合性試題"]
```

- app.js 依 `meta.groups` 排序；**只渲染有卡的群**，空群驗證器 warn（比照分子，不強制 flows===groups）。
- 第（十一）綜合性試題保留為群：放跨檢體卡（如「各體液參考值/總蛋白比較」compare 卡）。
- `flows` 選填、可部分覆蓋（部分章給流程圖，如糞便濃縮染色、尿液採檢→理學→化學→沉渣）。

## 3. 卡片粒度（混合式，依題量）

- 預設單位＝檢體章；題量密集處才切子卡。
- 尿液：理學 / 化學試紙 / 沉渣-圓柱 / 沉渣-結晶 / 沉渣-細胞與其他（數張，依真題密度）。
- 寄生蟲：屬/類為卡 + `compare` 鑑別表（瘧原蟲一卡含 4 種；腸道原蟲、線蟲、吸蟲、絛蟲分卡）。
- 小章（痰液/滑膜液/懷孕/顯微鏡原理）：各約 1 張。
- **鐵則**：只有查得到真題的主題才開卡；查無真題不硬開，併入鄰近卡或擱置回報。

## 4. 卡片欄位（貼合鏡檢領域）

| 欄位 | 必填 | 說明 / 渲染 |
|------|------|------|
| `h1` | ✓ | 群名，須在 meta.groups |
| `name` | ✓ | 卡名，唯一 |
| `en` | ✓ | 英文/學名 |
| `zh` | ✓ | 中文全名/說明 |
| `stars` | ✓ | 1–3 整數 |
| `findings` | ✓ | 🔬 鏡檢所見（形態特徵）|
| `clinical` | ✓ | 臨床意義 |
| `hot` | ✓ | ⭐ 高頻考點（非空字串陣列）|
| `qa` | ✓ | 國考題引用（見 §5）|
| `appearance` | — | 外觀/理學（顏色、濁度、黏稠、凝固）|
| `chemistry` | — | 化學/生化（試紙、蛋白、葡萄糖、LD、ADA…）|
| `interpret` | — | 判讀/計算/鑑別（如 CSF WBC 校正公式）|
| `pitfall` | — | 陷阱/久置變化/鑑別 |
| `compare` | — | 鑑別表（≥2 列、表頭≥2 欄、列寬一致；首欄 `md()` 粗體）|

- 渲染序：appearance → chemistry → 🔬findings → clinical → interpret → pitfall → compare 表 → ⭐hot → qa 表。
- `**重點**` → 粗體（render 時轉換，作者勿寫 HTML；`**` 須成對）。
- 寬表（compare）以 `.table-scroll` 包裹供手機橫向捲動。

## 5. qa 規則（含梯次）

- 每張卡 ≥1 筆，**一律來自 moex-exam 查得的真實國考題**，嚴禁編造。
- 格式：`["113年第一次 第18題","考點＋官方答案摘要"]`；梯次可省（單梯次題不需）。
- microscopy 驗證器 regex：`/^\d{2,3}年(第[一二]次)?\s+第\d+題$/`。
- 摘要須帶「考點 + 答案」，不確定答案時描述性書寫並先查證，勿臆斷選項。
- **梯次對照**：建置前先核對 `sessionCode`（如 113020 / 113090）↔ 第一次/第二次，方法為讀官方 PDF 標頭確認（不臆測），結果寫入 `meta.source`。分子模組維持原樣。

## 6. validate_microscopy.js（零相依，沿用硬化規則）

port 自 `scripts/validate_clinical.js`，調整：

- `FILE` → `microscopy/data/microscopy.json`。
- `REQUIRED = ['h1','name','en','zh','stars','findings','clinical','hot','qa']`。
- `ALLOWED = REQUIRED + ['appearance','chemistry','interpret','pitfall','compare']`（未知欄位視錯，等同 additionalProperties:false）。
- `REQ_STR = ['h1','name','en','zh','findings','clinical']`。
- `STR_FIELDS = ['appearance','chemistry','findings','clinical','interpret','pitfall']`（檢查 `**` 成對、HTML warn）。
- `QA_YEAR` 改為含梯次的 regex（見 §5）。
- `name` 唯一；`stars` 1–3；`hot` 非空字串陣列；`qa` ≥1 且格式正確。
- 群一致性：`flows` key ∈ meta.groups（error）；meta.groups 空群 → warn。
- **port `compare` 表檢查**（自 validate_tech.js：≥2 列、表頭≥2 欄、各列欄數＝表頭、cell `**` 成對）。
- 接受 `--strict-links` 旗標（本模組無跨連結 → 等同 no-op，保持 npm 鏈一致）。
- `package.json` 兩條鏈各追加 `node scripts/validate_microscopy.js`（`validate` 無旗標、`validate:strict` 帶 `--strict-links`）。

`schema/microscopy.schema.json`：copy clinical schema，改 required/properties/additionalProperties:false 對齊上述欄位（含 `compare` 為二維字串陣列）。

## 7. 前端 / 入口 / CI

- `microscopy/index.html`：port clinical，改 badge「鏡檢」、title、搜尋 placeholder（例：尿圓柱、瘧原蟲、滲出液、xanthochromia）、legend；nav 加「鏡檢」；連 `../assets/cards.css?v=`、`../assets/enhance.css?v=`、`assets/app.js?v=`、`../assets/enhance.js?v=`（bump `?v=`）；保留嚴格 CSP（connect-src 'self' 即足，只 fetch 自身 data）。
- `microscopy/assets/app.js`：port clinical，移除 `xref`/`TECH`/`methodField`；加 appearance/chemistry/findings/interpret/pitfall 欄位 render + `cmpTable`（port 自 tech app.js）；保留 meta.groups 排序、`fetch(..., {cache:'no-cache'})`、a11y（wireToggle/syncAllAria）、applyFilter、`.table-scroll`。
- 根 `index.html`：加第三格 tile「鏡檢」連 `microscopy/index.html`；文案兩套→三套；卡數更新。
- `tech/index.html`、`clinical/index.html`：nav 加「鏡檢」連結並 bump `?v=`。
- 共用資產（cards.css/enhance.*）若未改則不需 bump；新增/改動才 bump 各 index.html 的 `?v=`。
- CI（`.github/workflows/validate.yml`）經 `npm run validate:strict` 自動涵蓋新驗證器（paths glob 已含新模組）。

## 8. 建置順序（每章一循環）

- **步驟 0（scaffold + 種子）**：建 microscopy 骨架（schema/validator/app.js/index.html/根 tile/package.json/nav）+ 先做**尿液常規**首批卡作校驗種子 → `validate:strict` 綠 → commit。
- 之後一章一章：**尿液 → 寄生蟲（驗 compare/屬卡範式）→ CSF → 穿刺液 → 滑膜液 → 精液 → 糞便 → 痰液 → 懷孕 → 顯微鏡原理 → 綜合**。
- 每章節奏：moex-exam 廣度挖題 → 決定開哪些卡（只開有真題者，記錄略過）→ 寫卡 → `validate:strict` 綠 → commit（`content(microscopy): 新增「<章>」…`）→ 更新 `.superpowers/sdd/progress.md`。
- 預覽走 HTTP（`python -m http.server`），不用 file://；headless 驗證以 DOM 狀態斷言（rAF-gated UI 在隱藏分頁不觸發）。

## 9. 驗收準則

- `npm run validate:strict` 綠燈（含 microscopy）。
- 每張卡 ≥1 筆真實 moex-exam qa，格式合規（含梯次）。
- 群依官方章節序渲染；卡名唯一；compare 表結構正確。
- 三模組總入口可互達；返訪者見最新內容（no-cache + bumped ?v=）。
