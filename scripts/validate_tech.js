#!/usr/bin/env node
/* tech/data/tech.json 驗證器（零相依，供本機與 GitHub Actions 使用）
   執行： node scripts/validate_tech.js  失敗時 exit 1。 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'tech', 'data', 'tech.json');
const STRICT_LINKS = process.argv.includes('--strict-links');
const REQUIRED = ['h1','abbr','en','zh','stars','principle','hot','qa'];
// 對應 schema/tech.schema.json 的 properties；多餘欄位視為錯誤（等同 additionalProperties:false）
const ALLOWED = new Set(['h1','abbr','en','zh','stars','principle','steps','keypoints','interpret','qc','pros_cons','compare','applications','hot','qa']);
const REQ_STR = ['h1','abbr','en','zh','principle']; // required 且必須為非空字串
const STR_FIELDS = ['principle','interpret'];
const STRLIST_FIELDS = ['steps','keypoints','applications'];
const QA_YEAR = /^\d{2,3}年\s+第\d+題$/; // 例：「113年 第46題」
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
  if (typeof t !== 'object' || t === null || Array.isArray(t)) { errors.push(`${id}: 卡片必須為物件`); return; }
  REQUIRED.forEach(f => { if (!(f in t)) errors.push(`${id}: 缺少欄位 "${f}"`); });
  Object.keys(t).forEach(k => { if (!ALLOWED.has(k)) errors.push(`${id}: 不允許的欄位 "${k}"（請對照 schema）`); });
  REQ_STR.forEach(f => { if (f in t && (typeof t[f] !== 'string' || !t[f].trim())) errors.push(`${id}: 欄位 "${f}" 必須為非空字串`); });
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
    else t.qc.forEach((r, j) => {
      if (!Array.isArray(r) || r.length !== 3) errors.push(`${id}: qc[${j}] 必須為 ["現象","假陽/假陰·原因","QC對策"]`);
      else r.forEach((cell, k) => { if (typeof cell === 'string' && !boldBalanced(cell)) errors.push(`${id}: qc[${j}][${k}] 的 ** 未成對`); });
    });
  }
  if ('pros_cons' in t) {
    const pc = t.pros_cons;
    if (typeof pc !== 'object' || Array.isArray(pc) || pc === null) errors.push(`${id}: pros_cons 必須為物件 {pros,cons}`);
    else ['pros','cons'].forEach(k => {
      if (k in pc && !Array.isArray(pc[k])) errors.push(`${id}: pros_cons.${k} 必須為陣列`);
      else if (Array.isArray(pc[k])) pc[k].forEach((s, j) => { if (typeof s === 'string' && !boldBalanced(s)) errors.push(`${id}: pros_cons.${k}[${j}] 的 ** 未成對`); });
    });
  }
  if ('compare' in t) {
    if (!Array.isArray(t.compare)) errors.push(`${id}: compare 必須為陣列`);
    else {
      const w = (t.compare[0] || []).length;
      if (t.compare.length < 2) errors.push(`${id}: compare 至少需表頭＋一列（≥2 列）`);
      if (w < 2) errors.push(`${id}: compare 表頭至少 2 欄`);
      t.compare.forEach((r, j) => {
        if (!Array.isArray(r)) { errors.push(`${id}: compare[${j}] 必須為陣列`); return; }
        if (r.length !== w) errors.push(`${id}: compare[${j}] 欄數(${r.length}) 與表頭(${w}) 不符`);
        r.forEach((cell, k) => { if (typeof cell === 'string' && !boldBalanced(cell)) errors.push(`${id}: compare[${j}][${k}] 的 ** 未成對`); });
      });
    }
  }
  if ('hot' in t && (!Array.isArray(t.hot) || t.hot.length === 0)) errors.push(`${id}: hot 必須為非空陣列（至少一條高頻考點）`);
  (Array.isArray(t.hot) ? t.hot : []).forEach((h, j) => {
    if (typeof h !== 'string') errors.push(`${id}: hot[${j}] 必須為字串`);
    else if (!boldBalanced(h)) errors.push(`${id}: hot[${j}] 的 ** 未成對`);
  });
  if (Array.isArray(t.qa)) {
    if (t.qa.length === 0) errors.push(`${id}: qa 不可為空（國考題引用是骨幹，至少一筆）`);
    t.qa.forEach((q, j) => {
      if (!Array.isArray(q) || q.length !== 2) { errors.push(`${id}: qa[${j}] 必須為 ["年度題號","說明"]`); return; }
      if (typeof q[0] !== 'string' || !QA_YEAR.test(q[0])) errors.push(`${id}: qa[${j}][0] 應為「民國年 第N題」格式（例「113年 第46題」），目前="${q[0]}"`);
      if (typeof q[1] !== 'string' || !q[1].trim()) errors.push(`${id}: qa[${j}][1] 說明必須為非空字串`);
    });
  } else if ('qa' in t) errors.push(`${id}: qa 必須為陣列`);
});

// 群組一致性：flows 的 key 必須是合法群（防 typo）；meta.groups 列了卻無卡 → 提醒（flows 可只覆蓋部分群，不強制相等）。
flowKeys.forEach(k => { if (!groupSet.has(k)) errors.push(`flows 的 "${k}" 不在 meta.groups（請對齊群名）`); });
const usedTechGroups = new Set((data.tech || []).map(t => t.h1));
groupSet.forEach(g => { if (!usedTechGroups.has(g)) warns.push(`meta.groups 的 "${g}" 沒有任何卡片`); });

// 跨模組連結解析（warn）：applications 應對應某張臨床卡 name，否則前端不會產生連結。
// 臨床資料缺失或無法解析時靜默略過（保持零相依、單檔可獨立驗證）。
try {
  const cd = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'clinical', 'data', 'clinical.json'), 'utf8'));
  const names = new Set((cd.clinical || []).map(c => c.name));
  (data.tech || []).forEach((t, i) => {
    (t.applications || []).forEach(a => {
      if (!names.has(a)) (STRICT_LINKS ? errors : warns).push(`tech[${i}] ${t.abbr || ''}: applications "${a}" 在 clinical 找不到對應卡，前端不會連結`);
    });
  });
} catch (e) { /* 跨檔檢查為選用，臨床資料不存在時略過 */ }

console.log(`檢查 ${(data.tech||[]).length} 張技術卡、${groupSet.size} 技術群、${flowKeys.size} 分流${STRICT_LINKS ? '（--strict-links）' : ''}。`);
warns.forEach(w => console.log('⚠ ' + w));
if (errors.length) { console.error(`\n✗ 發現 ${errors.length} 個錯誤：`); errors.forEach(e => console.error('  - ' + e)); process.exit(1); }
console.log(`✓ 通過驗證${warns.length ? '（含 ' + warns.length + ' 項提醒）' : ''}。`);
