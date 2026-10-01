/**
 * 应用主入口：渲染界面、绑定交互
 */

import './style.css';
import { COUNTRY_LIST, generateIdentity, generateBatch } from './lib/generator.js';
import { copyText, download, toJSON, toCSV, toText, toSQL } from './lib/exporters.js';

/* ------------------------------------------------------------------ *
 * 状态
 * ------------------------------------------------------------------ */

const state = {
  country: 'US',
  identity: null,
  batch: [],
  theme: 'dark',
};

const $ = (sel) => document.querySelector(sel);

/* ------------------------------------------------------------------ *
 * Toast 提示
 * ------------------------------------------------------------------ */

function toast(msg, type = 'ok') {
  let host = $('.toast-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 320);
  }, 1900);
}

/* ------------------------------------------------------------------ *
 * 渲染工具
 * ------------------------------------------------------------------ */

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** 由姓名生成稳定的头像底色 */
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `linear-gradient(135deg, hsl(${h} 68% 52%), hsl(${(h + 42) % 360} 68% 42%))`;
}

/** 字段行 HTML */
function row(label, value, cls = '') {
  return `<div class="row">
    <span class="k">${esc(label)}</span>
    <span class="v ${cls}">${esc(value)}</span>
    <button class="copy-btn" data-copy="${esc(value)}" title="复制">📋</button>
  </div>`;
}

function card(icon, title, sub, bodyHTML) {
  return `<section class="card">
    <div class="card-head">
      <span class="ico">${icon}</span>
      <h2>${esc(title)}</h2>
      ${sub ? `<span class="sub">${esc(sub)}</span>` : ''}
    </div>
    <div class="card-body">${bodyHTML}</div>
  </section>`;
}

/* ------------------------------------------------------------------ *
 * 身份卡片渲染
 * ------------------------------------------------------------------ */

function renderIdentity(id) {
  const initials = (id.name.firstName[0] + id.name.lastName[0]).toUpperCase();

  /* --- 个人资料 --- */
  const profile = `
    <div class="avatar-block">
      <div class="avatar" style="background:${avatarColor(id.name.fullName)}">${esc(initials)}</div>
      <div class="avatar-info">
        <div class="nm">${esc(id.name.fullName)}</div>
        <div class="meta">
          <span>${id.country.flag} ${esc(id.country.zh)}</span>
          <span class="chip">${esc(id.name.gender.zh)}</span>
          <span>${esc(String(id.birthday.age))} 岁</span>
        </div>
      </div>
    </div>
    ${row('称谓', id.name.title)}
    ${row('名 First', id.name.firstName)}
    ${row('中间名 Middle', id.name.middleName)}
    ${row('姓 Last', id.name.lastName)}
    ${row('全名 Full', id.name.fullName, 'highlight')}
    ${row('性别 Gender', id.name.gender.en)}
    ${row('出生日期', id.birthday.date)}
    ${row('年龄 Age', String(id.birthday.age))}
    ${row('星座', `${id.zodiac.zh} / ${id.zodiac.en}`)}
    ${row('学历院校', id.university)}
  `;

  /* --- 联系方式 --- */
  const contact = `
    ${row('电话 Phone', id.phone, 'highlight')}
    ${row('邮箱 Email', id.email, 'highlight')}
    ${row('工作邮箱', id.employment.workEmail)}
  `;

  /* --- 地址 --- */
  const address = `
    ${row('街道 Street', id.address.street)}
    ${row('城市 City', `${id.address.city} (${id.address.cityZh})`)}
    ${row('州/省 State', `${id.address.stateName} (${id.address.state})`)}
    ${row('邮编 Postal', id.address.postal, 'highlight')}
    ${row('国家', `${id.address.country} / ${id.address.countryZh}`)}
    ${row('完整地址', id.address.full, 'highlight')}
  `;

  /* --- 证件号码 --- */
  const ids = `
    ${row(id.nationalId.label.zh, id.nationalId.value, 'sensitive')}
    ${row('驾驶证号', id.license, 'sensitive')}
    ${row('账号 Account#', id.account.accountNumber)}
    ${row('路由号 Routing', id.account.routingNumber)}
    ${row('IBAN', id.account.iban)}
    ${row('UUID', id.account.uuid)}
  `;

  /* --- 工作信息 --- */
  const work = `
    ${row('公司 Company', id.employment.company)}
    ${row('职位 Title', id.employment.title)}
    ${row('年薪 Income', `$${id.employment.annualIncome.toLocaleString('en-US')}`)}
    ${row('在职年限', `${id.employment.yearsOfService} 年`)}
  `;

  /* --- 身体特征 --- */
  const physical = `
    ${row('身高 Height', `${id.physical.heightMetric} / ${id.physical.heightImperial}`)}
    ${row('体重 Weight', `${id.physical.weightMetric} / ${id.physical.weightImperial}`)}
    ${row('血型 Blood', id.physical.bloodType)}
    ${row('眼睛 Eye', id.physical.eyeColor)}
    ${row('头发 Hair', id.physical.hairColor)}
  `;

  /* --- 信用卡（测试号段） --- */
  const cardInfo = `
    ${row('卡组织 Brand', id.card.brand)}
    ${row('卡号 Number', id.card.formatted, 'sensitive')}
    ${row('有效期 Exp', id.card.expiry)}
    ${row('CVV', id.card.cvv, 'sensitive')}
  `;

  /* --- 网络账号 --- */
  const account = `
    ${row('用户名', id.account.username)}
    ${row('密码', id.account.password, 'sensitive')}
    ${id.account.securityQuestions
      .map((q, i) => row(`安全问题 ${i + 1}`, `${q.q} → ${q.a}`))
      .join('')}
  `;

  const html = `
    <div class="grid">
      ${card('👤', '个人资料', 'Personal', profile)}
      ${card('📍', '地址信息', 'Address', address)}
      ${card('📞', '联系方式', 'Contact', contact)}
      ${card('🪪', '证件号码', 'Identifiers', ids)}
      ${card('💼', '工作与财务', 'Employment', work)}
      ${card('🩺', '身体特征', 'Physical', physical)}
      ${card('💳', '银行卡（测试号段）', 'Card', cardInfo)}
      ${card('🔐', '网络账号', 'Account', account)}
    </div>
  `;

  $('#result').innerHTML = html;

  // 卡片入场动画错峰
  document.querySelectorAll('.card').forEach((c, i) => {
    c.style.animationDelay = `${i * 34}ms`;
  });
}

/* ------------------------------------------------------------------ *
 * 批量结果渲染
 * ------------------------------------------------------------------ */

function renderBatch(list) {
  if (!list.length) {
    $('#batchResult').innerHTML = '';
    return;
  }
  const rowsHTML = list
    .map((id, i) => `<div class="row">
      <span class="k">#${i + 1}</span>
      <span class="v">${esc(id.name.fullName)} · ${esc(id.name.gender.zh)} · ${esc(id.birthday.date)}
        · ${esc(id.address.city)} · ${esc(id.address.postal)} · ${esc(id.phone)} · ${esc(id.email)}</span>
      <button class="copy-btn" data-copy="${esc(id.name.fullName + ' | ' + id.email + ' | ' + id.phone)}" title="复制">📋</button>
    </div>`)
    .join('');

  $('#batchResult').innerHTML = `
    <section class="card">
      <div class="card-head">
        <span class="ico">📦</span>
        <h2>批量生成结果（${list.length} 条）</h2>
        <span class="sub">${esc(list[0].country.code)}</span>
      </div>
      <div class="card-body">${rowsHTML}</div>
    </section>
  `;
}

/* ------------------------------------------------------------------ *
 * 主界面骨架
 * ------------------------------------------------------------------ */

function renderShell() {
  $('#app').innerHTML = `
    <div class="wrap">
      <header class="topbar">
        <div class="brand">
          <div class="brand-logo">🪪</div>
          <div class="brand-text">
            <h1>虚拟身份生成器</h1>
            <p>Fake Identity Generator · 美国 / 英国 / 加拿大 / 澳大利亚</p>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-icon" id="themeBtn" title="切换主题">🌙</button>
          <button class="btn btn-icon" id="printBtn" title="打印 / 导出 PDF">🖨️</button>
        </div>
      </header>

      <div class="notice">
        <span class="ico">⚠️</span>
        <div>
          <strong>合法用途声明：</strong>本工具生成的全部姓名、地址、证件号与卡号均为程序随机组合的
          <strong>虚构数据</strong>，不对应任何真实个人或账户，卡号仅使用公开测试号段。
          仅可用于<strong>开发者测试自己产品的表单校验与注册流程</strong>、界面演示等非真实业务场景。
          严禁用于真实账号注册、KYC 认证、金融交易等任何欺诈或违法行为。
        </div>
      </div>

      <section class="controls">
        <div class="control-row">
          <div class="field" style="flex:1 1 100%">
            <label>选择国家 / 地区</label>
            <div class="country-tabs" id="countryTabs">
              ${COUNTRY_LIST.map((c) => `
                <button class="country-tab ${c.code === state.country ? 'active' : ''}" data-code="${c.code}">
                  <span class="flag">${c.flag}</span>${esc(c.nameZh)}
                </button>`).join('')}
            </div>
          </div>
        </div>
        <div class="control-row" style="margin-top:15px">
          <button class="btn btn-primary" id="genBtn">🎲 生成一份虚拟身份</button>
          <div class="spacer"></div>
          <button class="btn" id="copyAllBtn">📋 复制全部</button>
          <button class="btn" id="jsonBtn">⬇️ JSON</button>
          <button class="btn" id="csvBtn">⬇️ CSV</button>
        </div>
      </section>

      <div id="result">
        <div class="empty">
          <div class="big">🎲</div>
          <div>选择国家后点击「生成一份虚拟身份」开始</div>
        </div>
      </div>

      <section class="batch-area">
        <h2>📦 批量生成</h2>
        <p class="hint">一次生成多条数据，可导出为 JSON / CSV / SQL，方便填充测试数据库或做压力测试。</p>
        <div class="control-row">
          <div class="field">
            <label>数量（1–50）</label>
            <input type="number" id="batchCount" value="10" min="1" max="50" />
          </div>
          <button class="btn btn-primary" id="batchBtn">批量生成</button>
          <div class="spacer"></div>
          <button class="btn btn-sm" id="bJson">⬇️ JSON</button>
          <button class="btn btn-sm" id="bCsv">⬇️ CSV</button>
          <button class="btn btn-sm" id="bSql">⬇️ SQL</button>
          <button class="btn btn-sm" id="bTxt">⬇️ TXT</button>
        </div>
        <div id="batchResult" style="margin-top:15px"></div>
      </section>

      <footer class="footer">
        <div>本工具为 <strong>haoweichi.com 的开源自建替代实现</strong>，纯静态、无后端、无追踪，所有数据在浏览器本地生成，不会上传到任何服务器。</div>
        <div>数据来源：公开姓名库、城市库与号码格式规则。生成结果均为虚构，仅供开发测试使用。</div>
        <div style="margin-top:6px">如用于测试，请在使用完毕后清除相关测试数据。<a href="#" id="backTop">回到顶部</a></div>
      </footer>
    </div>
  `;
}

/* ------------------------------------------------------------------ *
 * 交互逻辑
 * ------------------------------------------------------------------ */

function currentCountryName() {
  const c = COUNTRY_LIST.find((x) => x.code === state.country);
  return c ? c.nameZh : '美国';
}

function doGenerate() {
  state.identity = generateIdentity(state.country);
  renderIdentity(state.identity);
  toast(`已生成 ${currentCountryName()} 虚拟身份`);
}

function doBatch() {
  const raw = parseInt($('#batchCount').value, 10);
  const n = Math.max(1, Math.min(50, Number.isNaN(raw) ? 10 : raw));
  $('#batchCount').value = String(n);
  state.batch = generateBatch(state.country, n);
  renderBatch(state.batch);
  toast(`已批量生成 ${n} 条数据`);
}

/** 收集当前页面上所有可见字段值，用于「复制全部」 */
function collectAll() {
  const pairs = [];
  document.querySelectorAll('#result .row').forEach((r) => {
    const k = r.querySelector('.k')?.textContent?.trim();
    const v = r.querySelector('.v')?.textContent?.trim();
    if (k && v) pairs.push(`${k}: ${v}`);
  });
  return pairs.join('\n');
}

function bindEvents() {
  // 国家切换
  $('#countryTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.country-tab');
    if (!btn) return;
    state.country = btn.dataset.code;
    document.querySelectorAll('.country-tab').forEach((t) =>
      t.classList.toggle('active', t === btn));
    doGenerate();
  });

  $('#genBtn').addEventListener('click', doGenerate);
  $('#batchBtn').addEventListener('click', doBatch);

  // 复制全部
  $('#copyAllBtn').addEventListener('click', async () => {
    const text = collectAll();
    if (!text) return toast('暂无内容可复制', 'err');
    (await copyText(text)) ? toast('已复制全部字段') : toast('复制失败', 'err');
  });

  // 单个导出
  $('#jsonBtn').addEventListener('click', () => {
    if (!state.identity) return toast('请先生成一份身份', 'err');
    download('identity.json', toJSON(state.identity), 'application/json;charset=utf-8');
    toast('已导出 JSON');
  });
  $('#csvBtn').addEventListener('click', () => {
    if (!state.identity) return toast('请先生成一份身份', 'err');
    download('identity.csv', toCSV(state.identity), 'text/csv;charset=utf-8');
    toast('已导出 CSV');
  });

  // 批量导出
  const guardBatch = () => {
    if (!state.batch.length) { toast('请先执行批量生成', 'err'); return false; }
    return true;
  };
  $('#bJson').addEventListener('click', () => guardBatch() && download('batch.json', toJSON(state.batch), 'application/json;charset=utf-8'));
  $('#bCsv').addEventListener('click', () => guardBatch() && download('batch.csv', toCSV(state.batch), 'text/csv;charset=utf-8'));
  $('#bSql').addEventListener('click', () => guardBatch() && download('batch.sql', toSQL(state.batch), 'text/plain;charset=utf-8'));
  $('#bTxt').addEventListener('click', () => guardBatch() && download('batch.txt', toText(state.batch)));

  // 全局复制按钮（事件委托）
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const val = btn.dataset.copy;
    const ok = await copyText(val);
    if (ok) {
      btn.classList.add('copied');
      btn.textContent = '✅';
      setTimeout(() => { btn.classList.remove('copied'); btn.textContent = '📋'; }, 1100);
    } else {
      toast('复制失败，请手动选择', 'err');
    }
  });

  // 主题切换
  $('#themeBtn').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    $('#themeBtn').textContent = state.theme === 'dark' ? '🌙' : '☀️';
    try { localStorage.setItem('fig-theme', state.theme); } catch (err) { /* 忽略隐私模式报错 */ }
  });

  $('#printBtn').addEventListener('click', () => window.print());
  $('#backTop').addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 快捷键：G 生成，B 批量
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === 'g' || e.key === 'G') doGenerate();
    if (e.key === 'b' || e.key === 'B') doBatch();
  });
}

/* ------------------------------------------------------------------ *
 * 启动
 * ------------------------------------------------------------------ */

function init() {
  // 恢复主题
  try {
    const saved = localStorage.getItem('fig-theme');
    if (saved === 'light') {
      state.theme = 'light';
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (e) { /* 忽略 */ }

  renderShell();
  if (state.theme === 'light') $('#themeBtn').textContent = '☀️';
  bindEvents();
  doGenerate(); // 首屏直接给出一份数据
}

init();
