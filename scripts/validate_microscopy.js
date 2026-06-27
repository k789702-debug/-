#!/usr/bin/env node
/* microscopy/data/microscopy.json 驗證器（零相依）。執行： node scripts/validate_microscopy.js 失敗 exit 1。
   臨床鏡檢學為單軸模組（依檢體章分群），無跨模組互連；--strict-links 旗標保留以對齊 npm 鏈，等同 no-op。 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'microscopy', 'data', 'microscopy.json');
const STRICT_LINKS = process.argv.includes('--strict-links'); // 本模組無跨連結，僅為鏈一致而接受
const REQUIRED = ['h1','name','en','zh','stars','findings','clinical','hot','qa'];
// 對應 schema/microscopy.schema.json 的 properties；多餘欄位視為錯誤（等同 additionalProperties:false）
const ALLOWED = new Set(['h1','name','en','zh','stars','appearance','chemistry','findings','clinical','interpret','pitfall','compare','hot','qa']);
const REQ_STR = ['h1','name','en','zh','findings','clinical']; // required 且必須為非空字串
const STR_FIELDS = ['appearance','chemistry','findings','clinical','interpret','pitfall'];
const QA_YEAR = /^\d{2,3}年(第[一二]次)?\s+第\d+題$/; // 例：「113年第一次 第18題」或「110年 第6題」
const errors = [], warns = [];

let raw, data;
try { raw = fs.readFileSync(FILE, 'utf8'); } catch (e) { console.error('✗ 無法讀取 microscopy/data/microscopy.json'); process.exit(1); }
try { data = JSON.parse(raw); } catch (e) { console.error('✗ JSON 格式錯誤：' + e.message); process.exit(1); }

if (!data.meta || !Array.isArray(data.meta.groups)) errors.push('meta.groups 缺失或不是陣列');
if (!Array.isArray(data.microscopy) || data.microscopy.length === 0) errors.push('microscopy 缺失或為空');

const flowKeys = new Set(Object.keys(data.flows || {}));
const groupSet = new Set((data.meta && data.meta.groups) || []);
const seenName = new Map();
const qaRefSeen = new Map(); // qa[0]（年度梯次題號）→ 首見卡 index，偵測跨卡重複引用
const okStars = s => Number.isInteger(s) && s >= 1 && s <= 3;
const boldBalanced = s => (String(s).match(/\*\*/g) || []).length % 2 === 0;

(data.microscopy || []).forEach((c, i) => {
  const id = `microscopy[${i}] ${c.name || c.en || '(無名)'}`;
  if (typeof c !== 'object' || c === null || Array.isArray(c)) { errors.push(`${id}: 卡片必須為物件`); return; }
  REQUIRED.forEach(f => { if (!(f in c)) errors.push(`${id}: 缺少欄位 "${f}"`); });
  Object.keys(c).forEach(k => { if (!ALLOWED.has(k)) errors.push(`${id}: 不允許的欄位 "${k}"（請對照 schema）`); });
  REQ_STR.forEach(f => { if (f in c && (typeof c[f] !== 'string' || !c[f].trim())) errors.push(`${id}: 欄位 "${f}" 必須為非空字串`); });
  if ('stars' in c && !okStars(c.stars)) errors.push(`${id}: stars 必須 1–3，目前=${c.stars}`);
  if (c.name) { if (seenName.has(c.name)) errors.push(`${id}: name 重複`); else seenName.set(c.name, i); }
  if (c.h1 && groupSet.size && !groupSet.has(c.h1)) warns.push(`${id}: h1 "${c.h1}" 不在 meta.groups`);

  STR_FIELDS.forEach(f => {
    if (typeof c[f] === 'string') {
      if (!boldBalanced(c[f])) errors.push(`${id}: 欄位 "${f}" 的 ** 未成對`);
      if (/<[a-zA-Z/]/.test(c[f])) warns.push(`${id}: 欄位 "${f}" 含疑似 HTML 標籤`);
    }
  });
  // compare 鑑別表（選填）：≥2 列（表頭＋≥1）、表頭≥2 欄、各列欄數＝表頭、cell ** 成對
  if ('compare' in c) {
    if (!Array.isArray(c.compare)) errors.push(`${id}: compare 必須為陣列`);
    else {
      const w = (c.compare[0] || []).length;
      if (c.compare.length < 2) errors.push(`${id}: compare 至少需表頭＋一列（≥2 列）`);
      if (w < 2) errors.push(`${id}: compare 表頭至少 2 欄`);
      c.compare.forEach((r, j) => {
        if (!Array.isArray(r)) { errors.push(`${id}: compare[${j}] 必須為陣列`); return; }
        if (r.length !== w) errors.push(`${id}: compare[${j}] 欄數(${r.length}) 與表頭(${w}) 不符`);
        r.forEach((cell, k) => { if (typeof cell === 'string' && !boldBalanced(cell)) errors.push(`${id}: compare[${j}][${k}] 的 ** 未成對`); });
      });
    }
  }
  if ('hot' in c && (!Array.isArray(c.hot) || c.hot.length === 0)) errors.push(`${id}: hot 必須為非空陣列（至少一條高頻考點）`);
  (Array.isArray(c.hot) ? c.hot : []).forEach((h, j) => {
    if (typeof h !== 'string') errors.push(`${id}: hot[${j}] 必須為字串`);
    else if (!boldBalanced(h)) errors.push(`${id}: hot[${j}] 的 ** 未成對`);
  });
  if (Array.isArray(c.qa)) {
    if (c.qa.length === 0) errors.push(`${id}: qa 不可為空（國考題引用是骨幹，至少一筆）`);
    c.qa.forEach((q, j) => {
      if (!Array.isArray(q) || q.length !== 2) { errors.push(`${id}: qa[${j}] 必須為 ["年度題號","說明"]`); return; }
      if (typeof q[0] !== 'string' || !QA_YEAR.test(q[0])) errors.push(`${id}: qa[${j}][0] 應為「民國年[第一/二次] 第N題」格式（例「113年第一次 第18題」），目前="${q[0]}"`);
      else if (qaRefSeen.has(q[0])) warns.push(`${id}: qa「${q[0]}」與 microscopy[${qaRefSeen.get(q[0])}] 重複引用（如為刻意共用可忽略；常見為梯次標錯）`);
      else qaRefSeen.set(q[0], i);
      if (typeof q[1] !== 'string' || !q[1].trim()) errors.push(`${id}: qa[${j}][1] 說明必須為非空字串`);
    });
  } else if ('qa' in c) errors.push(`${id}: qa 必須為陣列`);
});

// 群組一致性：flows 的 key 必須是合法群（防 typo）；meta.groups 列了卻無卡 → 提醒（flows 可只覆蓋部分群，不強制相等）。
flowKeys.forEach(k => { if (!groupSet.has(k)) errors.push(`flows 的 "${k}" 不在 meta.groups（請對齊群名）`); });
const usedGroups = new Set((data.microscopy || []).map(c => c.h1));
groupSet.forEach(g => { if (!usedGroups.has(g)) warns.push(`meta.groups 的 "${g}" 沒有任何卡片`); });

console.log(`檢查 ${(data.microscopy||[]).length} 張鏡檢卡、${groupSet.size} 章群、${flowKeys.size} 分流${STRICT_LINKS ? '（--strict-links）' : ''}。`);
warns.forEach(w => console.log('⚠ ' + w));
if (errors.length) { console.error(`\n✗ 發現 ${errors.length} 個錯誤：`); errors.forEach(e => console.error('  - ' + e)); process.exit(1); }
console.log(`✓ 通過驗證${warns.length ? '（含 ' + warns.length + ' 項提醒）' : ''}。`);
