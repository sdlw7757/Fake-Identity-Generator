/**
 * 数据模块自检脚本
 * 用法： node scripts/validate.mjs
 *
 * 校验内容：
 *  1. 四个国家数据模块结构完整、数组非空且达到最小条数
 *  2. 城市数据的 state 代码都能在 states 数组中找到
 *  3. 生成引擎可以正常产出四种国籍的完整身份
 *  4. 生成的信用卡号能通过 Luhn 校验
 */

import { us } from '../src/data/us.js';
import { uk } from '../src/data/uk.js';
import { ca } from '../src/data/ca.js';
import { au } from '../src/data/au.js';
import { generateIdentity, generateBatch, flattenIdentity } from '../src/lib/generator.js';
import { luhnValid } from '../src/lib/luhn.js';

const SETS = { US: us, GB: uk, CA: ca, AU: au };

// 各字段的最小期望条数
const MIN = {
  states: 8,
  areaCodes: 40,
  maleFirst: 100,
  femaleFirst: 100,
  lastNames: 180,
  cities: 35,
  companies: 45,
  jobTitles: 50,
  universities: 35,
  domainSuffixes: 5,
};

let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}
function warn(msg) {
  console.warn(`  ! ${msg}`);
  warnings++;
}

console.log('='.repeat(64));
console.log('数据模块自检');
console.log('='.repeat(64));

for (const [key, ds] of Object.entries(SETS)) {
  console.log(`\n[${key}] ${ds.nameZh} / ${ds.nameEn}`);
  if (!ds) { fail('数据模块为空'); continue; }

  for (const [field, min] of Object.entries(MIN)) {
    const arr = ds[field];
    if (!Array.isArray(arr)) { fail(`${field} 不是数组`); continue; }
    if (arr.length === 0) { fail(`${field} 为空数组`); continue; }
    if (arr.length < min) warn(`${field} 仅 ${arr.length} 条（期望 ≥ ${min}）`);
    else console.log(`  ✓ ${field.padEnd(15)} ${String(arr.length).padStart(4)} 条`);
  }

  // 城市 -> 州 引用完整性
  const codes = new Set((ds.states || []).map((s) => s.code));
  const bad = (ds.cities || []).filter((c) => !codes.has(c.state));
  if (bad.length) {
    fail(`有 ${bad.length} 个城市的 state 未在 states 中定义: ${bad.slice(0, 5).map((c) => `${c.city}(${c.state})`).join(', ')}`);
  } else {
    console.log('  ✓ 城市 -> 州            引用完整');
  }

  // 城市必备字段
  const missing = (ds.cities || []).filter(
    (c) => !c.city || !c.cityZh || c.zip === undefined || !Array.isArray(c.streets) || c.streets.length === 0
  );
  if (missing.length) fail(`${missing.length} 个城市缺少 city/cityZh/zip/streets 字段`);

  // 邮编必须为字符串（保留前导零）
  const badZip = (ds.cities || []).filter((c) => typeof c.zip !== 'string');
  if (badZip.length) fail(`${badZip.length} 个城市的 zip 不是字符串`);
}

/* ---------------- 生成引擎测试 ---------------- */

console.log(`\n${'='.repeat(64)}`);
console.log('生成引擎测试');
console.log('='.repeat(64));

const REQUIRED_PATHS = [
  'countryCode', 'country.zh', 'country.en', 'country.flag',
  'name.firstName', 'name.lastName', 'name.fullName', 'name.gender.zh',
  'birthday.date', 'birthday.age', 'zodiac.zh',
  'address.street', 'address.city', 'address.state', 'address.postal', 'address.full',
  'phone', 'email',
  'nationalId.label.zh', 'nationalId.value', 'license',
  'employment.company', 'employment.title', 'employment.workEmail', 'employment.annualIncome',
  'physical.heightMetric', 'physical.bloodType',
  'account.username', 'account.password', 'account.uuid', 'account.accountNumber',
  'card.brand', 'card.number', 'card.expiry', 'card.cvv',
  'university',
];

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

for (const code of Object.keys(SETS)) {
  console.log(`\n[${code}] 生成 200 份身份进行校验...`);
  let luhnFails = 0;
  let fieldFails = 0;

  for (let i = 0; i < 200; i++) {
    const id = generateIdentity(code);

    for (const p of REQUIRED_PATHS) {
      const v = getPath(id, p);
      if (v === undefined || v === null || v === '') {
        fieldFails++;
        if (fieldFails <= 3) fail(`字段缺失: ${p}`);
        break;
      }
    }

    if (!luhnValid(id.card.number)) luhnFails++;

    // 年龄必须在 18-65 之间
    if (id.birthday.age < 18 || id.birthday.age > 65) {
      fail(`年龄越界: ${id.birthday.age}`);
      break;
    }
    // 邮箱必须含 @
    if (!id.email.includes('@')) { fail(`邮箱格式错误: ${id.email}`); break; }
  }

  if (luhnFails > 0) fail(`${luhnFails}/200 个卡号未通过 Luhn 校验`);
  else console.log('  ✓ 200 个卡号全部通过 Luhn 校验');
  if (fieldFails === 0) console.log('  ✓ 全部必填字段存在');
}

/* ---------------- 批量与导出测试 ---------------- */

console.log(`\n${'='.repeat(64)}`);
console.log('批量生成与导出测试');
console.log('='.repeat(64));

const batch = generateBatch('US', 50);
console.log(`  ✓ 批量生成 50 条: ${batch.length} 条`);

const flat = flattenIdentity(batch[0]);
const flatKeys = Object.keys(flat);
console.log(`  ✓ 压平字段数: ${flatKeys.length}`);
const emptyFlat = flatKeys.filter((k) => flat[k] === undefined || flat[k] === null || flat[k] === '');
if (emptyFlat.length) fail(`压平后有 ${emptyFlat.length} 个空字段: ${emptyFlat.join(', ')}`);

/* ---------------- 汇总 ---------------- */

console.log(`\n${'='.repeat(64)}`);
if (errors === 0) {
  console.log(`✅ 全部检查通过${warnings ? `（${warnings} 条警告）` : ''}`);
} else {
  console.log(`❌ 发现 ${errors} 个错误，${warnings} 条警告`);
}
console.log('='.repeat(64));

process.exit(errors > 0 ? 1 : 0);
