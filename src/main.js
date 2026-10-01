/**
 * 应用主入口
 *
 * 界面结构：
 *   顶部四个页签 —— 临时身份 / 临时地址 / 临时邮箱 / 临时信用卡
 *   每个页签下先给出该功能的用途介绍，再是生成结果与操作按钮。
 */

import './style.css';
import {
  COUNTRY_LIST, REGION_GROUPS, generateIdentity, generateBatch,
  getStates, getCities,
} from './lib/generator.js';
import { copyText, download, toJSON, toCSV, toText, toSQL } from './lib/exporters.js';

/* ------------------------------------------------------------------ *
 * 状态
 * ------------------------------------------------------------------ */

const state = {
  tab: 'identity',           // identity | address | email | card
  country: 'US',
  gender: 'any',
  stateFilter: '',
  cityFilter: '',
  identity: null,
  batch: [],
  theme: 'light',            // 默认白天（浅色）主题
};

const $ = (sel) => document.querySelector(sel);

/* ------------------------------------------------------------------ *
 * 开源仓库入口
 * ------------------------------------------------------------------ */

const REPO_URL = 'https://github.com/sdlw7757/Fake-Identity-Generator';

/** GitHub 官方 mark 图标（16×16 视口，随字号取色） */
const GITHUB_ICON = `<svg viewBox="0 0 16 16" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>`;

/* ------------------------------------------------------------------ *
 * 页签定义（含每页介绍文字）
 * ------------------------------------------------------------------ */

const TABS = [
  {
    key: 'identity',
    icon: '🪪',
    title: '临时身份',
    sub: 'Identity',
    desc: '生成一份完整的虚拟身份资料：个人资料、信用卡、教育背景、职业信息、联系方式、证件号码、身体特征、生活方式与在线资料。全部字段均为随机合成的虚构数据，用于填写注册表单时参考格式。',
    points: ['个人资料 + 信用卡信息', '教育背景 + 职业信息', '证件 / 联系方式 / 生活方式 / 在线资料'],
  },
  {
    key: 'address',
    icon: '📍',
    title: '临时地址',
    sub: 'Address',
    desc: '生成符合该国邮政规则的真实格式地址，包含街道、城市、州/省与邮政编码。可按州/省与城市筛选，方便针对特定地区测试。',
    points: ['街道 + 城市 + 州/省', '符合本国格式的邮编', '支持按州/城市筛选'],
  },
  {
    key: 'email',
    icon: '📧',
    title: '临时邮箱',
    sub: 'Email',
    desc: '根据生成的姓名组合出常见的邮箱地址格式，并附带用户名与强密码。用于测试邮箱格式校验与注册流程。',
    points: ['多种常见邮箱命名风格', '配套用户名 / 密码', '安全问题与 UUID'],
  },
  {
    key: 'card',
    icon: '💳',
    title: '临时信用卡',
    sub: 'Credit Card',
    desc: '生成通过 Luhn 校验的银行卡号，覆盖 Visa / MasterCard / American Express 等主要卡组织，并区分各自的位数与 CVV 长度规则。',
    points: ['Luhn 校验合法', '各卡组织位数差异', '有效期 / CVV'],
  },
];

/* ------------------------------------------------------------------ *
 * Toast
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

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `linear-gradient(135deg, hsl(${h} 68% 52%), hsl(${(h + 42) % 360} 68% 42%))`;
}

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

/** 当前筛选条件（传给生成引擎） */
function currentOpts() {
  const opts = { gender: state.gender };
  if (state.stateFilter) opts.state = state.stateFilter;
  if (state.cityFilter) opts.city = state.cityFilter;
  return opts;
}

/* ------------------------------------------------------------------ *
 * 各页签内容渲染
 * ------------------------------------------------------------------ */

function viewIdentity(id) {
  const initials = (id.name.firstName[0] + id.name.lastName[0]).toUpperCase();
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
    ${row('名 First Name', id.name.firstName)}
    ${row('中间名 Middle', id.name.middleName)}
    ${row('姓 Last Name', id.name.lastName)}
    ${row('全名 Full Name', id.name.fullName, 'highlight')}
    ${row('性别 Gender', id.name.gender.en)}
    ${row('出生日期', id.birthday.date)}
    ${row('年龄 Age', String(id.birthday.age))}
    ${row('星座', `${id.zodiac.zh} / ${id.zodiac.en}`)}
  `;

  // 教育信息：独立卡片，含学历 / 专业 / 毕业院校 / 毕业年份
  const education = `
    ${row('学历 Degree', `${id.education.degreeZh} ${id.education.degreeEn}`)}
    ${row('专业 Major', id.education.major, 'highlight')}
    ${row('毕业院校', id.education.university)}
    ${row('毕业年份', `${id.education.graduationYear} 年`)}
  `;

  // 职业信息：独立卡片
  const work = `
    ${row('公司 Company', id.employment.company)}
    ${row('职位 Title', id.employment.title, 'highlight')}
    ${row('年薪 Income', `$${id.employment.annualIncome.toLocaleString('en-US')}`)}
    ${row('在职年限', `${id.employment.yearsOfService} 年`)}
  `;

  // 生活方式 / 个性偏好卡片（英文）
  const lifestyle = `
    ${row('Hobby', id.lifestyle.hobby, 'highlight')}
    ${row('Favorite Sport', id.lifestyle.sport)}
    ${row('Favorite Food', id.lifestyle.favoriteFood)}
    ${row('Pets', id.lifestyle.pets)}
    ${row('Smoking', id.lifestyle.smoking)}
    ${row('Drinking', id.lifestyle.drinking)}
  `;

  // 在线资料：用户名 / 密码 / 个人网站 / 浏览器 UA / IP
  const online = `
    ${row('用户名 Username', id.account.username, 'highlight')}
    ${row('密码 Password', id.account.password, 'sensitive')}
    ${row('个人网站 Website', id.online.website)}
    ${row('浏览器 UA', id.online.userAgent)}
    ${row('IP 地址 IP', id.online.ip)}
  `;

  // 信用卡信息：排在个人资料之后
  const cardInfo = `
    ${row('卡组织 Brand', id.card.brand, 'highlight')}
    ${row('卡号 Number', id.card.formatted, 'sensitive')}
    ${row('有效期 Expiry', id.card.expiry)}
    ${row('CVV', id.card.cvv, 'sensitive')}
    ${row('持卡人 Cardholder', id.name.fullName.toUpperCase())}
    ${row('发卡行 Issuer', id.card.issuer)}
    ${row('国家 Country', `${id.country.flag} ${esc(id.country.zh)} / ${esc(id.country.en)}`)}
  `;

  const contact = `
    ${row('电话 Phone', id.phone, 'highlight')}
    ${row('邮箱 Email', id.email, 'highlight')}
    ${row('工作邮箱', id.employment.workEmail)}
  `;

  const bankRows = [
    row('账号 Account#', id.account.accountNumber),
    id.account.routingNumber ? row('路由号 Routing', id.account.routingNumber) : '',
    id.account.sortCode ? row('Sort Code', id.account.sortCode) : '',
    id.account.bsb ? row('BSB', id.account.bsb) : '',
    id.account.blz ? row('银行代码 BLZ', id.account.blz) : '',
    id.account.rib ? row('RIB', id.account.rib) : '',
    id.account.swift ? row('SWIFT', id.account.swift) : '',
    // 仅在使用 IBAN 的国家显示（美国 / 加拿大 / 澳大利亚等并无 IBAN）
    id.account.iban ? row('IBAN', id.account.iban) : '',
  ].join('');

  const ids = `
    ${row(id.nationalId.label.zh, id.nationalId.value, 'sensitive')}
    ${row('驾驶证号', id.license, 'sensitive')}
    ${bankRows}
    ${row('UUID', id.account.uuid)}
  `;

  const physical = `
    ${row('身高 Height', `${id.physical.heightMetric} / ${id.physical.heightImperial}`)}
    ${row('体重 Weight', `${id.physical.weightMetric} / ${id.physical.weightImperial}`)}
    ${row('血型 Blood', id.physical.bloodType)}
    ${row('眼睛 Eye', id.physical.eyeColor)}
    ${row('头发 Hair', id.physical.hairColor)}
  `;

  return `<div class="grid">
    ${card('👤', '个人资料', 'Personal', profile)}
    ${card('💳', '信用卡信息', 'Card', cardInfo)}
    ${card('🎓', '教育信息', 'Education', education)}
    ${card('💼', '职业信息', 'Employment', work)}
    ${card('📞', '联系方式', 'Contact', contact)}
    ${card('🪪', '证件号码', 'Identifiers', ids)}
    ${card('🩺', '身体特征', 'Physical', physical)}
    ${card('🎯', '生活方式', 'Lifestyle', lifestyle)}
    ${card('🖥️', '在线资料', 'Online', online)}
  </div>`;
}

function viewAddress(id) {
  return `<div class="grid">
    ${card('📍', '地址信息', 'Address', `
      ${row('街道 Street', id.address.street, 'highlight')}
      ${row('城市 City', id.address.city)}
      ${row('城市（中文）', id.address.cityZh)}
      ${row('州/省 State', id.address.state)}
      ${row('邮编 Postal', id.address.postal, 'highlight')}
      ${row('国家 Country', `${id.address.country} / ${id.address.countryZh}`)}
      ${row('单行完整地址', id.address.full, 'highlight')}
    `)}
    ${card('📮', '邮寄格式', 'Mailing', `
      <div class="mail-block">
        <div class="mail-line">${esc(id.name.fullName)}</div>
        <div class="mail-line">${esc(id.address.street)}</div>
        <div class="mail-line">${esc(id.address.city)}, ${esc(id.address.state)} ${esc(id.address.postal)}</div>
        <div class="mail-line">${esc(id.address.country)}</div>
        <button class="copy-btn inline" data-copy="${esc(
          `${id.name.fullName}\n${id.address.street}\n${id.address.city}, ${id.address.state} ${id.address.postal}\n${id.address.country}`
        )}" title="复制完整邮寄地址">📋 复制</button>
      </div>
    `)}
    ${card('🧭', '格式说明', 'Format', `
      ${row('电话', id.phone)}
      ${row('邮编格式', COUNTRY_LIST.find((c) => c.code === id.countryCode)?.postalTpl || '')}
    `)}
  </div>`;
}

function viewEmail(id) {
  return `<div class="grid">
    ${card('📧', '邮箱地址', 'Email', `
      ${row('邮箱 Email', id.email, 'highlight')}
      ${row('工作邮箱', id.employment.workEmail)}
      ${row('用户名 Username', id.account.username)}
      ${row('姓名', id.name.fullName)}
    `)}
    ${card('🔐', '账号安全', 'Account', `
      ${row('密码 Password', id.account.password, 'sensitive')}
      ${row('UUID', id.account.uuid)}
      ${id.account.securityQuestions.map((q, i) => row(`安全问题 ${i + 1}`, `${q.q} → ${q.a}`)).join('')}
    `)}
  </div>`;
}

function viewCard(id) {
  return `<div class="grid">
    ${card('💳', '银行卡', 'Card', `
      ${row('卡组织 Brand', id.card.brand, 'highlight')}
      ${row('卡号 Number', id.card.formatted, 'sensitive')}
      ${row('有效期 Expiry', id.card.expiry)}
      ${row('CVV', id.card.cvv, 'sensitive')}
      ${row('持卡人 Cardholder', id.name.fullName.toUpperCase())}
      ${row('发卡行 Issuer', id.card.issuer)}
      ${row('国家 Country', `${id.country.flag} ${esc(id.country.zh)} / ${esc(id.country.en)}`)}
      ${row('账单地址', id.address.full)}
    `)}
    ${card('🔢', '卡号明细', 'Details', `
      ${row('卡号（无空格）', id.card.number)}
      ${row('卡号长度', `${id.card.number.length} 位`)}
      ${row('CVV 长度', `${id.card.cvv.length} 位`)}
      ${row('Luhn 校验', '通过 ✓')}
    `)}
  </div>`;
}

const VIEWS = {
  identity: viewIdentity,
  address: viewAddress,
  email: viewEmail,
  card: viewCard,
};

function renderIdentity(id) {
  $('#result').innerHTML = VIEWS[state.tab](id);
  document.querySelectorAll('.card').forEach((c, i) => {
    c.style.animationDelay = `${i * 34}ms`;
  });
}

/* ------------------------------------------------------------------ *
 * 界面骨架
 * ------------------------------------------------------------------ */

function renderShell() {
  $('#app').innerHTML = `
    <div class="wrap">
      <header class="topbar">
        <div class="brand">
          <div class="brand-logo">🪪</div>
          <div class="brand-text">
            <h1>虚拟身份生成器</h1>
            <p>Fake Identity Generator · 全球 ${COUNTRY_LIST.length} 个国家 / 地区</p>
          </div>
        </div>
        <div class="topbar-actions">
          <a class="btn btn-icon gh-link" href="${REPO_URL}" target="_blank" rel="noopener noreferrer"
             title="在 GitHub 上查看开源代码" aria-label="GitHub 开源仓库">${GITHUB_ICON}</a>
          <button class="btn btn-icon" id="themeBtn" title="切换主题">${state.theme === 'dark' ? '🌙' : '☀️'}</button>
          <button class="btn btn-icon" id="printBtn" title="打印 / 导出 PDF">🖨️</button>
        </div>
      </header>

      <nav class="main-tabs" id="mainTabs">
        ${TABS.map((t) => `
          <button class="main-tab ${t.key === state.tab ? 'active' : ''}" data-tab="${t.key}">
            <span class="tab-icon">${t.icon}</span>
            <span class="tab-label">${esc(t.title)}</span>
            <span class="tab-sub">${esc(t.sub)}</span>
          </button>`).join('')}
      </nav>

      <section class="tab-intro" id="tabIntro"></section>

      <section class="controls">
        <div class="control-row">
          <div class="field">
            <label>国家 / 地区</label>
            <select id="countrySelect">
              ${REGION_GROUPS.map((r) => `
                <optgroup label="${r.icon} ${esc(r.nameZh)}">
                  ${r.countries.map((c) => `
                    <option value="${c.code}" ${c.code === state.country ? 'selected' : ''}>
                      ${c.flag} ${esc(c.nameZh)} (${c.code})
                    </option>`).join('')}
                </optgroup>`).join('')}
            </select>
          </div>

          <div class="field">
            <label>性别</label>
            <select id="genderSelect">
              <option value="any">不限</option>
              <option value="M">男</option>
              <option value="F">女</option>
            </select>
          </div>

          <div class="field">
            <label>州 / 省</label>
            <select id="stateSelect"><option value="">不限</option></select>
          </div>

          <div class="field">
            <label>城市</label>
            <select id="citySelect"><option value="">不限</option></select>
          </div>

          <button class="btn btn-primary" id="genBtn">🎲 生成</button>
        </div>
      </section>

      <div id="result"></div>

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
        <div class="notice footer-notice">
          <span class="ico">⚠️</span>
          <div>
            <strong>合法用途声明：</strong>本工具生成的全部姓名、地址、证件号与卡号均为程序随机组合的
            <strong>虚构数据</strong>，不对应任何真实个人或账户。
            仅可用于<strong>开发者测试自己产品的表单校验与注册流程</strong>、界面演示等非真实业务场景。
            严禁用于真实账号注册、KYC 认证、金融交易等任何欺诈或违法行为。
          </div>
        </div>
        <div>纯静态、无后端、无追踪，所有数据在浏览器本地生成，不会上传到任何服务器。</div>
        <div>数据来源：公开姓名库、城市库与号码格式规则。生成结果均为虚构，仅供开发测试使用。</div>
        <div class="footer-github">
          <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">
            ${GITHUB_ICON}
            <span>本项目已在 GitHub 开源，欢迎 Star / 提交 Issue</span>
          </a>
        </div>
      </footer>
    </div>
  `;
}

/* ------------------------------------------------------------------ *
 * 交互
 * ------------------------------------------------------------------ */

function currentTabMeta() {
  return TABS.find((t) => t.key === state.tab) || TABS[0];
}

function renderIntro() {
  const t = currentTabMeta();
  $('#tabIntro').innerHTML = `
    <div class="intro-head">
      <span class="intro-icon">${t.icon}</span>
      <div>
        <h2>${esc(t.title)}<span class="intro-sub">${esc(t.sub)}</span></h2>
        <p>${esc(t.desc)}</p>
      </div>
    </div>
    <ul class="intro-points">
      ${t.points.map((p) => `<li>${esc(p)}</li>`).join('')}
    </ul>
  `;
}

function refreshStateSelect() {
  const sel = $('#stateSelect');
  const states = getStates(state.country);
  sel.innerHTML = '<option value="">不限</option>' +
    states.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  state.stateFilter = '';
  refreshCitySelect();
}

function refreshCitySelect() {
  const sel = $('#citySelect');
  const cities = getCities(state.country, state.stateFilter);
  sel.innerHTML = '<option value="">不限</option>' +
    cities.map((c) => `<option value="${esc(c.city)}">${esc(c.city)}${c.cityZh ? ` (${esc(c.cityZh)})` : ''}</option>`).join('');
  state.cityFilter = '';
}

function doGenerate() {
  state.identity = generateIdentity(state.country, currentOpts());
  renderIdentity(state.identity);
}

function doBatch() {
  const raw = parseInt($('#batchCount').value, 10);
  const n = Math.max(1, Math.min(50, Number.isNaN(raw) ? 10 : raw));
  $('#batchCount').value = String(n);
  state.batch = generateBatch(state.country, n, currentOpts());
  renderBatch(state.batch);
  toast(`已批量生成 ${n} 条数据`);
}

function renderBatch(list) {
  if (!list.length) { $('#batchResult').innerHTML = ''; return; }
  const rowsHTML = list.map((id, i) => `<div class="row">
      <span class="k">#${i + 1}</span>
      <span class="v">${esc(id.name.fullName)} · ${esc(id.name.gender.zh)} · ${esc(id.birthday.date)}
        · ${esc(id.address.city)} · ${esc(id.address.postal)} · ${esc(id.phone)} · ${esc(id.email)}</span>
      <button class="copy-btn" data-copy="${esc(`${id.name.fullName} | ${id.email} | ${id.phone}`)}" title="复制">📋</button>
    </div>`).join('');

  $('#batchResult').innerHTML = `
    <section class="card">
      <div class="card-head">
        <span class="ico">📦</span>
        <h2>批量生成结果（${list.length} 条）</h2>
        <span class="sub">${esc(list[0].countryCode)}</span>
      </div>
      <div class="card-body">${rowsHTML}</div>
    </section>`;
}

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
  // 页签切换：复用同一份身份数据，避免切换页签时「换了一个人」
  $('#mainTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.main-tab');
    if (!btn) return;
    state.tab = btn.dataset.tab;
    document.querySelectorAll('.main-tab').forEach((t) =>
      t.classList.toggle('active', t === btn));
    renderIntro();
    if (!state.identity) doGenerate();
    else renderIdentity(state.identity);
  });

  $('#countrySelect').addEventListener('change', (e) => {
    state.country = e.target.value;
    refreshStateSelect();
    doGenerate();
  });
  $('#genderSelect').addEventListener('change', (e) => {
    state.gender = e.target.value;
    doGenerate();
  });
  $('#stateSelect').addEventListener('change', (e) => {
    state.stateFilter = e.target.value;
    refreshCitySelect();
    doGenerate();
  });
  $('#citySelect').addEventListener('change', (e) => {
    state.cityFilter = e.target.value;
    doGenerate();
  });

  $('#genBtn').addEventListener('click', () => { doGenerate(); toast('已重新生成'); });
  $('#batchBtn').addEventListener('click', doBatch);

  // 全局复制
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const ok = await copyText(btn.dataset.copy);
    if (ok) {
      if (!btn.classList.contains('inline')) {
        btn.classList.add('copied');
        btn.textContent = '✅';
        setTimeout(() => { btn.classList.remove('copied'); btn.textContent = '📋'; }, 1100);
      } else {
        const old = btn.textContent;
        btn.textContent = '✅ 已复制';
        setTimeout(() => { btn.textContent = old; }, 1100);
      }
    } else {
      toast('复制失败，请手动选择', 'err');
    }
  });

  // 批量导出
  const guard = () => {
    if (!state.batch.length) { toast('请先执行批量生成', 'err'); return false; }
    return true;
  };
  $('#bJson').addEventListener('click', () => guard() && download('batch.json', toJSON(state.batch), 'application/json;charset=utf-8'));
  $('#bCsv').addEventListener('click', () => guard() && download('batch.csv', toCSV(state.batch), 'text/csv;charset=utf-8'));
  $('#bSql').addEventListener('click', () => guard() && download('batch.sql', toSQL(state.batch), 'text/plain;charset=utf-8'));
  $('#bTxt').addEventListener('click', () => guard() && download('batch.txt', toText(state.batch)));

  // 主题
  $('#themeBtn').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    $('#themeBtn').textContent = state.theme === 'dark' ? '🌙' : '☀️';
    try { localStorage.setItem('fig-theme', state.theme); } catch (err) { /* 忽略 */ }
  });

  $('#printBtn').addEventListener('click', () => window.print());

  // 快捷键
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === 'g' || e.key === 'G') doGenerate();
    if (e.key === 'b' || e.key === 'B') doBatch();
    const idx = ['1', '2', '3', '4'].indexOf(e.key);
    if (idx >= 0) {
      const btn = document.querySelectorAll('.main-tab')[idx];
      if (btn) btn.click();
    }
  });
}

/* ------------------------------------------------------------------ *
 * 启动
 * ------------------------------------------------------------------ */

function init() {
  // 默认浅色主题；仅当用户此前显式切换到深色时才恢复深色
  try {
    if (localStorage.getItem('fig-theme') === 'dark') state.theme = 'dark';
  } catch (e) { /* 忽略隐私模式报错 */ }
  document.documentElement.setAttribute('data-theme', state.theme);

  renderShell();
  $('#themeBtn').textContent = state.theme === 'dark' ? '🌙' : '☀️';
  renderIntro();
  refreshStateSelect();
  bindEvents();
  doGenerate();
}

init();
