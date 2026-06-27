# 🧬 醫事檢驗師國考複習大綱（分子檢驗 ＋ 臨床鏡檢）

> 醫事檢驗師國家考試合卷「**醫學分子檢驗學與臨床鏡檢學（包括寄生蟲學）**」的免費、開源、資料驅動複習網站。
> 每張卡片都掛**真實近年國考題（109–113 年）**，並對考選部官方標準答案卷核對。

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
<!-- 推上 GitHub 後把 <OWNER>/<REPO> 換成你的，下面這顆 CI 徽章就會亮 -->
[![Validate](https://github.com/<OWNER>/<REPO>/actions/workflows/validate.yml/badge.svg)](https://github.com/<OWNER>/<REPO>/actions/workflows/validate.yml)

**🔗 線上看：** `https://<你的帳號>.github.io/<repo>/` ｜ **共 71 張卡**（技術 17 ＋ 臨床 24 ＋ 鏡檢 30）

---

## ✨ 特色

- 📚 **真實國考題驅動** — 每張卡至少一筆歷屆考題與考點摘要，皆對得到考選部官方題號，非憑空撰寫。
- 🔗 **技術 ↔ 臨床雙向互連** — 臨床卡的「常用技術」點一下跳到原理卡；技術卡的「臨床應用」反向跳回。
- ⭐ **只看高頻** — 一鍵濾出極高頻（★★★）卡片，考前衝刺用。
- 🔆 **即時搜尋＋高亮**、記住展開狀態、Enter 捲到命中、深色護眼、**手機可讀**。
- 🛠 **資料驅動** — 只編 `data/*.json`，HTML 由 `app.js` 自動渲染；零相依純 Node 驗證器＋GitHub Actions 把關。

## 📦 三個模組

| 模組 | 內容 | 入口 |
|------|------|------|
| 🧬 **技術 tech** | 核酸萃取／擴增／分離／雜交／定序／原位／晶片／甲基化／品管與實驗室設計，含原理、流程、判讀、品管排錯、技術鑑別、考點 | `tech/index.html` |
| 🏥 **臨床 clinical** | 遺傳病／腫瘤分子標記／感染症分子診斷／藥物基因體學／產前篩檢，含檢測標的、常用技術、臨床意義、判讀、陷阱、考點 | `clinical/index.html` |
| 🔬 **鏡檢 microscopy** | 顯微鏡原理／尿液／糞便／痰液／腦脊髓液／穿刺液／滑膜液／精液／懷孕試驗／醫用寄生蟲（依官方 11 章），含外觀、化學、鏡檢所見、臨床意義、鑑別比較、考點 | `microscopy/index.html` |

## 🚀 本機預覽

需經 HTTP 開啟（瀏覽器禁止 `file://` 載入 JSON）：

```bash
python -m http.server   # 開 http://localhost:8000/
```

或部署到 **GitHub Pages**（Settings → Pages → Deploy from branch → `/root`）即有線上網址。

## ✍️ 如何貢獻 / 補卡

只編輯 `tech/data/tech.json`、`clinical/data/clinical.json` 與 `microscopy/data/microscopy.json`，不必寫 HTML：

- `**重點**` 會自動變粗體（不要手寫 HTML 標籤）；`stars` 為 1–3。
- `qa` 格式 `["113年 第46題", "考點摘要"]`（鏡檢同年兩梯次以 `["113年第一次 第18題", …]` 區分），至少一筆，且須為真實國考題。
- 分子互連：技術卡 `applications[]` 對到臨床卡 `name`；臨床卡 `method[]` 對到技術卡的 `abbr/en/zh`，名稱對齊才會自動生成連結。
- 鏡檢為單軸模組（依官方 11 章分群、無跨模組互連）；欄位 `findings` 必填，`appearance/chemistry/interpret/pitfall/compare` 選填。

歡迎 PR！送出前請跑驗證：

```bash
npm run validate          # 結構＋欄位＋互連（互連未解析僅警告）
npm run validate:strict   # 互連未解析改為錯誤（CI 採此模式）
```

> Windows / PowerShell：若 `npm run …` 被執行原則擋下（`npm.ps1` cannot be loaded），改用 `npm.cmd run validate`。

## 🧱 技術說明

- 純靜態、**零執行期相依**；驗證器與 CI 僅需 Node。
- 各頁含嚴格 **CSP**；`assets/enhance.js` 為疊加式增強（搜尋高亮、只看高頻、收合記憶），不改動各模組 `app.js`。
- `tools/moex-exam-mcp/`：查考選部歷屆題庫的 MCP server（補 `qa` 用，選用）。

## 📄 授權

- **程式碼**：[MIT](LICENSE)。
- **內容**：`qa` 為歷屆「醫事檢驗師」國考考古題之重點改寫摘要，標注考選部年度與題號為出處；題目著作權屬**考選部**，本專案僅作非營利之考試準備與教育用途。
