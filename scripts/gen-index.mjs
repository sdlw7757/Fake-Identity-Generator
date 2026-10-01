/**
 * 生成 src/data/index.js
 *
 * 扫描 src/data 目录下的国家数据模块，自动汇总为一个统一入口。
 * 这样新增国家数据文件后，只需运行 `node scripts/gen-index.mjs`（或 pnpm gen:index），
 * 无需手工维护导入列表。
 *
 * 用法： node scripts/gen-index.mjs
 */

import { readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = resolve(root, 'src', 'data');

// 这些不是国家数据模块
const EXCLUDE = new Set(['countryMeta', 'index']);

const files = readdirSync(dataDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => f.replace(/\.js$/, ''))
  .filter((name) => !EXCLUDE.has(name))
  .sort();

if (files.length === 0) {
  console.error('✗ src/data 下找不到任何国家数据模块');
  process.exit(1);
}

const lines = [];
lines.push('/**');
lines.push(' * 国家数据模块统一入口（本文件由 scripts/gen-index.mjs 自动生成，请勿手工编辑）');
lines.push(' *');
lines.push(` * 当前收录 ${files.length} 个国家 / 地区。`);
lines.push(' * 新增国家：在 src/data 下创建 xx.js 后运行 `pnpm gen:index`。');
lines.push(' */');
lines.push('');

// 个别国家的 ISO 代码是 JS 保留字（如印度 'in'），不能作为标识符。
// 这类文件改用默认导出（各数据文件均已提供 export default）。
const RESERVED = new Set([
  'in', 'do', 'if', 'for', 'new', 'try', 'var', 'let', 'const',
  'case', 'else', 'enum', 'null', 'this', 'true', 'false', 'void',
  'with', 'class', 'super', 'throw', 'while', 'break', 'catch',
  'export', 'import', 'return', 'switch', 'typeof', 'delete',
  'default', 'extends', 'finally', 'function', 'continue',
  'debugger', 'instanceof',
]);

for (const f of files) {
  // 具名导出的变量名尽可能与文件名一致
  if (RESERVED.has(f)) {
    lines.push(`import ${f}Data from './${f}.js';`);
  } else {
    lines.push(`import { ${f} } from './${f}.js';`);
  }
}

// 汇总到一个按文件名索引的对象，再由 datasets 依据各数据集的 code 字段重建。
// 注意：文件名与 ISO 代码未必一致（例如 uk.js 的 code 是 'GB'），
// 因此必须以数据集自身的 code 为准，否则英国会因键名不匹配而丢失。
lines.push('');
lines.push('/** 规范字段集合（与 README 中约定的数据模块结构一致） */');
lines.push('const KEYS = [');
lines.push("  'code', 'cities', 'maleFirst', 'femaleFirst', 'lastNames',");
lines.push("  'companies', 'jobTitles', 'universities', 'domainSuffixes',");
lines.push('];');
lines.push('');
lines.push('/**');
lines.push(' * 只保留规范字段。');
lines.push(' * 早期数据集（us/uk/ca/au）额外带有 states / areaCodes / phoneFormat /');
lines.push(' * postalName / nameZh / nameEn / flag 等未被引擎使用的字段，');
lines.push(' * 这些字段既冗余又可能覆盖 countryMeta.js 的元数据，故在此统一剔除。');
lines.push(' */');
lines.push('const pick = (d) => {');
lines.push('  if (!d) return null;');
lines.push('  const out = {};');
lines.push('  for (const k of KEYS) if (d[k] !== undefined) out[k] = d[k];');
lines.push('  return out;');
lines.push('};');
lines.push('');
lines.push('const all = {');
for (const f of files) {
  const ref = RESERVED.has(f) ? `${f}Data` : f;
  lines.push(`  ${f}: pick(${ref}),`);
}
lines.push('};');

lines.push('');
lines.push('/** 国家代码 -> 素材库（以各数据集自身的 code 字段为准） */');
lines.push('export const datasets = {');
lines.push('  ...Object.fromEntries(');
lines.push('    Object.values(all).filter(Boolean).map((d) => [d.code, d])');
lines.push('  ),');
lines.push('};');
lines.push('');
lines.push('/** 与文件名同名的原始导入集合，便于调试 */');
lines.push('export const byFile = all;');
lines.push('');
lines.push('export default datasets;');
lines.push('');

const out = resolve(dataDir, 'index.js');
writeFileSync(out, lines.join('\n'), 'utf8');

console.log(`✓ 已生成 src/data/index.js — 收录 ${files.length} 国`);
console.log(`  ${files.map((f) => f.toUpperCase()).join(' ')}`);
