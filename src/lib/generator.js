/**
 * 身份生成引擎（规则驱动版）
 *
 * 通过 countryMeta.js 中的「国家格式规则」+ data/*.js 中的「姓名/城市素材库」
 * 组合出一份「格式合法」的虚拟身份资料。
 *
 * 设计要点：引擎本身不含任何针对具体国家的 if/else 分支，
 * 新增国家只需在 countryMeta.js 登记规则 + 放入一个数据模块即可。
 *
 * ⚠️ 所有数据均为程序随机组合的虚构信息，仅用于：
 *    1. 开发者测试自己产品的表单校验 / 注册流程
 *    2. 非真实业务的界面演示
 *    严禁用于真实账号注册、KYC、金融交易等任何欺诈用途。
 */

import { COUNTRY_META, NAME_ORDER, ID_KIND, REGIONS, ALL_CODES } from '../data/countryMeta.js';
import { randInt, pick, pickMany, chance, fillTemplate, fillPhone, digits, fmtDate, uuidv4 } from './random.js';
import { makeCardNumber, luhnCheckDigit } from './luhn.js';
import { datasets } from '../data/index.js';

/* ------------------------------------------------------------------ *
 * 数据源解析
 *
 * 国家素材库由 data/index.js 统一汇总后导入。
 * 这里不使用 import.meta.glob，因为那是 Vite 专有 API，
 * 会在纯 Node（自检脚本）环境下报错。
 * 新增国家：放入 data/xx.js 后，在 data/index.js 中登记一行即可。
 * ------------------------------------------------------------------ */

const DATASETS = datasets;

/** 合并元数据与素材库，得到完整的数据源对象 */
function resolveDataset(code) {
  const meta = COUNTRY_META[code];
  if (!meta) return null;
  const data = DATASETS[code] || {};
  return { ...meta, ...data, code, meta };
}

/** 合并后的国家列表（按大洲顺序）—— 只保留已具备数据模块的国家 */
export const COUNTRY_LIST = ALL_CODES
  .map(resolveDataset)
  .filter(Boolean)
  .filter((c) => c.cities && c.cities.length && c.maleFirst && c.maleFirst.length && c.lastNames && c.lastNames.length);

/** code -> 完整数据源 */
export const COUNTRIES = Object.fromEntries(COUNTRY_LIST.map((c) => [c.code, c]));

/** 按大洲分组的国家列表，供界面分组展示 */
export const REGION_GROUPS = REGIONS
  .map((r) => ({ ...r, countries: COUNTRY_LIST.filter((c) => c.region === r.key) }))
  .filter((r) => r.countries.length > 0);

/** 有数据模块的国家数量（用于自检提示） */
export const LOADED_COUNT = Object.keys(DATASETS).length;

/* ------------------------------------------------------------------ *
 * 基础字段
 * ------------------------------------------------------------------ */

/** 按国家的姓名顺序组装全名 */
function composeName(first, middle, last, order) {
  if (order === NAME_ORDER.EAST) return `${last} ${first}`;            // 姓在前
  if (order === NAME_ORDER.LATIN) return `${first} ${last}`;           // 名 姓
  return `${first} ${middle} ${last}`;                                  // 名 中间名 姓
}

/** 生成姓名 —— opts.gender: 'M' | 'F' | 'any' */
function genName(ds, opts = {}) {
  const want = opts.gender;
  const female = want === 'F' ? true : want === 'M' ? false : chance(0.5);
  const first = pick(female ? ds.femaleFirst : ds.maleFirst);
  const middle = pick(female ? ds.femaleFirst : ds.maleFirst);
  const last = pick(ds.lastNames);
  const title = female ? (chance(0.5) ? 'Ms.' : 'Mrs.') : 'Mr.';
  const order = ds.order || NAME_ORDER.WEST;
  const fullName = composeName(first, middle, last, order);
  return {
    firstName: first,
    middleName: middle,
    lastName: last,
    title,
    fullName,
    shortName: composeName(first, '', last, order).replace(/\s+/g, ' ').trim(),
    gender: female ? { zh: '女', en: 'Female' } : { zh: '男', en: 'Male' },
    genderKey: female ? 'F' : 'M',
  };
}

/** 生成生日 / 年龄 */
function genBirthday(minAge = 18, maxAge = 65) {
  const today = new Date();

  const ageOf = (d) => {
    let a = today.getFullYear() - d.getFullYear();
    const hadBirthday =
      today.getMonth() > d.getMonth() ||
      (today.getMonth() === d.getMonth() && today.getDate() >= d.getDate());
    if (!hadBirthday) a -= 1;
    return a;
  };

  // 目标年龄取 [minAge, maxAge]，并保证最终算出的周岁落在区间内
  let d;
  let age;
  let target = randInt(minAge, maxAge);
  for (let attempt = 0; attempt < 12; attempt++) {
    const year = today.getFullYear() - target;
    d = new Date(year, randInt(0, 11), randInt(1, 28));
    age = ageOf(d);
    if (age >= minAge && age <= maxAge) break;
    target += age < minAge ? 1 : -1;
  }

  return { date: fmtDate(d), age, dateObj: d };
}

/** 根据生日计算星座 */
function genZodiac(d) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const table = [
    [1, 20, '摩羯座', 'Capricorn'], [2, 19, '水瓶座', 'Aquarius'],
    [3, 21, '双鱼座', 'Pisces'], [4, 20, '白羊座', 'Aries'],
    [5, 21, '金牛座', 'Taurus'], [6, 22, '双子座', 'Gemini'],
    [7, 23, '巨蟹座', 'Cancer'], [8, 23, '狮子座', 'Leo'],
    [9, 23, '处女座', 'Virgo'], [10, 24, '天秤座', 'Libra'],
    [11, 23, '天蝎座', 'Scorpio'], [12, 22, '射手座', 'Sagittarius'],
  ];
  for (let i = 0; i < table.length; i++) {
    const [tm, td, zh, en] = table[i];
    if (m === tm) {
      if (day < td) {
        const prev = table[(i + 11) % 12];
        return { zh: prev[2], en: prev[3] };
      }
      return { zh, en };
    }
  }
  return { zh: '摩羯座', en: 'Capricorn' };
}

/** 生成地址 —— 支持按州/省、城市筛选 */
function genAddress(ds, opts = {}) {
  let cityList = ds.cities && ds.cities.length ? ds.cities.slice() : null;
  if (!cityList) {
    return {
      street: '', city: '', cityZh: '', state: '', stateName: '', stateZh: '',
      postal: '', country: ds.nameEn, countryZh: ds.nameZh, full: '',
    };
  }

  // 按筛选条件收窄候选城市；条件无匹配时回退到全量，避免生成失败
  if (opts.state) {
    const f = cityList.filter((c) => c.state === opts.state);
    if (f.length) cityList = f;
  }
  if (opts.city) {
    const f = cityList.filter((c) => c.city === opts.city);
    if (f.length) cityList = f;
  }

  const entry = pick(cityList);
  const houseNo = randInt(1, 9999);
  const street = pick(entry.streets);
  const unit = chance(0.28) ? `, Apt ${randInt(1, 40)}${pick(['A', 'B', 'C', ''])}` : '';

  // 优先使用城市自带的邮编前缀，并按国家模板补齐剩余位数
  const postal = buildPostal(ds, entry.zip);

  const streetLine = `${houseNo} ${street}${unit}`;
  const region = entry.state || '';
  const line2 = [entry.city, region, postal].filter(Boolean).join(', ');

  return {
    street: streetLine,
    city: entry.city,
    cityZh: entry.cityZh,
    state: region,
    stateName: region,
    stateZh: '',
    postal,
    country: ds.nameEn,
    countryZh: ds.nameZh,
    full: `${streetLine}, ${line2}, ${ds.nameEn}`,
  };
}

/**
 * 按国家邮编模板生成邮编。
 *
 * 模板占位符：
 *   A -> 大写字母    B -> 非零数字(1-9)    C -> 数字(0-9)    D -> 字母或数字
 * 其余字符（空格、连字符）原样输出，且不消耗城市邮编的字符。
 *
 * 若城市自带邮编前缀（如加拿大 'M5H'、日本 '100-0001'），
 * 则在占位符类型匹配时沿用该字符，使邮编与该城市大致对应；
 * 类型不匹配或已用尽时改为随机生成，保证格式始终合法。
 */
function buildPostal(ds, cityZip) {
  const tpl = ds.postalTpl;
  if (!tpl) return cityZip || digits(5);

  // 某些国家的外码长度可变（如英国 outward code：N1 / E8 / SE10 / EC1A），
  // 无法用定长模板表达。这类国家标记 postalFlex: true，
  // 直接沿用城市自带的固定外码，只随机生成后半段的 inward code。
  if (ds.postalFlex) {
    const outward = String(cityZip || '').toUpperCase().replace(/\s+/g, '');
    // 英国 inward code 固定为「数字 + 字母 + 字母」
    return outward ? `${outward} ${randInt(0, 9)}${fillTemplate('AA')}` : fillTemplate('AA A AA');
  }

  // 仅取城市邮编中的字母/数字参与匹配，忽略其自带的分隔符
  const src = String(cityZip || '').replace(/[^A-Za-z0-9]/g, '');

  let out = '';
  let si = 0;
  const isAlnum = (c) => /[0-9A-Za-z]/.test(c || '');
  for (const ch of tpl) {
    if (ch === 'A' || ch === 'B' || ch === 'C' || ch === 'D') {
      const c = src[si];
      si++;
      if (ch === 'A') {
        out += /[A-Za-z]/.test(c || '') ? c.toUpperCase() : String.fromCharCode(randInt(65, 90));
      } else if (ch === 'B') {
        out += /[1-9]/.test(c || '') ? c : String(randInt(1, 9));
      } else if (ch === 'C') {
        out += /\d/.test(c || '') ? c : String(randInt(0, 9));
      } else {
        // D：字母或数字皆可（如爱尔兰 Eircode 的后四位）
        out += isAlnum(c) ? c.toUpperCase() : (chance(0.5) ? String(randInt(0, 9)) : String.fromCharCode(randInt(65, 90)));
      }
    } else {
      out += ch; // 分隔符原样保留
    }
  }
  return out;
}

/** 生成电话号码 —— 按国家模板（A/B/C 均代表数字，见 fillPhone） */
function genPhone(ds) {
  return fillPhone(ds.phone || '(AAA) BBB-CCCC');
}

/** 生成邮箱 */
function genEmail(ds, name) {
  const clean = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  let f = clean(name.firstName);
  const l = clean(name.lastName);
  if (!f) f = 'user';
  const local = [
    `${f}.${l}`,
    `${f}${l}`,
    `${f}_${l}`,
    `${f}${l}${randInt(1, 99)}`,
    `${f.charAt(0)}${l}`,
    `${l}.${f}`,
  ][randInt(0, 5)];
  return `${local || f + l}@${pick(ds.domainSuffixes || ['gmail.com', 'outlook.com'])}`;
}

/** 生成国家证件号 */
function genNationalId(ds, name, birthday) {
  const kind = ds.id || ID_KIND.PERSONAL_ID;
  const label = { zh: ds.idLabel || '证件号', en: ds.idLabel || 'National ID' };
  const d = birthday.dateObj;
  const surname = (name.lastName || '').toUpperCase().replace(/[^A-Z]/g, '');
  const first = (name.firstName || '').toUpperCase().replace(/[^A-Z]/g, '');

  switch (kind) {
    case ID_KIND.SSN: {
      // 美国 SSN：规避 000 / 666 / 900-999 等无效区段
      let a;
      do { a = randInt(1, 899); } while (a === 666);
      return { label, value: `${String(a).padStart(3, '0')}-${digits(2).replace(/^0/, '1')}-${digits(4)}` };
    }
    case ID_KIND.NINO: {
      // 英国 NINO：排除 D/F/I/Q/U/V/O 等禁用字母
      const L = 'ABCEGHJKLMNPRSTWXYZ';
      const p = pick(L.split('')) + pick(L.split(''));
      return { label, value: `${p} ${digits(2)} ${digits(2)} ${digits(2)} ${pick(['A', 'B', 'C', 'D'])}` };
    }
    case ID_KIND.SIN: {
      // 加拿大 SIN：9 位 + Luhn 校验位
      const body = digits(8);
      return { label, value: `${body.slice(0, 3)} ${body.slice(3, 6)} ${body.slice(6)}${luhnCheckDigit(body)}` };
    }
    case ID_KIND.TFN: {
      // 澳大利亚 TFN：9 位
      const body = digits(8);
      return { label, value: `${body.slice(0, 3)} ${body.slice(3, 6)} ${body.slice(6)}${randInt(0, 9)}` };
    }
    case ID_KIND.CPF: {
      // 巴西 CPF：11 位 + 两位校验码（模 11 算法）
      const n = Array.from({ length: 9 }, () => randInt(0, 9));
      const dv = (arr) => {
        const w = arr.length + 1;
        const sum = arr.reduce((acc, v, i) => acc + v * (w - i), 0);
        const r = (sum * 10) % 11;
        return r === 10 ? 0 : r;
      };
      const d1 = dv(n);
      const d2 = dv([...n, d1]);
      const s = n.join('') + d1 + d2;
      return { label, value: `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}` };
    }
    case ID_KIND.RUT: {
      // 智利 RUT：8 位 + 校验位（模 11）
      const body = digits(8);
      const sum = body.split('').reverse().reduce((acc, c, i) => acc + Number(c) * ((i % 6) + 2), 0);
      const r = 11 - (sum % 11);
      const dv = r === 11 ? '0' : r === 10 ? 'K' : String(r);
      return { label, value: `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}` };
    }
    case ID_KIND.CURP: {
      // 墨西哥 CURP：4 字母 + 6 位生日 + 2 位州 + 3 辅音 + 1 位数字
      const cons = 'BCDFGHJKLMNPRSTVWXYZ';
      const v = 'AEIOU';
      const a = (surname.charAt(0) || pick(cons));
      const b = pick(v);
      const c = (surname.charAt(1) || pick(cons));
      const e = (first.charAt(0) || pick(cons));
      const yy = String(d.getFullYear()).slice(2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const st = pick(['AS', 'BC', 'DF', 'JA', 'MC', 'NL', 'PL', 'QT', 'VC', 'YN']);
      const h = name.genderKey === 'M' ? 'H' : 'M';
      return { label, value: `${a}${b}${c}${e}${yy}${mm}${dd}${st}${h}${pick(cons)}${pick(cons)}${pick(cons)}${randInt(0, 9)}` };
    }
    case ID_KIND.CODICE_FISCALE: {
      // 意大利 Codice Fiscale：6 字母 + 2 位年 + 1 位月 + 2 位日 + 4 位地区码 + 1 校验
      const cons = 'BCDFGHJKLMNPQRSTVWXYZ';
      const months = 'ABCDEHLMPRST';
      const sn = (surname + 'XXX').slice(0, 3);
      const fn = (first + 'XXX').slice(0, 3);
      const yy = String(d.getFullYear()).slice(2);
      const mo = months[d.getMonth()];
      const dd = String(d.getDate() + (name.genderKey === 'F' ? 40 : 0)).padStart(2, '0');
      const code = `${sn}${fn}${yy}${mo}${dd}`;
      const area = pick(['A001', 'B354', 'C351', 'D612', 'E625', 'F205', 'G273', 'H501', 'L219', 'M082']);
      // 校验位：奇偶位权重算法
      const odd = { 0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21, A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23 };
      const even = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25 };
      const full = code + area;
      let sum = 0;
      for (let i = 0; i < full.length; i++) {
        sum += (i % 2 === 0) ? odd[full[i]] : even[full[i]];
      }
      const ctrl = String.fromCharCode(65 + (sum % 26));
      return { label, value: `${code}${area}${ctrl}` };
    }
    case ID_KIND.NIF: {
      // 西班牙 NIF / 葡萄牙 NIF：8 位数字 + 1 字母
      const body = digits(8);
      const letter = 'TRWAGMYFPDXBNJZSQVHLCKE'[Number(body) % 23];
      return { label, value: `${body}${letter}` };
    }
    case ID_KIND.BSN: {
      // 荷兰 BSN：9 位
      return { label, value: digits(9) };
    }
    case ID_KIND.STEUER_ID: {
      // 德国 税号：11 位
      return { label, value: digits(11) };
    }
    case ID_KIND.PESEL: {
      // 波兰 PESEL：11 位（含生日），末位为校验位
      const yy = String(d.getFullYear()).slice(2);
      const mm = String(d.getMonth() + 1 + (d.getFullYear() >= 2000 ? 20 : 0)).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const rest = digits(4);
      const body = `${yy}${mm}${dd}${rest}`;
      const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
      const sum = body.split('').reduce((acc, c, i) => acc + Number(c) * w[i], 0);
      const ctrl = (10 - (sum % 10)) % 10;
      return { label, value: `${body}${ctrl}` };
    }
    case ID_KIND.OIB: {
      // 克罗地亚 OIB：11 位，使用 ISO 7064 MOD 11,10 校验位
      const body = digits(10);
      let a = 10;
      for (const c of body) {
        a = (a + Number(c)) % 10;
        if (a === 0) a = 10;
        a = (a * 2) % 11;
      }
      const ctrl = 11 - a;
      return { label, value: `${body}${ctrl === 10 ? 0 : ctrl}` };
    }
    case ID_KIND.AADHAAR: {
      // 印度 Aadhaar：12 位，Verhoeff 校验（此处简化为分组显示）
      const s = digits(12);
      return { label, value: `${s.slice(0, 4)} ${s.slice(4, 8)} ${s.slice(8)}` };
    }
    case ID_KIND.MYNUMBER: {
      // 日本 My Number：12 位
      const s = digits(12);
      return { label, value: `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}` };
    }
    case ID_KIND.RRN: {
      // 韩国 住民登录号：6 位生日 + 1 位性别世纪码 + 6 位
      const yy = String(d.getFullYear()).slice(2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const g = d.getFullYear() >= 2000
        ? (name.genderKey === 'M' ? '3' : '4')
        : (name.genderKey === 'M' ? '1' : '2');
      const s = digits(6);
      return { label, value: `${yy}${mm}${dd}-${g}${s}` };
    }
    case ID_KIND.ID_CARD: {
      // 中国 身份证：6 位地区 + 8 位生日 + 3 位顺序 + 1 位校验
      const area = pick(['110101', '310101', '440103', '440305', '330102', '510107', '320106', '420106', '610113', '500103']);
      const body = `${area}${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${digits(3)}`;
      const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
      const codes = '10X98765432';
      const sum = body.split('').reduce((acc, c, i) => acc + Number(c) * w[i], 0);
      return { label, value: `${body}${codes[sum % 11]}` };
    }
    case ID_KIND.NRIC: {
      // 新加坡/马来西亚 NRIC：字母 + 7 位数字 + 字母
      const s = digits(7);
      return { label, value: `${pick(['S', 'T', 'F', 'G'])}${s}${pick(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'T', 'U', 'W', 'X', 'Y', 'Z'])}` };
    }
    default: {
      // 通用个人编号：10 位分组
      const s = digits(10);
      return { label, value: `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}` };
    }
  }
}

/** 生成驾驶证号 */
function genLicense(ds, name) {
  const surname = (name.lastName || '').toUpperCase().replace(/[^A-Z]/g, '') || 'X';
  const initials = (name.firstName || 'X').charAt(0).toUpperCase();
  const d = name.birthday.dateObj;
  const order = ds.order || NAME_ORDER.WEST;

  // 东亚国家驾照通常为纯数字编号
  if (order === NAME_ORDER.EAST) return digits(12);

  switch (ds.code) {
    case 'GB': {
      // 英国：姓氏 5 位 + 生日编码 + 首字母 + 校验
      const sn = (surname + '99999').slice(0, 5);
      const dec = String(d.getDate()).padStart(2, '0');
      const dec2 = String(d.getMonth() + 1).padStart(2, '0');
      const yr = String(d.getFullYear()).slice(2);
      return `${sn}${dec}${dec2}${yr}${initials}${pick(['9', 'A'])}${fillTemplate('AA')}${digits(2)}`;
    }
    case 'CA':
      return `${surname.slice(0, 5)}${digits(6)}`;
    case 'US':
      return `${surname.charAt(0)}${digits(7)}`;
    default:
      return `${surname.slice(0, 3)}${digits(7)}`;
  }
}

/**
 * 生成银行卡号
 * 使用各卡组织公开的 BIN 号段，并通过 Luhn 校验位计算，
 * 使其在格式上完全合法（可被前端校验逻辑识别为有效卡号格式）。
 */
function genCreditCard() {
  const brands = [
    { name: 'Visa', prefix: '4539', length: 16, banks: ['Chase', 'Bank of America', 'Wells Fargo', 'Citi'] },
    { name: 'Visa', prefix: '4716', length: 16, banks: ['Chase', 'Bank of America', 'Wells Fargo', 'Citi'] },
    { name: 'Visa', prefix: '40240071', length: 16, banks: ['HSBC', 'Barclays', 'Santander'] },
    { name: 'MasterCard', prefix: '5425', length: 16, banks: ['JPMorgan Chase', 'Capital One', 'Wells Fargo'] },
    { name: 'MasterCard', prefix: '5310', length: 16, banks: ['TD Bank', 'RBC', 'BMO'] },
    { name: 'MasterCard', prefix: '2221', length: 16, banks: ['Deutsche Bank', 'Commerzbank', 'UniCredit'] },
    { name: 'American Express', prefix: '3782', length: 15, banks: ['American Express', 'JPMorgan', 'Goldman Sachs'] },
    { name: 'American Express', prefix: '3714', length: 15, banks: ['American Express', 'JPMorgan', 'Goldman Sachs'] },
    { name: 'Discover', prefix: '6011', length: 16, banks: ['Discover', 'Synchrony', 'HSBC'] },
    { name: 'JCB', prefix: '3530', length: 16, banks: ['JCB', 'MUFG Bank', 'Mizuho Bank'] },
    { name: 'UnionPay', prefix: '622126', length: 16, banks: ['Bank of China', 'ICBC', 'China Construction Bank'] },
    { name: 'Diners Club', prefix: '3056', length: 14, banks: ['Diners Club International', 'Citibank', 'HSBC'] },
  ];
  const b = pick(brands);
  const number = makeCardNumber(b.prefix, b.length);

  // 按卡组织习惯分组显示
  let formatted;
  if (b.name === 'American Express') {
    formatted = `${number.slice(0, 4)} ${number.slice(4, 10)} ${number.slice(10)}`;
  } else if (b.name === 'Diners Club') {
    formatted = `${number.slice(0, 4)} ${number.slice(4, 10)} ${number.slice(10)}`;
  } else {
    formatted = number.replace(/(.{4})/g, '$1 ').trim();
  }

  // 有效期：未来 1–6 年内的 MM/YY
  const now = new Date();
  const expYear = (now.getFullYear() + randInt(1, 6)) % 100;
  const expMonth = String(randInt(1, 12)).padStart(2, '0');

  return {
    brand: b.name,
    issuer: pick(b.banks),
    number,
    formatted,
    expiry: `${expMonth}/${String(expYear).padStart(2, '0')}`,
    cvv: b.name === 'American Express' ? digits(4) : digits(3),
  };
}

/** 生成教育信息 */
function genEducation(ds, name, birthday) {
  const DEGREES_ZH = ['学士', '硕士', '博士'];
  const DEGREES_EN = ["Bachelor's", "Master's", 'PhD'];
  const degreeIdx = randInt(0, DEGREES_ZH.length - 1);
  const MAJORS = [
    '计算机科学 Computer Science', '工商管理 Business Administration',
    '电子工程 Electrical Engineering', '机械工程 Mechanical Engineering',
    '市场营销 Marketing', '会计学 Accounting',
    '心理学 Psychology', '经济学 Economics',
    '生物科学 Biology', '土木工程 Civil Engineering',
    '法学 Law', '医学 Medicine', '文学 Literature', '化学 Chemistry',
  ];
  // 毕业年：18 岁上大学，本科 4 年 / 硕士 +2 / 博士 +3
  const gradAge = 22 + degreeIdx * (degreeIdx === 2 ? 3 : 2);
  const gradYear = birthday.dateObj.getFullYear() + (gradAge - birthday.age);
  return {
    university: pick(ds.universities || ['State University']),
    degreeZh: DEGREES_ZH[degreeIdx],
    degreeEn: DEGREES_EN[degreeIdx],
    major: pick(MAJORS),
    graduationYear: Math.max(gradYear, 2000),
  };
}

/** 生成生活方式 / 个性偏好信息 */
function genLifestyle(name) {
  const HOBBIES = [
    'Photography', 'Cooking', 'Hiking', 'Reading',
    'Fishing', 'Fitness', 'Painting', 'Gardening',
    'Travel', 'Climbing', 'Playing music', 'Cycling',
  ];
  const SPORTS = [
    'Basketball', 'Football', 'Tennis', 'Swimming',
    'Running', 'Golf', 'Skiing', 'Table Tennis',
    'Badminton',
  ];
  const FOODS = [
    'Chinese', 'Italian', 'Japanese', 'Mexican',
    'French', 'Thai', 'Indian',
  ];
  return {
    hobby: pick(HOBBIES),
    sport: pick(SPORTS),
    favoriteFood: pick(FOODS),
    pets: chance(0.5) ? pick(['Dog', 'Cat', 'Bird']) : 'None',
    smoking: chance(0.22) ? 'Occasionally' : 'Non-smoker',
    drinking: chance(0.6) ? 'Occasionally' : 'Non-drinker',
  };
}

/**
 * 生成「在线资料」相关字段：个人网站、浏览器 User-Agent、IP 地址。
 * 参考同类站点（Fake Name Generator 的 Online 段）的字段构成。
 */
function genOnline(name) {
  const clean = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  const f = clean(name.firstName) || 'user';
  const l = clean(name.lastName) || 'test';

  const WORDS = [
    'nexus', 'bright', 'pixel', 'nova', 'swift', 'cloud', 'orbit', 'lumen',
    'vertex', 'quanta', 'atlas', 'zephyr', 'cobalt', 'ember', 'harbor', 'ridge',
  ];
  const TLDs = ['com', 'net', 'org', 'io', 'me', 'dev', 'info'];

  // 个人网站：一半用姓名拼音组合，一半用随机词组合
  const website = chance(0.5)
    ? `${f}${l}.${pick(TLDs)}`
    : `${pick(WORDS)}${pick(WORDS)}${chance(0.35) ? randInt(1, 99) : ''}.${pick(TLDs)}`;

  // 常见浏览器 UA（仅用于测试表单的 UA 字段）
  const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  ];

  // IP 使用 RFC 5737 文档保留网段，保证永远不会指向真实主机
  const DOC_NETS = ['192.0.2', '198.51.100', '203.0.113'];

  return {
    website,
    userAgent: pick(USER_AGENTS),
    ip: `${pick(DOC_NETS)}.${randInt(1, 254)}`,
  };
}

/** 生成公司 / 职业信息 */
function genEmployment(ds) {
  const company = pick(ds.companies || ['Acme Corp']);  const title = pick(ds.jobTitles || ['Engineer']);
  const slug = company.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const user = title.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'contact';
  return {
    company,
    title,
    workEmail: `${user}@${slug || 'example'}.com`,
    annualIncome: randInt(28, 220) * 1000,
    yearsOfService: randInt(1, 15),
  };
}

/** 生成身体特征 */
function genPhysical(name) {
  const isMale = name.genderKey === 'M';
  const cm = isMale ? randInt(165, 193) : randInt(152, 180);
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  const kg = isMale ? randInt(58, 100) : randInt(45, 82);
  return {
    heightMetric: `${cm} cm`,
    heightImperial: `${feet}' ${inches}"`,
    weightMetric: `${kg} kg`,
    weightImperial: `${Math.round(kg * 2.20462)} lbs`,
    bloodType: pick(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
    eyeColor: pick(['棕色 Brown', '蓝色 Blue', '绿色 Green', '灰色 Gray', '琥珀色 Hazel']),
    hairColor: pick(['黑色 Black', '棕色 Brown', '金色 Blonde', '红色 Red', '灰色 Gray']),
  };
}

/**
 * 使用 IBAN 的国家 / 地区。
 * 其余国家（美国、加拿大、墨西哥、澳大利亚、日本、中国等）现实中并不使用 IBAN，
 * 因此不生成该字段，避免给出该国根本不存在的银行信息。
 */
const IBAN_COUNTRIES = new Set([
  'AL', 'AD', 'AT', 'AZ', 'BH', 'BY', 'BE', 'BA', 'BR', 'BG', 'CR', 'HR', 'CY',
  'CZ', 'DK', 'DO', 'EG', 'SV', 'EE', 'FO', 'FI', 'FR', 'GE', 'DE', 'GI', 'GR',
  'GL', 'GT', 'HU', 'IS', 'IE', 'IL', 'IT', 'JO', 'KZ', 'KW', 'LV', 'LB', 'LI',
  'LT', 'LU', 'MT', 'MR', 'MU', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PK', 'PS',
  'PL', 'PT', 'QA', 'RO', 'LC', 'SM', 'ST', 'SA', 'RS', 'SC', 'SK', 'SI', 'ES',
  'SD', 'SE', 'CH', 'TL', 'TN', 'TR', 'UA', 'AE', 'GB', 'VA', 'VG',
]);

/**
 * 生成通过 ABA 校验的 9 位路由号（美国 / 加拿大）。
 * 校验规则：3(d1+d4+d7) + 7(d2+d5+d8) + (d3+d6+d9) ≡ 0 (mod 10)
 */
function genRoutingNumber() {
  const d = Array.from({ length: 8 }, () => randInt(0, 9));
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5]);
  const check = (10 - (sum % 10)) % 10;
  return `${d.join('')}${check}`;
}

/** 生成网络账号类字段 */
function genAccount(name, ds) {
  const clean = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  const f = clean(name.firstName) || 'user';
  const l = clean(name.lastName) || 'test';
  const base = `${f}${l}`;
  const username = pick([
    base,
    `${base}${randInt(1, 9999)}`,
    `${f}_${l}`,
    `${f}${randInt(10, 99)}`,
  ]);

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 14; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));

  // 银行字段按国家采用对应的本地格式。
  // 只有真正使用 IBAN 的国家才生成 IBAN，其余国家改为该国常用的银行标识字段。
  const bank = {};
  if (IBAN_COUNTRIES.has(ds.code)) {
    if (ds.code === 'DE') bank.iban = `DE${digits(2)}${digits(18)}`;
    else if (ds.code === 'FR') bank.iban = `FR${digits(2)}${digits(23)}`;
    else bank.iban = `${ds.code}${digits(2)}${fillTemplate('AAAA')}${digits(14)}`;
  }
  if (ds.code === 'GB') bank.sortCode = `${digits(2)}-${digits(2)}-${digits(2)}`;
  if (ds.code === 'AU') bank.bsb = `${digits(3)}-${digits(3)}`;
  if (ds.code === 'DE') bank.blz = digits(8);
  if (ds.code === 'FR') bank.rib = digits(5);
  if (['US', 'CA', 'MX'].includes(ds.code)) bank.routingNumber = genRoutingNumber();
  // SWIFT / BIC 是全球通用字段，所有国家都可给出
  bank.swift = `${fillTemplate('AAAA')}${ds.code}${fillTemplate('AA')}`;

  return {
    username,
    password,
    uuid: uuidv4(),
    securityQuestions: pickMany([
      { q: '您母亲的婚前姓氏是？', a: name.lastName },
      { q: '您就读的第一所学校名称是？', a: `${name.lastName} Elementary School` },
      { q: '您最喜欢的城市是？', a: 'Springfield' },
      { q: '您的第一辆汽车品牌是？', a: pick(['Toyota', 'Ford', 'Honda', 'Volkswagen']) },
      { q: '您最喜爱的宠物名字是？', a: pick(['Buddy', 'Max', 'Bella', 'Luna']) },
    ], 3),
    accountNumber: digits(10),
    ...bank,
  };
}

/* ------------------------------------------------------------------ *
 * 主生成函数
 * ------------------------------------------------------------------ */

/**
 * 生成一份完整虚拟身份
 * @param {string} countryCode ISO 3166-1 alpha-2
 * @param {object} [opts] 筛选条件
 * @param {'M'|'F'|'any'} [opts.gender] 性别
 * @param {string} [opts.state] 州 / 省代码
 * @param {string} [opts.city] 城市名
 * @param {number} [opts.minAge] 最小年龄
 * @param {number} [opts.maxAge] 最大年龄
 */
export function generateIdentity(countryCode = 'US', opts = {}) {
  const ds = COUNTRIES[countryCode] || COUNTRIES.US;

  const minAge = Number.isFinite(opts.minAge) ? opts.minAge : 18;
  const maxAge = Number.isFinite(opts.maxAge) ? opts.maxAge : 65;

  const name = genName(ds, opts);
  const birthday = genBirthday(minAge, maxAge);
  name.birthday = { date: birthday.date, dateObj: birthday.dateObj };
  const zodiac = genZodiac(birthday.dateObj);
  const address = genAddress(ds, opts);
  const phone = genPhone(ds);
  const email = genEmail(ds, name);
  const nationalId = genNationalId(ds, name, birthday);
  const license = genLicense(ds, name);
  const employment = genEmployment(ds);
  const physical = genPhysical(name);
  const account = genAccount(name, ds);
  const card = genCreditCard();
  const education = genEducation(ds, name, birthday);
  const lifestyle = genLifestyle(name);
  const online = genOnline(name);

  return {
    countryCode: ds.code,
    country: { zh: ds.nameZh, en: ds.nameEn, flag: ds.flag, region: ds.region },
    name,
    birthday,
    zodiac,
    address,
    phone,
    email,
    nationalId,
    license,
    employment,
    physical,
    account,
    card,
    education,
    lifestyle,
    online,
    meta: {
      generatedAt: new Date().toISOString(),
      id: uuidv4().slice(0, 8).toUpperCase(),
    },
  };
}

/* ------------------------------------------------------------------ *
 * 筛选选项辅助函数（供界面构建州 / 城市下拉框）
 * ------------------------------------------------------------------ */

/** 取得某国家的州 / 省列表（去重后按代码排序） */
export function getStates(countryCode) {
  const ds = COUNTRIES[countryCode];
  if (!ds || !ds.cities) return [];
  const map = new Map();
  for (const c of ds.cities) {
    if (c.state && !map.has(c.state)) map.set(c.state, c.state);
  }
  return [...map.keys()].sort();
}

/** 取得某国家（可指定州）下的城市列表 */
export function getCities(countryCode, state) {
  const ds = COUNTRIES[countryCode];
  if (!ds || !ds.cities) return [];
  const list = state ? ds.cities.filter((c) => c.state === state) : ds.cities;
  const seen = new Set();
  const out = [];
  for (const c of list) {
    if (c.city && !seen.has(c.city)) {
      seen.add(c.city);
      out.push({ city: c.city, cityZh: c.cityZh, state: c.state });
    }
  }
  return out.sort((a, b) => a.city.localeCompare(b.city));
}

/** 批量生成 */
export function generateBatch(countryCode, count, opts = {}) {
  return Array.from({ length: count }, () => generateIdentity(countryCode, opts));
}

/** 将身份对象压平为「字段名 -> 值」键值对，便于导出与展示 */
export function flattenIdentity(id) {
  return {
    country: id.country.en,
    countryZh: id.country.zh,
    countryCode: id.countryCode,
    title: id.name.title,
    firstName: id.name.firstName,
    middleName: id.name.middleName,
    lastName: id.name.lastName,
    fullName: id.name.fullName,
    gender: id.name.gender.en,
    birthDate: id.birthday.date,
    age: id.birthday.age,
    zodiac: id.zodiac.en,
    nationalId: id.nationalId.value,
    phone: id.phone,
    email: id.email,
    street: id.address.street,
    city: id.address.city,
    state: id.address.state,
    postalCode: id.address.postal,
    countryFull: id.address.country,
    fullAddress: id.address.full,
    driversLicense: id.license,
    company: id.employment.company,
    jobTitle: id.employment.title,
    workEmail: id.employment.workEmail,
    annualIncome: id.employment.annualIncome,
    height: id.physical.heightMetric,
    weight: id.physical.weightMetric,
    bloodType: id.physical.bloodType,
    eyeColor: id.physical.eyeColor,
    hairColor: id.physical.hairColor,
    university: id.education.university,
    degree: id.education.degreeEn,
    major: id.education.major.split(' ')[0],
    graduationYear: id.education.graduationYear,
    hobby: id.lifestyle.hobby,
    sport: id.lifestyle.sport,
    favoriteFood: id.lifestyle.favoriteFood,
    pets: id.lifestyle.pets,
    drinking: id.lifestyle.drinking,
    smoking: id.lifestyle.smoking,
    website: id.online.website,
    userAgent: id.online.userAgent,
    ipAddress: id.online.ip,
    username: id.account.username,
    password: id.account.password,
    uuid: id.account.uuid,
    accountNumber: id.account.accountNumber,
    ...(id.account.routingNumber ? { routingNumber: id.account.routingNumber } : {}),
    ...(id.account.sortCode ? { sortCode: id.account.sortCode } : {}),
    ...(id.account.bsb ? { bsb: id.account.bsb } : {}),
    ...(id.account.blz ? { blz: id.account.blz } : {}),
    ...(id.account.rib ? { rib: id.account.rib } : {}),
    ...(id.account.swift ? { swift: id.account.swift } : {}),
    ...(id.account.iban ? { iban: id.account.iban } : {}),
    creditCardBrand: id.card.brand,
    creditCardIssuer: id.card.issuer,
    creditCardNumber: id.card.number,
    creditCardExpiry: id.card.expiry,
    creditCardCVV: id.card.cvv,
  };
}
