/**
 * 界面冒烟测试
 * 用法： node scripts/smoke-ui.mjs
 *
 * 在 jsdom 中加载打包产物，验证：
 *  1. 应用能挂载并渲染出各功能卡片
 *  2. 关键字段被真实填充（非占位符）
 *  3. 国家切换、生成、批量生成等交互能正常工作
 *  4. 导出函数能产出合法 JSON / CSV
 * 说明：jsdom 不解析外部 CSS，本脚本只校验 DOM 结构与交互逻辑。
 */

import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(root, 'dist');

/* ---------- 准备 jsdom 环境 ---------- */

const html = readFileSync(resolve(distDir, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
});

const { window } = dom;

// 补齐 jsdom 缺失的 API
// 注意：jsdom 的 window.crypto 只有 getter，必须用 defineProperty 覆盖
const cryptoStub = {
  randomUUID: () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }),
};
try {
  Object.defineProperty(window, 'crypto', { value: cryptoStub, configurable: true, writable: true });
} catch (e) {
  // 若无法覆盖则沿用 jsdom 自带的实现
}
window.print = () => {};
window.scrollTo = () => {};
try {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: async () => {} },
    configurable: true,
    writable: true,
  });
} catch (e) { /* 忽略 */ }
window.document.execCommand = () => true;

// 把 window 暴露为全局，供打包代码使用。
// Node 18+ 对 navigator / crypto 等全局属性只有 getter，必须用 defineProperty 覆盖。
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
globalThis.URL.createObjectURL = () => 'blob:stub';
globalThis.URL.revokeObjectURL = () => {};

/* ---------- 载入打包后的 JS ---------- */

const jsFile = readdirSync(resolve(distDir, 'assets')).find((f) => f.endsWith('.js'));
if (!jsFile) {
  console.error('✗ dist/assets 下找不到 JS 产物，请先执行 pnpm build');
  process.exit(1);
}
const bundle = readFileSync(resolve(distDir, 'assets', jsFile), 'utf8');

let errors = 0;
const check = (ok, msg) => {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) errors++;
};

console.log('='.repeat(64));
console.log(`界面冒烟测试 (${jsFile})`);
console.log('='.repeat(64));

try {
  window.eval(bundle);
} catch (e) {
  console.error('✗ 脚本执行抛出异常:', e.message);
  process.exit(1);
}
console.log('  ✓ 打包脚本执行成功，无运行时异常');

const doc = window.document;
const $$ = (s) => doc.querySelectorAll(s);

/* ---------- 结构校验 ---------- */

console.log('\n[结构]');
check($$('.card').length >= 8, `渲染出 ${$$('.card').length} 张信息卡片（期望 ≥ 8）`);
check($$('.country-tab').length === 4, `国家切换标签 ${$$('.country-tab').length} 个（期望 4）`);
check(doc.querySelector('.notice') !== null, '合法用途声明区块存在');
check(doc.querySelector('#batchCount') !== null, '批量生成数量输入框存在');

/* ---------- 首屏数据校验 ---------- */

console.log('\n[首屏数据]');
const rows = $$('#result .row');
check(rows.length >= 30, `首屏渲染 ${rows.length} 个字段行（期望 ≥ 30）`);

const texts = Array.from(rows).map((r) => r.querySelector('.v')?.textContent?.trim() || '');
check(texts.every((t) => t.length > 0), '所有字段值非空');
check(!texts.some((t) => /undefined|NaN|\[object/.test(t)), '无 undefined / NaN / [object Object] 泄漏');
check(texts.some((t) => /^\(\d{3}\) \d{3}-\d{4}$/.test(t)), '存在格式正确的美国电话号码');
check(texts.some((t) => /^[^@\s]+@[^@\s]+\.[a-z]+$/.test(t)), '存在格式正确的邮箱');
check(texts.some((t) => /^\d{3}-\d{2}-\d{4}$/.test(t)), '存在格式正确的 SSN');
check(Array.from($$('#result .avatar')).length === 1, '渲染了头像块');

/* ---------- 交互校验 ---------- */

console.log('\n[交互]');
const before = texts.join('|');

// 1. 重新生成
doc.querySelector('#genBtn').dispatchEvent(new window.Event('click', { bubbles: true }));
const after = Array.from($$('#result .row')).map((r) => r.querySelector('.v')?.textContent?.trim() || '').join('|');
check(after !== before, '点击「生成」后数据发生变化');
check(after.length > 0, '重新生成后仍有数据');

// 2. 切换到英国
const ukTab = Array.from($$('.country-tab')).find((t) => t.dataset.code === 'GB');
ukTab.dispatchEvent(new window.Event('click', { bubbles: true }));
const ukTexts = Array.from($$('#result .row')).map((r) => r.querySelector('.v')?.textContent?.trim() || '');
check(ukTexts.some((t) => /^07\d{3} \d{6}$/.test(t)), '英国电话格式正确 (07xxx xxxxxx)');
check(ukTexts.some((t) => /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(t)), '英国邮编格式正确 (如 SW1A 1AA)');
check(ukTexts.some((t) => /United Kingdom/.test(t)), '国家显示为 United Kingdom');
check(ukTab.classList.contains('active'), '英国标签处于激活态');

// 3. 切换到加拿大
const caTab = Array.from($$('.country-tab')).find((t) => t.dataset.code === 'CA');
caTab.dispatchEvent(new window.Event('click', { bubbles: true }));
const caTexts = Array.from($$('#result .row')).map((r) => r.querySelector('.v')?.textContent?.trim() || '');
check(caTexts.some((t) => /^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(t)), '加拿大邮编格式正确 (A1A 1A1)');

// 4. 切换到澳大利亚
const auTab = Array.from($$('.country-tab')).find((t) => t.dataset.code === 'AU');
auTab.dispatchEvent(new window.Event('click', { bubbles: true }));
const auTexts = Array.from($$('#result .row')).map((r) => r.querySelector('.v')?.textContent?.trim() || '');
check(auTexts.some((t) => /^04\d{2} \d{3} \d{3}$/.test(t)), '澳大利亚手机号格式正确 (04xx xxx xxx)');
check(auTexts.some((t) => /Australia/.test(t)), '国家显示为 Australia');

// 5. 批量生成
doc.querySelector('#batchCount').value = '7';
doc.querySelector('#batchBtn').dispatchEvent(new window.Event('click', { bubbles: true }));
const batchRows = $$('#batchResult .row');
check(batchRows.length === 7, `批量生成渲染 ${batchRows.length} 行（期望 7）`);
check(doc.querySelector('#batchResult').textContent.includes('7 条'), '批量结果标题显示数量');

// 6. 主题切换
const themeBtn = doc.querySelector('#themeBtn');
themeBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
check(doc.documentElement.getAttribute('data-theme') === 'light', '主题切换为浅色');
themeBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
check(doc.documentElement.getAttribute('data-theme') === 'dark', '主题切换回深色');

/* ---------- 导出校验 ---------- */

console.log('\n[导出]');
const mod = await import(resolve(root, 'src/lib/generator.js').replace(/\\/g, '/').replace(/^/, 'file:///'));
const exp = await import(resolve(root, 'src/lib/exporters.js').replace(/\\/g, '/').replace(/^/, 'file:///'));

const id = mod.generateIdentity('US');
const json = exp.toJSON(id);
const parsed = JSON.parse(json);
check(Object.keys(parsed).length === 41, `JSON 导出 ${Object.keys(parsed).length} 个字段（期望 41）`);
check(parsed.creditCardNumber.length >= 15, 'JSON 含信用卡号');

const csv = exp.toCSV([id, mod.generateIdentity('GB')]);
const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
check(lines.length === 3, `CSV 为 1 表头 + 2 数据行（实际 ${lines.length} 行）`);
check(csv.startsWith('\uFEFF'), 'CSV 含 UTF-8 BOM（Excel 不乱码）');

const sql = exp.toSQL([id], 'test_users');
check(/^INSERT INTO `test_users` \(/.test(sql), 'SQL 导出语句格式正确');

const txt = exp.toText([id, mod.generateIdentity('AU')]);
check(txt.includes('===== #1 =====') && txt.includes('===== #2 ====='), 'TXT 多条目分隔正确');

/* ---------- 汇总 ---------- */

console.log(`\n${'='.repeat(64)}`);
console.log(errors === 0 ? '✅ 界面冒烟测试全部通过' : `❌ 发现 ${errors} 个问题`);
console.log('='.repeat(64));
process.exit(errors > 0 ? 1 : 0);
