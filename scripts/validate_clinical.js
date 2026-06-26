#!/usr/bin/env node
/* clinical/data/clinical.json 驗證器（零相依）。執行： node scripts/validate_clinical.js 失敗 exit 1。 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'clinical', 'data', 'clinical.json');
const STRICT_LINKS = process.argv.includes('--strict-links');
const REQUIRED = ['h1','name','en','zh','stars','target','method','clinical','hot','qa'];
// 對應 schema/clinical.schema.json 的 properties；多餘欄位視為錯誤（等同 additionalProperties:false）
const ALLOWED = new Set(['h1','name','en','zh','stars','target','method','clinical','interpret','pitfall','hot','qa']);
const REQ_STR = ['h1','name','en','zh','target','clinical']; // required 且必須為非空字串
const STR_FIELDS = ['target','clinical','interpret','pitfall'];
const QA_YEAR = /^\d{2,3}年\s+第\d+題$/; // 例：「113年 第46題」
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
  if ('method' in c) {
    if (!Array.isArray(c.method) || c.method.length === 0) errors.push(`${id}: method 必須為非空陣列`);
    else c.method.forEach((m, j) => { if (typeof m !== 'string') errors.push(`${id}: method[${j}] 必須為字串`); });
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
      if (typeof q[0] !== 'string' || !QA_YEAR.test(q[0])) errors.push(`${id}: qa[${j}][0] 應為「民國年 第N題」格式（例「113年 第46題」），目前="${q[0]}"`);
      if (typeof q[1] !== 'string' || !q[1].trim()) errors.push(`${id}: qa[${j}][1] 說明必須為非空字串`);
    });
  } else if ('qa' in c) errors.push(`${id}: qa 必須為陣列`);
});

// 群組一致性：flows 的 key 必須是合法群（防 typo）；meta.groups 列了卻無卡 → 提醒（flows 可只覆蓋部分群，不強制相等）。
flowKeys.forEach(k => { if (!groupSet.has(k)) errors.push(`flows 的 "${k}" 不在 meta.groups（請對齊群名）`); });
const usedClinGroups = new Set((data.clinical || []).map(c => c.h1));
groupSet.forEach(g => { if (!usedClinGroups.has(g)) warns.push(`meta.groups 的 "${g}" 沒有任何卡片`); });

// 跨模組連結解析（warn）：method 應對應某張技術卡的 abbr/en/zh，否則前端不會產生連結。
// 技術資料缺失或無法解析時靜默略過（保持零相依、單檔可獨立驗證）。
try {
  const td = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tech', 'data', 'tech.json'), 'utf8'));
  const keys = new Set((td.tech || []).flatMap(t => [t.abbr, t.en, t.zh].filter(Boolean)));
  (data.clinical || []).forEach((c, i) => {
    (c.method || []).forEach(m => {
      if (!keys.has(m)) (STRICT_LINKS ? errors : warns).push(`clinical[${i}] ${c.name || ''}: method "${m}" 在 tech 找不到對應卡，前端不會連結`);
    });
  });
} catch (e) { /* 跨檔檢查為選用，技術資料不存在時略過 */ }

console.log(`檢查 ${(data.clinical||[]).length} 張臨床卡、${groupSet.size} 應用群、${flowKeys.size} 分流${STRICT_LINKS ? '（--strict-links）' : ''}。`);
warns.forEach(w => console.log('⚠ ' + w));
if (errors.length) { console.error(`\n✗ 發現 ${errors.length} 個錯誤：`); errors.forEach(e => console.error('  - ' + e)); process.exit(1); }
console.log(`✓ 通過驗證${warns.length ? '（含 ' + warns.length + ' 項提醒）' : ''}。`);
