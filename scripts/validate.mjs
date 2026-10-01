/**
 * 数据模块与生成引擎自检
 * 用法： node scripts/validate.mjs
 *
 * 校验内容：
 *  1. 每个国家数据模块结构完整、数组非空且达到最小条数
 *  2. 城市数据的 state 与 zip 格式合法（含与 postalTpl 模板比对）
 *  3. 数据文件源码规范（无 BOM、单引号、default 导出、无冗余字段）
 *  4. 生成引擎能为每个国家产出完整身份，且格式符合该国规则
 *  5. 筛选功能（性别 / 州 / 城市）正确生效
 *  6. 银行卡号通过 Luhn 校验
 *
 * 本脚本按 countryMeta.js 注册表动态遍历全部国家，新增国家后无需修改本文件。
 */

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  COUNTRY_LIST, REGION_GROUPS, COUNTRIES,
  generateIdentity, generateBatch, flattenIdentity,
  getStates, getCities,
} from '../src/lib/generator.js';
import { COUNTRY_META } from '../src/data/countryMeta.js';
import { datasets as RAW_DATASETS } from '../src/data/index.js';
import { luhnValid, luhnCheckDigit } from '../src/lib/luhn.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'src', 'data');

const MIN = {
  cities: 20,
  maleFirst: 80,
  femaleFirst: 80,
  lastNames: 120,
  companies: 35,
  jobTitles: 40,
  universities: 20,
  domainSuffixes: 5,
};

let errors = 0;
let warnings = 0;
const fail = (m) => { console.error(`  ✗ ${m}`); errors++; };
const warn = (m) => { console.warn(`  ! ${m}`); warnings++; };

console.log('='.repeat(74));
console.log(`国家数据自检 — 注册表 ${Object.keys(COUNTRY_META).length} 国 / 已加载数据 ${COUNTRY_LIST.length} 国`);
console.log('='.repeat(74));

/* ---------------- 1. 注册表与数据模块一致性 ---------------- */

const metaCodes = new Set(Object.keys(COUNTRY_META));
const listCodes = new Set(COUNTRY_LIST.map((c) => c.code));
const missingData = [...metaCodes].filter((c) => !listCodes.has(c));

if (missingData.length) warn(`注册表已登记但缺少数据模块: ${missingData.join(', ')}`);
for (const c of listCodes) {
  if (!metaCodes.has(c)) fail(`数据模块 ${c} 未在 countryMeta.js 中登记`);
}
for (const g of REGION_GROUPS) {
  if (g.countries.length === 0) fail(`大洲 ${g.nameZh} 下没有国家`);
}
console.log(`\n大洲分组: ${REGION_GROUPS.map((g) => `${g.icon}${g.nameZh}(${g.countries.length})`).join('  ')}`);

/* ---------------- 2. 逐国数据校验 ---------------- */

console.log(`\n${'─'.repeat(74)}`);
console.log('逐国数据校验');
console.log('─'.repeat(74));

const table = [];

for (const ds of COUNTRY_LIST) {
  const issues = [];

  for (const [field, min] of Object.entries(MIN)) {
    const arr = ds[field];
    if (!Array.isArray(arr)) { issues.push(`${field} 不是数组`); continue; }
    if (arr.length === 0) { issues.push(`${field} 为空`); continue; }
    if (arr.length < min) issues.push(`${field} 仅 ${arr.length}（期望 ≥ ${min}）`);
    const dup = arr.length - new Set(arr.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x))).size;
    if (dup > 0) issues.push(`${field} 有 ${dup} 个重复项`);
  }

  if (!ds.phone) issues.push('缺少 phone 模板');
  if (!ds.postalTpl) issues.push('缺少 postalTpl 模板');
  if (!ds.id) issues.push('缺少 id 规则');

  if (Array.isArray(ds.cities)) {
    const bad = ds.cities.filter(
      (c) => !c.city || !c.cityZh || typeof c.zip !== 'string' || !c.state ||
             !Array.isArray(c.streets) || c.streets.length === 0
    );
    if (bad.length) issues.push(`${bad.length} 个城市字段不完整`);
    const emptyStr = ds.cities.filter((c) => Object.values(c).some((v) => v === ''));
    if (emptyStr.length) issues.push(`${emptyStr.length} 个城市含空字段`);
  }

  table.push({
    code: ds.code, name: ds.nameZh,
    cities: ds.cities?.length || 0,
    m: ds.maleFirst?.length || 0,
    f: ds.femaleFirst?.length || 0,
    last: ds.lastNames?.length || 0,
    comp: ds.companies?.length || 0,
    jobs: ds.jobTitles?.length || 0,
    uni: ds.universities?.length || 0,
    ok: issues.length === 0,
  });

  if (issues.length) fail(`${ds.code} ${ds.nameZh}: ${issues.join('; ')}`);
}

console.log('');
console.log('代码  国家            城市  男名  女名  姓氏  公司  职位  院校');
console.log('─'.repeat(74));
for (const r of table) {
  console.log(
    `${r.code.padEnd(5)} ${r.name.padEnd(14)} ${String(r.cities).padStart(4)} ` +
    `${String(r.m).padStart(5)} ${String(r.f).padStart(5)} ${String(r.last).padStart(5)} ` +
    `${String(r.comp).padStart(5)} ${String(r.jobs).padStart(5)} ${String(r.uni).padStart(5)}  ${r.ok ? '✓' : '✗'}`
  );
}
console.log('─'.repeat(74));
const t = table.reduce((a, r) => ({
  cities: a.cities + r.cities, m: a.m + r.m, f: a.f + r.f, last: a.last + r.last,
  comp: a.comp + r.comp, jobs: a.jobs + r.jobs, uni: a.uni + r.uni,
}), { cities: 0, m: 0, f: 0, last: 0, comp: 0, jobs: 0, uni: 0 });
console.log(`合计  ${table.length} 国`.padEnd(21) +
  `${String(t.cities).padStart(4)} ${String(t.m).padStart(5)} ${String(t.f).padStart(5)} ` +
  `${String(t.last).padStart(5)} ${String(t.comp).padStart(5)} ${String(t.jobs).padStart(5)} ${String(t.uni).padStart(5)}`);

/* ---------------- 3. 数据文件源码规范 + 邮编模板比对 ---------------- */

console.log(`\n${'─'.repeat(74)}`);
console.log('数据文件源码规范与邮编模板比对');
console.log('─'.repeat(74));

const CANON_KEYS = [
  'code', 'cities', 'maleFirst', 'femaleFirst', 'lastNames',
  'companies', 'jobTitles', 'universities', 'domainSuffixes',
].sort().join(',');

const EXCLUDE_FILES = new Set(['countryMeta.js', 'index.js']);
const dataFiles = (await readdir(DATA_DIR))
  .filter((f) => f.endsWith('.js') && !EXCLUDE_FILES.has(f))
  .sort();

/** 把 postalTpl 转成逐字符的字符类数组，便于做「前缀匹配」 */
function tplClasses(tpl) {
  return tpl.replace(/[^ABCD]/g, '').split('')
    .map((c) => (c === 'A' ? '[A-Z]' : c === 'D' ? '[A-Z0-9]' : '[0-9]'));
}

let srcIssues = 0;
for (const f of dataFiles) {
  const src = await readFile(join(DATA_DIR, f), 'utf8');
  const mod = await import(pathToFileURL(join(DATA_DIR, f)).href);
  const issues = [];

  if (src.charCodeAt(0) === 0xfeff) issues.push('存在 BOM');
  if (!src.endsWith('\n')) issues.push('文件末尾缺少换行');
  if (!mod.default) issues.push('缺少 export default');

  // 非撇号字符串必须使用单引号
  const dq = [...src.matchAll(/"([^"\n]*)"/g)].map((x) => x[1]).filter((s) => !s.includes("'"));
  if (dq.length) issues.push(`非撇号字符串使用了双引号: ${JSON.stringify(dq.slice(0, 2))}`);

  // 运行时数据集的键集合必须规范化（gen-index 会剔除冗余字段）
  const code = Object.values(mod).find((v) => v && typeof v === 'object' && v.code)?.code;
  const ds = RAW_DATASETS[code];
  if (!ds) issues.push('未能在运行时数据集中找到该国家');
  else {
    const keys = Object.keys(ds).sort().join(',');
    if (keys !== CANON_KEYS) issues.push(`运行时键集合不符规范: ${keys}`);
  }

  // 城市邮编必须与本国 postalTpl 形状一致。
  // 部分国家（如加拿大）城市只存外码前缀，故按「前缀匹配」处理。
  const meta = COUNTRY_META[code];
  if (meta && meta.postalTpl && !meta.postalFlex && ds?.cities) {
    const classes = tplClasses(meta.postalTpl);
    for (const c of ds.cities) {
      const zip = String(c.zip).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const n = Math.min(zip.length, classes.length);
      const re = new RegExp(`^${classes.slice(0, n).join('')}$`);
      if (!re.test(zip)) {
        issues.push(`邮编与模板不符 ${c.city}: "${c.zip}" 期望形状 ${meta.postalTpl}`);
        break;
      }
    }
  }

  if (issues.length) { srcIssues++; fail(`${f}: ${issues.join('; ')}`); }
}
if (srcIssues === 0) {
  console.log(`  ✓ ${dataFiles.length} 个数据文件：无 BOM、单引号规范、default 导出齐全`);
  console.log('  ✓ 运行时键集合统一为 9 个规范字段，城市邮编形状与 postalTpl 一致');
}

/* ---------------- 4. 生成引擎逐国校验 ---------------- */

console.log(`\n${'─'.repeat(74)}`);
console.log('生成引擎校验（每国 40 份样本）');
console.log('─'.repeat(74));

const REQUIRED_PATHS = [
  'countryCode', 'country.zh', 'country.en', 'country.flag',
  'name.firstName', 'name.lastName', 'name.fullName', 'name.gender.zh',
  'birthday.date', 'birthday.age', 'zodiac.zh',
  'address.street', 'address.city', 'address.postal', 'address.full',
  'phone', 'email',
  'nationalId.label.zh', 'nationalId.value', 'license',
  'employment.company', 'employment.title', 'employment.workEmail', 'employment.annualIncome',
  'physical.heightMetric', 'physical.bloodType',
  'account.username', 'account.password', 'account.uuid', 'account.accountNumber',
  'card.brand', 'card.number', 'card.expiry', 'card.cvv',
  'education.university', 'education.degreeZh', 'education.degreeEn',
  'education.major', 'education.graduationYear',
];

const getPath = (o, p) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
const now = new Date();
const SAMPLES = 40;
let engineFails = 0;

for (const ds of COUNTRY_LIST) {
  const problems = [];
  let luhnBad = 0, postalBad = 0, phoneBad = 0, expBad = 0, idBad = 0;

  for (let i = 0; i < SAMPLES; i++) {
    const id = generateIdentity(ds.code);

    for (const p of REQUIRED_PATHS) {
      const v = getPath(id, p);
      if (v === undefined || v === null || v === '') { problems.push(`字段缺失 ${p}`); break; }
    }

    if (!luhnValid(id.card.number)) luhnBad++;

    const expectLen = id.card.brand === 'American Express' ? 15
      : id.card.brand === 'Diners Club' ? 14 : 16;
    if (id.card.number.length !== expectLen) {
      problems.push(`${id.card.brand} 卡号长度 ${id.card.number.length} 应为 ${expectLen}`);
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(id.card.expiry)) expBad++;
    else {
      const [m, y] = id.card.expiry.split('/').map(Number);
      if (new Date(2000 + y, m, 0) < now) expBad++;
    }

    // 邮编形状必须与国家模板一致。
    // postalFlex 国家（如英国）外码长度可变，改用正则校验。
    if (ds.postalFlex) {
      if (!/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(id.address.postal)) {
        postalBad++;
        if (postalBad <= 1) problems.push(`邮编 "${id.address.postal}" 不是合法英式邮编`);
      }
    } else {
      const tplLen = ds.postalTpl.replace(/[\s-]/g, '').length;
      if (id.address.postal.replace(/[\s-]/g, '').length !== tplLen) {
        postalBad++;
        if (postalBad <= 1) problems.push(`邮编 "${id.address.postal}" 不符模板 "${ds.postalTpl}"`);
      }
    }

    // 电话形状必须与国家模板一致。
    // 模板中的 A/B/C 都代表「数字」占位符（见 random.js 的 fillPhone），
    // 模板里的字面数字（如开头的 0、4）必须原样出现在结果中。
    // 比对方式：模板的占位符与字面数字、实际值的数字，统一记为 '#'，
    // 这样只校验「哪一位是数字、哪一位是分隔符」。
    const tplShape = ds.phone.split('').map((ch) => (/[ABC\d]/.test(ch) ? '#' : ch)).join('');
    const valShape = id.phone.split('').map((ch) => (/\d/.test(ch) ? '#' : ch)).join('');
    if (tplShape !== valShape) {
      phoneBad++;
      if (phoneBad <= 1) problems.push(`电话 "${id.phone}" 形状应为 "${ds.phone}"`);
    }

    if (id.nationalId.value.length < 6) idBad++;
    if (id.birthday.age < 18 || id.birthday.age > 65) problems.push(`年龄越界 ${id.birthday.age}`);
    if (!/^[^@\s]+@[^@\s]+\.[a-z.]+$/.test(id.email)) problems.push(`邮箱格式错误 ${id.email}`);
  }

  if (luhnBad) problems.push(`${luhnBad}/${SAMPLES} 卡号未过 Luhn`);
  if (postalBad) problems.push(`${postalBad}/${SAMPLES} 邮编不符`);
  if (phoneBad) problems.push(`${phoneBad}/${SAMPLES} 电话不符`);
  if (expBad) problems.push(`${expBad}/${SAMPLES} 有效期异常`);
  if (idBad) problems.push(`${idBad}/${SAMPLES} 证件号过短`);

  if (problems.length) {
    engineFails++;
    fail(`${ds.code} ${ds.nameZh}: ${[...new Set(problems)].slice(0, 4).join('; ')}`);
  }
}

if (engineFails === 0) {
  console.log(`✓ 全部 ${COUNTRY_LIST.length} 国通过：字段完整、卡号 Luhn 合法、`);
  console.log('  邮编/电话符合本国模板、证件号非空、有效期未过期、年龄在 18–65');
}

/* ---------------- 5. 校验位算法回归（已知向量 + 自洽性） ---------------- */

console.log(`\n${'─'.repeat(74)}`);
console.log('校验位算法回归');
console.log('─'.repeat(74));

const algo = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else fail(msg);
};

// Luhn 公开已知向量
algo(luhnValid('4539578763621486'), 'Luhn 已知有效号 4539578763621486 判定通过');
algo(!luhnValid('4539578763621487'), 'Luhn 已知无效号 4539578763621487 判定拒绝');
algo(luhnCheckDigit('453957876362148') === 6, 'Luhn 校验位计算 453957876362148 -> 6');

// 巴西 CPF：生成值的两位校验码必须与模 11 算法自洽
{
  const cpf = generateIdentity('BR').nationalId.value.replace(/\D/g, '');
  const dv = (arr) => {
    const w = arr.length + 1;
    const sum = arr.reduce((a, v, i) => a + v * (w - i), 0);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const n9 = cpf.slice(0, 9).split('').map(Number);
  const d1 = dv(n9);
  const d2 = dv([...n9, d1]);
  algo(cpf.slice(9) === `${d1}${d2}`, `巴西 CPF 校验位自洽（${cpf} -> ${d1}${d2}）`);
}

// 中国身份证：末位校验码必须与 ISO 7064 MOD 11-2 自洽
{
  const cid = generateIdentity('CN').nationalId.value;
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const codes = '10X98765432';
  const sum = cid.slice(0, 17).split('').reduce((a, c, i) => a + Number(c) * w[i], 0);
  algo(cid[17] === codes[sum % 11], `中国身份证校验位自洽（${cid} -> ${codes[sum % 11]}）`);
}

// 加拿大 SIN / 澳大利亚格式长度
algo(luhnValid(generateIdentity('CA').nationalId.value.replace(/\D/g, '')), '加拿大 SIN 通过 Luhn');
algo(generateIdentity('AU').nationalId.value.replace(/\D/g, '').length === 9, '澳大利亚 TFN 为 9 位');

/* ---------------- 6. 筛选功能校验 ---------------- */

console.log(`\n${'─'.repeat(74)}`);
console.log('筛选功能校验');
console.log('─'.repeat(74));

for (const [g, expect] of [['M', '男'], ['F', '女']]) {
  let ok = true;
  for (let i = 0; i < 40; i++) {
    if (generateIdentity('US', { gender: g }).name.gender.zh !== expect) ok = false;
  }
  if (ok) console.log(`  ✓ 性别筛选 ${g} -> 连续 40 次均为「${expect}」`);
  else fail(`性别筛选 ${g} 结果不稳定`);
}

const usStates = getStates('US');
if (usStates.length >= 40) console.log(`  ✓ 美国州数量 ${usStates.length}`);
else fail(`美国州数量异常: ${usStates.length}`);

const caCities = getCities('US', 'CA');
const allCities = getCities('US');
if (caCities.length > 0 && caCities.length < allCities.length) {
  console.log(`  ✓ 州筛选生效：加州 ${caCities.length} 个城市 < 全国 ${allCities.length} 个`);
} else fail(`州筛选未生效: 加州 ${caCities.length} / 全国 ${allCities.length}`);

let cityOk = true;
for (let i = 0; i < 30; i++) {
  if (generateIdentity('US', { state: 'CA', city: 'Los Angeles' }).address.city !== 'Los Angeles') cityOk = false;
}
if (cityOk) console.log('  ✓ 城市筛选 LA -> 连续 30 次均为 Los Angeles');
else fail('城市筛选未生效');

try {
  const id = generateIdentity('US', { state: 'ZZZ', city: 'Nowhere' });
  if (id.address.city) console.log('  ✓ 无效筛选条件安全回退，未抛异常');
  else fail('无效筛选条件导致空地址');
} catch (e) {
  fail(`无效筛选条件抛出异常: ${e.message}`);
}

/* ---------------- 7. 导出与批量 ---------------- */

console.log(`\n${'─'.repeat(74)}`);
console.log('批量生成与导出');
console.log('─'.repeat(74));

const batch = generateBatch('US', 50);
console.log(`  ✓ 批量生成 50 条: ${batch.length} 条`);

const flat = flattenIdentity(batch[0]);
const flatKeys = Object.keys(flat);
const emptyFlat = flatKeys.filter((k) => flat[k] === undefined || flat[k] === null || flat[k] === '');
if (emptyFlat.length) fail(`压平后有 ${emptyFlat.length} 个空字段: ${emptyFlat.join(', ')}`);
else console.log(`  ✓ 压平 ${flatKeys.length} 个字段，无空值`);

const BANK_EXPECT = {
  US: ['routingNumber'], CA: ['routingNumber'], MX: ['routingNumber'],
  GB: ['sortCode'], AU: ['bsb'], DE: ['blz'], FR: ['rib'],
};
let bankOk = true;
for (const [code, expect] of Object.entries(BANK_EXPECT)) {
  if (!COUNTRIES[code]) { warn(`${code} 缺少数据模块，跳过银行字段校验`); continue; }
  const f = flattenIdentity(generateIdentity(code));
  const ok = expect.every((k) => f[k]);
  const leak = ['routingNumber', 'sortCode', 'bsb', 'blz', 'rib'].filter((k) => !expect.includes(k) && f[k]);
  if (!ok) { fail(`${code} 缺少银行字段 ${expect.join(',')}`); bankOk = false; }
  else if (leak.length) { fail(`${code} 不应包含 ${leak.join(',')}`); bankOk = false; }
}
if (bankOk) console.log('  ✓ 各国银行字段出现/不出现均正确');

// IBAN 仅在真正使用它的国家出现；美国 / 加拿大 / 澳大利亚等不应有 IBAN。
// 这里刻意用一份独立名单，以便与生成引擎的名单交叉验证。
const IBAN_CODES = new Set([
  'AL', 'AD', 'AT', 'AZ', 'BH', 'BY', 'BE', 'BA', 'BR', 'BG', 'CR', 'HR', 'CY',
  'CZ', 'DK', 'DO', 'EG', 'SV', 'EE', 'FO', 'FI', 'FR', 'GE', 'DE', 'GI', 'GR',
  'GL', 'GT', 'HU', 'IS', 'IE', 'IL', 'IT', 'JO', 'KZ', 'KW', 'LV', 'LB', 'LI',
  'LT', 'LU', 'MT', 'MR', 'MU', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PK', 'PS',
  'PL', 'PT', 'QA', 'RO', 'LC', 'SM', 'ST', 'SA', 'RS', 'SC', 'SK', 'SI', 'ES',
  'SD', 'SE', 'CH', 'TL', 'TN', 'TR', 'UA', 'AE', 'GB', 'VA', 'VG',
]);

let ibanOk = true;
let nonIbanLeak = 0;
for (const ds of COUNTRY_LIST) {
  const iban = generateIdentity(ds.code).account.iban;
  if (IBAN_CODES.has(ds.code)) {
    if (!iban || !/^[A-Z]{2}\d{2}/.test(iban)) {
      ibanOk = false;
      fail(`${ds.code} 应生成 IBAN 但结果为 ${iban}`);
    }
  } else if (iban) {
    nonIbanLeak++;
    ibanOk = false;
    fail(`${ds.code} 不使用 IBAN，但生成了 ${iban}`);
  }
}
if (ibanOk) {
  const ibanCount = COUNTRY_LIST.filter((c) => IBAN_CODES.has(c.code)).length;
  console.log(`  ✓ IBAN 仅出现在 ${ibanCount} 个使用该标准的国家，其余 ${COUNTRY_LIST.length - ibanCount} 国正确地不含 IBAN`);
}

// 美国 / 加拿大 / 墨西哥的路由号必须通过 ABA 校验
let abaOk = true;
for (const code of ['US', 'CA', 'MX']) {
  for (let i = 0; i < 30; i++) {
    const r = generateIdentity(code).account.routingNumber || '';
    const d = r.split('').map(Number);
    if (d.length !== 9) { abaOk = false; fail(`${code} 路由号长度异常: ${r}`); break; }
    const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
    if (sum % 10 !== 0) { abaOk = false; fail(`${code} 路由号未通过 ABA 校验: ${r}`); break; }
  }
}
if (abaOk) console.log('  ✓ 美国 / 加拿大 / 墨西哥路由号均通过 ABA 校验位');

/* ---------------- 汇总 ---------------- */

console.log(`\n${'='.repeat(74)}`);
if (errors === 0) {
  console.log(`✅ 全部检查通过（${COUNTRY_LIST.length} 国${warnings ? `，${warnings} 条警告` : ''}）`);
} else {
  console.log(`❌ 发现 ${errors} 个错误，${warnings} 条警告`);
}
console.log('='.repeat(74));

process.exit(errors > 0 ? 1 : 0);
