/**
 * 界面冒烟测试
 * 用法： node scripts/smoke-ui.mjs
 *
 * 在 jsdom 中加载打包产物，验证：
 *  1. 四个页签（临时身份 / 临时地址 / 临时邮箱 / 临时信用卡）能正常渲染与切换
 *  2. 每个页签下的介绍文字与专属字段正确
 *  3. 国家 / 性别 / 州 / 城市 筛选器联动正常
 *  4. 各国电话与邮编格式符合该国规则
 *  5. 导出函数能产出合法 JSON / CSV / SQL
 */

import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(root, 'dist');

/* ---------- jsdom 环境 ---------- */

const html = readFileSync(resolve(distDir, 'index.html'), 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;

const cryptoStub = {
  randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  }),
};
try {
  Object.defineProperty(window, 'crypto', { value: cryptoStub, configurable: true, writable: true });
} catch (e) { /* 沿用 jsdom 自带实现 */ }
window.print = () => {};
window.scrollTo = () => {};
try {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: async () => {} }, configurable: true, writable: true,
  });
} catch (e) { /* 忽略 */ }
window.document.execCommand = () => true;

function defineGlobal(name, value) {
  try {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  } catch (e) {
    globalThis[name] = value;
  }
}
defineGlobal('window', window);
defineGlobal('document', window.document);
defineGlobal('navigator', window.navigator);
defineGlobal('crypto', window.crypto);
defineGlobal('Blob', window.Blob);
defineGlobal('localStorage', window.localStorage);
// 代码分割后 Vite 会注入 modulepreload 的 polyfill，它需要 MutationObserver
defineGlobal('MutationObserver', window.MutationObserver);
globalThis.URL.createObjectURL = () => 'blob:stub';
globalThis.URL.revokeObjectURL = () => {};

/* ---------- 载入产物 ---------- */

// 构建启用了代码分割（应用逻辑 + 国家素材库两个 chunk），
// 因此必须从 index.html 解析出真正的入口脚本，并按 ES Module 方式加载，
// 不能简单地对 assets 下的第一个 .js 做 window.eval（那是带 export 的模块，会报语法错误）。
const entryMatch = /<script[^>]+src="([^"]+)"/.exec(html);
if (!entryMatch) {
  console.error('✗ dist/index.html 中找不到入口脚本，请先执行 pnpm build');
  process.exit(1);
}
const entryRel = entryMatch[1].replace(/^\.?\//, '');
const entryPath = resolve(distDir, entryRel);
const jsFile = entryRel.split('/').pop();

let errors = 0;
const check = (ok, msg) => {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) errors++;
};

console.log('='.repeat(72));
console.log(`界面冒烟测试 (${jsFile})`);
console.log('='.repeat(72));

try {
  await import(pathToFileURL(entryPath).href);
} catch (e) {
  console.error('✗ 脚本执行抛出异常:', e.message);
  process.exit(1);
}
console.log('  ✓ 打包脚本执行成功，无运行时异常');

const doc = window.document;
const $$ = (s) => doc.querySelectorAll(s);
const click = (el) => el.dispatchEvent(new window.Event('click', { bubbles: true }));
const fire = (el, type = 'change') => el.dispatchEvent(new window.Event(type, { bubbles: true }));
const rowsText = () => Array.from($$('#result .row')).map((r) => r.querySelector('.v')?.textContent?.trim() || '');
const rowLabels = () => Array.from($$('#result .row')).map((r) => r.querySelector('.k')?.textContent?.trim() || '');

/* ---------- 1. 页签结构 ---------- */

console.log('\n[页签结构]');
check($$('.main-tab').length === 4, `顶部页签 ${$$('.main-tab').length} 个（期望 4）`);
const tabNames = Array.from($$('.main-tab')).map((t) => t.querySelector('.tab-label').textContent.trim());
const expected = ['临时身份', '临时地址', '临时邮箱', '临时信用卡'];
check(JSON.stringify(tabNames) === JSON.stringify(expected),
  `页签名称正确: ${tabNames.join(' / ')}`);

console.log('\n[每页介绍]');
const introText = doc.querySelector('#tabIntro')?.textContent || '';
check(introText.length > 40, `首屏介绍文字 ${introText.length} 字（期望 > 40）`);
check($$('#tabIntro .intro-points li').length >= 3, `介绍要点 ${$$('#tabIntro .intro-points li').length} 条`);

console.log('\n[筛选器]');
check(doc.querySelector('#countrySelect') !== null, '国家下拉框存在');
check(doc.querySelector('#genderSelect') !== null, '性别下拉框存在');
check(doc.querySelector('#stateSelect') !== null, '州/省下拉框存在');
check(doc.querySelector('#citySelect') !== null, '城市下拉框存在');
const countryOpts = $$('#countrySelect option').length;
check(countryOpts >= 25, `国家选项 ${countryOpts} 个（期望 ≥ 25）`);
check($$('#countrySelect optgroup').length >= 4, `大洲分组 ${$$('#countrySelect optgroup').length} 个`);
check(!doc.body.textContent.includes('测试号段'), '页面已不含「测试号段」字样');

/* ---------- 2. 四页签切换 ---------- */

console.log('\n[页签切换]');
const tabViews = {
  // 临时身份主页同时包含 个人资料 → 信用卡信息 → 教育信息 → 职业信息 → 联系方式 → 证件(SSN) → 身体特征 → 生活方式
  临时身份: { icon: '🪪', must: ['出生日期', '性别 Gender', '卡组织 Brand', '卡号 Number', '专业 Major', '公司 Company', 'Hobby', '社会安全号 SSN', '发卡行 Issuer', '国家 Country', '用户名 Username', '个人网站 Website', '浏览器 UA', 'IP 地址 IP'], mustNot: ['街道 Street'] },
  临时地址: { icon: '📍', must: ['街道 Street', '邮编 Postal'], mustNot: ['卡组织 Brand'] },
  临时邮箱: { icon: '📧', must: ['邮箱 Email', '密码 Password'], mustNot: ['卡组织 Brand'] },
  临时信用卡: { icon: '💳', must: ['卡组织 Brand', '卡号 Number', '发卡行 Issuer', '国家 Country'], mustNot: ['星座'] },
};

const tabs = Array.from($$('.main-tab'));
for (let i = 0; i < 4; i++) {
  const spec = tabViews[expected[i]];
  click(tabs[i]);
  const labels = rowLabels();
  const texts = rowsText();
  const hasAll = spec.must.every((m) => labels.includes(m));
  const noForbidden = spec.mustNot.every((m) => !labels.includes(m));
  const active = tabs[i].classList.contains('active');
  const introOk = (doc.querySelector('#tabIntro')?.textContent || '').includes(expected[i]);
  const noEmpty = texts.every((t) => t.length > 0) && !texts.some((t) => /undefined|NaN|\[object/.test(t));
  check(hasAll && noForbidden && active && introOk && noEmpty,
    `${expected[i]}: 字段${hasAll ? '✓' : '✗'} 排他${noForbidden ? '✓' : '✗'} 激活${active ? '✓' : '✗'} 介绍${introOk ? '✓' : '✗'} 无空值${noEmpty ? '✓' : '✗'}`);
}

/* ---------- 3. 跨页签同一身份 ---------- */

console.log('\n[跨页签一致性]');
const getNameVal = () => {
  const r = Array.from($$('#result .row')).find((x) => x.querySelector('.k')?.textContent === '全名 Full Name');
  return r ? r.querySelector('.v').textContent : null;
};
const getValByLabel = (label) => {
  const r = Array.from($$('#result .row')).find((x) => x.querySelector('.k')?.textContent === label);
  return r ? r.querySelector('.v').textContent : null;
};

click(tabs[0]);
const nameA = getNameVal();
const emailA = getValByLabel('邮箱 Email');
click(tabs[1]);
click(tabs[2]);
click(tabs[3]);
click(tabs[0]);
const nameB = getNameVal();
check(nameA && nameA === nameB, `切换四个页签后姓名不变（${nameA}）`);
const emailB = getValByLabel('邮箱 Email');
check(emailA === emailB, '返回身份页后邮箱与之前一致');

// 邮箱页的邮箱应与身份页相同
click(tabs[2]);
const emailOnEmailTab = getValByLabel('邮箱 Email');
check(emailOnEmailTab === emailA, `邮箱页与身份页邮箱一致（${emailOnEmailTab}）`);

// 地址页的城市应与身份页一致（同一份数据）
click(tabs[0]);
click(tabs[1]);
const cityOnAddr = getValByLabel('城市 City');
click(tabs[0]);
check(!!cityOnAddr, `地址页城市字段存在（${cityOnAddr}）`);

/* ---------- 4. 国家与格式 ---------- */

console.log('\n[国家与格式]');
const countryCases = [
  { code: 'US', phone: /^\(\d{3}\) \d{3}-\d{4}$/, postal: /^\d{5}/, label: 'United States' },
  { code: 'GB', phone: /^07\d{3} \d{6}$/, postal: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/, label: 'United Kingdom' },
  { code: 'CA', phone: /^\(\d{3}\) \d{3}-\d{4}$/, postal: /^[A-Z]\d[A-Z] \d[A-Z]\d$/, label: 'Canada' },
  { code: 'AU', phone: /^04\d{2} \d{3} \d{3}$/, postal: /^\d{4}$/, label: 'Australia' },
  { code: 'DE', phone: /^0\d{2} \d{7}$/, postal: /^\d{5}$/, label: 'Germany' },
  { code: 'JP', phone: /^0\d{2}-\d{4}-\d{4}$/, postal: /^\d{3}-\d{4}$/, label: 'Japan' },
  { code: 'CN', phone: /^1\d{2} \d{4} \d{4}$/, postal: /^\d{6}$/, label: 'China' },
  { code: 'IN', phone: /^\d{5} \d{5}$/, postal: /^\d{6}$/, label: 'India' },
  { code: 'NL', phone: /^0\d \d{8}$/, postal: /^\d{4} [A-Z]{2}$/, label: 'Netherlands' },
  { code: 'SG', phone: /^\d{4} \d{4}$/, postal: /^\d{6}$/, label: 'Singapore' },
];

const countrySel = doc.querySelector('#countrySelect');
// 先切回「临时身份」页签以便读取电话/国名
click(tabs[0]);
let ok = 0;
for (const tc of countryCases) {
  const opt = Array.from(countrySel.options).find((o) => o.value === tc.code);
  if (!opt) { console.log(`  ✗ ${tc.code} 下拉选项不存在`); errors++; continue; }
  countrySel.value = tc.code;
  fire(countrySel);
  const texts = rowsText();
  const okPhone = texts.some((t) => tc.phone.test(t));
  // 性别字段在「临时身份」页签即可确认国家切换生效（国名显示在「临时地址」页签）
  const okGender = texts.some((t) => t === 'Male' || t === 'Female');
  // 邮编与国家名在「临时地址」页签
  click(tabs[1]);
  const addrTexts = rowsText();
  const okPostal = addrTexts.some((t) => tc.postal.test(t));
  const okLabel = addrTexts.some((t) => t.includes(tc.label));
  click(tabs[0]);
  const pass = okPhone && okPostal && okLabel && okGender;
  check(pass, `${tc.code} ${tc.label}: 电话${okPhone ? '✓' : '✗'} 邮编${okPostal ? '✓' : '✗'} 国名${okLabel ? '✓' : '✗'}`);
  if (pass) ok++;
}

/* ---------- 4. 筛选联动 ---------- */

console.log('\n[筛选联动]');
countrySel.value = 'US';
fire(countrySel);
const stateSel = doc.querySelector('#stateSelect');
const citySel = doc.querySelector('#citySelect');
const stateCount = stateSel.options.length - 1;
check(stateCount >= 40, `美国州选项 ${stateCount} 个（期望 ≥ 40）`);
check(citySel.options.length > 1, `未选州时城市选项 ${citySel.options.length - 1} 个`);

stateSel.value = 'CA';
fire(stateSel);
const caCities = citySel.options.length - 1;
check(caCities > 0 && caCities < stateCount + 20, `选加州后城市收窄为 ${caCities} 个`);

citySel.value = 'Los Angeles';
fire(citySel);
click(tabs[1]);
let allLA = true;
for (let i = 0; i < 5; i++) {
  click(doc.querySelector('#genBtn'));
  const texts = rowsText();
  if (!texts.some((t) => t.includes('Los Angeles'))) allLA = false;
}
check(allLA, '连续 5 次生成的地址城市均为 Los Angeles');

// 性别筛选（在「临时身份」页签验证，性别字段显示为「女 / Female」）
click(tabs[0]);
const genderSel = doc.querySelector('#genderSelect');
genderSel.value = 'F';
fire(genderSel);
let allF = true;
for (let i = 0; i < 6; i++) {
  click(doc.querySelector('#genBtn'));
  if (!rowsText().some((t) => t === 'Female')) allF = false;
}
check(allF, '性别筛选为「女」时连续 6 次均为女性');

genderSel.value = 'M';
fire(genderSel);
let allM = true;
for (let i = 0; i < 6; i++) {
  click(doc.querySelector('#genBtn'));
  if (!rowsText().some((t) => t === 'Male')) allM = false;
}
check(allM, '性别筛选为「男」时连续 6 次均为男性');

// 复原
stateSel.value = '';
fire(stateSel);
genderSel.value = 'any';
fire(genderSel);

/* ---------- 5. 批量与主题 ---------- */

console.log('\n[批量与主题]');
doc.querySelector('#batchCount').value = '7';
click(doc.querySelector('#batchBtn'));
check($$('#batchResult .row').length === 7, `批量生成渲染 ${$$('#batchResult .row').length} 行（期望 7）`);
check(doc.querySelector('#batchResult').textContent.includes('7 条'), '批量结果标题显示数量');

// 默认白天（浅色）主题；第一次点击切换到深色，再点回浅色
const themeBtn = doc.querySelector('#themeBtn');
check(doc.documentElement.getAttribute('data-theme') === 'light', '默认主题为浅色（白天）');
click(themeBtn);
check(doc.documentElement.getAttribute('data-theme') === 'dark', '点击后切换为深色');
click(themeBtn);
check(doc.documentElement.getAttribute('data-theme') === 'light', '再点击切换回浅色');

/* ---------- 6. 导出 ---------- */

console.log('\n[导出]');
const mod = await import(`file:///${resolve(root, 'src/lib/generator.js').replace(/\\/g, '/')}`);
const exp = await import(`file:///${resolve(root, 'src/lib/exporters.js').replace(/\\/g, '/')}`);

const id = mod.generateIdentity('US');
const parsed = JSON.parse(exp.toJSON(id));
const nFields = Object.keys(parsed).length;
check(nFields >= 53 && nFields <= 58, `JSON 导出 ${nFields} 个字段（期望 53–58，含生活方式与在线资料）`);
check(/^(0[1-9]|1[0-2])\/\d{2}$/.test(parsed.creditCardExpiry), `卡有效期 MM/YY（${parsed.creditCardExpiry}）`);
check(parsed.routingNumber && !parsed.sortCode, '美国导出仅含 Routing');
check(JSON.parse(exp.toJSON(mod.generateIdentity('GB'))).sortCode !== undefined, '英国导出含 Sort Code');
check(JSON.parse(exp.toJSON(mod.generateIdentity('AU'))).bsb !== undefined, '澳大利亚导出含 BSB');
check(JSON.parse(exp.toJSON(mod.generateIdentity('DE'))).blz !== undefined, '德国导出含 BLZ');

const csv = exp.toCSV([id, mod.generateIdentity('GB')]);
check(csv.replace(/^\uFEFF/, '').split('\r\n').length === 3, 'CSV 为 1 表头 + 2 数据行');
check(csv.startsWith('\uFEFF'), 'CSV 含 UTF-8 BOM');
check(/^INSERT INTO `test_users` \(/.test(exp.toSQL([id], 'test_users')), 'SQL 语句格式正确');
check(exp.toText([id, mod.generateIdentity('AU')]).includes('===== #2 ====='), 'TXT 多条目分隔正确');

/* ---------- 7. 在线资料字段 ---------- */

console.log('\n[在线资料]');
check(typeof parsed.website === 'string' && /^[a-z0-9-]+\.[a-z]+$/.test(parsed.website), `个人网站格式正确（${parsed.website}）`);
check(/^Mozilla\/5\.0 /.test(parsed.userAgent || ''), '浏览器 UA 为合法 UA 串');
const ipOk = /^(192\.0\.2|198\.51\.100|203\.0\.113)\.\d{1,3}$/.test(parsed.ipAddress || '');
check(ipOk, `IP 使用 RFC 5737 文档保留网段（${parsed.ipAddress}）`);
check(typeof parsed.username === 'string' && parsed.username.length > 0, '用户名存在');

/* ---------- 8. 移动端自适应 ---------- */

console.log('\n[移动端自适应]');
const cssFile = readdirSync(resolve(distDir, 'assets')).find((f) => f.endsWith('.css'));
const css = cssFile ? readFileSync(resolve(distDir, 'assets', cssFile), 'utf8') : '';
check(css.includes('max-width: 560px'), '包含手机断点（560px）');
check(css.includes('max-width: 380px'), '包含超窄屏断点（380px）');
check(/\.row\s*\{[^}]*display:\s*grid/.test(css), '手机端字段行改为网格堆叠布局');
check(css.includes('viewport-fit') || html.includes('viewport-fit=cover'), 'viewport 含 viewport-fit=cover（适配刘海屏）');
check(css.includes('overflow-wrap:anywhere') || css.includes('overflow-wrap: anywhere'), '超长字符串（UA / IBAN）可换行');
// 手机端输入控件字号需 ≥16px，否则 iOS 聚焦时会自动放大页面
const mobileBlock = css.slice(css.indexOf('max-width: 560px'));
check(/select,input\[type=number\],input\[type=text\]\{font-size:16px/.test(mobileBlock.replace(/\s+/g, '')),
  '手机端表单控件字号 ≥16px（避免 iOS 聚焦缩放）');

/* ---------- 汇总 ---------- */

console.log(`\n${'='.repeat(72)}`);
console.log(errors === 0 ? '✅ 界面冒烟测试全部通过' : `❌ 发现 ${errors} 个问题`);
console.log('='.repeat(72));
process.exit(errors > 0 ? 1 : 0);
