/**
 * 身份生成引擎
 *
 * 依据所选国家/地区的公开姓名库、城市库与号码格式规则，
 * 组合出一份「格式合法」的虚拟身份资料。
 *
 * ⚠️ 所有数据均为程序随机组合的虚构信息，仅用于：
 *    1. 开发者测试自己产品的表单校验 / 注册流程
 *    2. 非真实业务的界面演示
 *    严禁用于真实账号注册、KYC、金融交易等任何欺诈用途。
 */

import { us } from '../data/us.js';
import { uk } from '../data/uk.js';
import { ca } from '../data/ca.js';
import { au } from '../data/au.js';
import { randInt, pick, pickMany, chance, fillTemplate, digits, fmtDate, uuidv4 } from './random.js';
import { makeCardNumber, luhnCheckDigit } from './luhn.js';

export const COUNTRIES = { US: us, GB: uk, CA: ca, AU: au };
export const COUNTRY_LIST = [us, uk, ca, au];

/* ------------------------------------------------------------------ *
 * 基础字段
 * ------------------------------------------------------------------ */

/** 生成姓名（含拼音/西文全名与称呼） */
function genName(ds) {
  const female = chance(0.5);
  const first = pick(female ? ds.femaleFirst : ds.maleFirst);
  const middle = pick(female ? ds.femaleFirst : ds.maleFirst);
  const last = pick(ds.lastNames);
  const title = female ? (chance(0.5) ? 'Ms.' : 'Mrs.') : 'Mr.';
  const suffix = chance(0.06) ? pick(['Jr.', 'Sr.', 'II', 'III']) : '';
  return {
    firstName: first,
    middleName: middle,
    lastName: last,
    title,
    fullName: `${first} ${middle} ${last}` + (suffix ? ` ${suffix}` : ''),
    shortName: `${first} ${last}`,
    gender: female ? { zh: '女', en: 'Female' } : { zh: '男', en: 'Male' },
    genderKey: female ? 'F' : 'M',
  };
}

/** 生成生日 / 年龄 */
function genBirthday(minAge = 18, maxAge = 65) {
  const today = new Date();

  // 先精确计算给定生日的周岁，若今年生日尚未到则减 1
  const ageOf = (d) => {
    let a = today.getFullYear() - d.getFullYear();
    const hadBirthday =
      today.getMonth() > d.getMonth() ||
      (today.getMonth() === d.getMonth() && today.getDate() >= d.getDate());
    if (!hadBirthday) a -= 1;
    return a;
  };

  // 目标年龄取 [minAge, maxAge]，并保证最终算出的周岁落在该区间内。
  // 由于「今年生日还没到」会额外减 1 岁，这里最多重试若干次以避免边界越界。
  let d;
  let age;
  let target = randInt(minAge, maxAge);
  for (let attempt = 0; attempt < 12; attempt++) {
    const year = today.getFullYear() - target;
    d = new Date(year, randInt(0, 11), randInt(1, 28));
    age = ageOf(d);
    if (age >= minAge && age <= maxAge) break;
    // 越界则修正目标年龄后重试
    target += age < minAge ? 1 : -1;
  }

  return {
    date: fmtDate(d),
    age,
    dateObj: d,
  };
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

/** 生成地址（街道 / 城市 / 州 / 邮编，按国家格式组装） */
function genAddress(ds) {
  const cityEntry = pick(ds.cities);
  const houseNo = randInt(1, 9999);
  const street = pick(cityEntry.streets);
  const unit = chance(0.3) ? `, Apt ${randInt(1, 40)}${pick(['A', 'B', 'C', ''])}` : '';

  let postal;
  let line2;
  if (ds.code === 'US') {
    // 美国 ZIP+4：5 位主码 + 可选 4 位扩展
    postal = chance(0.35) ? `${cityEntry.zip}-${digits(4)}` : cityEntry.zip;
    line2 = `${cityEntry.city}, ${cityEntry.state} ${postal}`;
  } else if (ds.code === 'GB') {
    // 英国邮编：外码 + 空格 + 内码（数字字母组合）
    postal = `${cityEntry.zip} ${randInt(1, 9)}${fillTemplate('AA')}`.replace(/\s+/g, ' ');
    const regionName = ds.states.find((s) => s.code === cityEntry.state);
    line2 = `${cityEntry.city}, ${regionName ? regionName.name : cityEntry.state} ${postal}`;
  } else if (ds.code === 'CA') {
    // 加拿大邮编：A1A 1A1
    postal = `${cityEntry.zip} ${randInt(1, 9)}${fillTemplate('A')}${randInt(1, 9)}`;
    const provName = ds.states.find((s) => s.code === cityEntry.state);
    line2 = `${cityEntry.city}, ${provName ? provName.name : cityEntry.state} ${postal}`;
  } else {
    // 澳大利亚邮编：4 位数字
    postal = cityEntry.zip;
    const stateName = ds.states.find((s) => s.code === cityEntry.state);
    line2 = `${cityEntry.city}, ${stateName ? stateName.name : cityEntry.state} ${postal}`;
  }

  const streetLine = ds.code === 'GB'
    ? `${houseNo} ${street}`
    : `${houseNo} ${street}`;

  return {
    street: `${streetLine}${unit}`,
    city: cityEntry.city,
    cityZh: cityEntry.cityZh,
    state: cityEntry.state,
    stateName: (ds.states.find((s) => s.code === cityEntry.state) || {}).name || cityEntry.state,
    stateZh: (ds.states.find((s) => s.code === cityEntry.state) || {}).nameZh || '',
    postal,
    country: ds.nameEn,
    countryZh: ds.nameZh,
    // 单行完整地址
    full: `${streetLine}${unit}, ${line2}, ${ds.nameEn}`,
  };
}

/** 生成电话号码 */
function genPhone(ds) {
  if (ds.code === 'GB') {
    // 英国手机：07 + 3 位 + 6 位
    return `07${digits(3)} ${digits(6)}`;
  }
  if (ds.code === 'AU') {
    // 澳大利亚手机：04XX XXX XXX
    return `04${digits(2)} ${digits(3)} ${digits(3)}`;
  }
  const ac = pick(ds.areaCodes);
  const exchange = String(randInt(200, 999));
  const line = digits(4);
  return `(${ac}) ${exchange}-${line}`;
}

/** 生成邮箱（基于姓名，多种常见风格） */
function genEmail(ds, name) {
  const f = name.firstName.toLowerCase().replace(/[^a-z]/g, '');
  const l = name.lastName.toLowerCase().replace(/[^a-z]/g, '');
  const style = randInt(0, 5);
  const local = [
    `${f}.${l}`,
    `${f}${l}`,
    `${f}_${l}`,
    `${f}${l}${randInt(1, 99)}`,
    `${f.charAt(0)}${l}`,
    `${l}.${f}`,
  ][style];
  return `${local}@${pick(ds.domainSuffixes)}`;
}

/** 生成社会保障号 / 国民保险号 / 社保卡号等国家级编号 */
function genNationalId(ds) {
  if (ds.code === 'US') {
    // SSN 格式 AAA-GG-SSSS，规避 000/666/900-999 等无效段
    const validArea = () => {
      let a;
      do { a = randInt(1, 899); } while (a === 666);
      return String(a).padStart(3, '0');
    };
    const g = String(randInt(1, 99)).padStart(2, '0');
    const s = String(randInt(1, 9999)).padStart(4, '0');
    return { label: { zh: '社会安全号 SSN', en: 'SSN' }, value: `${validArea()}-${g}-${s}` };
  }
  if (ds.code === 'GB') {
    // NINO 格式：QQ 12 34 56 C（禁用字母 D,F,I,Q,U,V,O 等）
    const prefixLetters = 'ABCEGHJKLMNPRSTWXYZ';
    const p = pick(prefixLetters.split('')) + pick(prefixLetters.split(''));
    return {
      label: { zh: '国民保险号 NINO', en: 'National Insurance No.' },
      value: `${p} ${digits(2)} ${digits(2)} ${digits(2)} ${pick(['A', 'B', 'C', 'D'])}`,
    };
  }
  if (ds.code === 'CA') {
    // SIN：9 位，使用 Luhn 校验位
    const body = digits(8);
    return {
      label: { zh: '社会保险号 SIN', en: 'Social Insurance Number' },
      value: `${body.slice(0, 3)} ${body.slice(3, 6)} ${body.slice(6)}${luhnCheckDigit(body)}`,
    };
  }
  // 澳大利亚：TFN 税号（9 位）
  const body = digits(8);
  return {
    label: { zh: '税号 TFN', en: 'Tax File Number' },
    value: `${body.slice(0, 3)} ${body.slice(3, 6)} ${body.slice(6)}${randInt(0, 9)}`,
  };
}

/** 生成驾驶证号（各州/省格式简化模拟） */
function genLicense(ds, name) {
  const surname = name.lastName.toUpperCase().replace(/[^A-Z]/g, '');
  const initials = name.firstName.charAt(0).toUpperCase();
  if (ds.code === 'US') {
    // 采用「1 位姓氏首字母 + 数字」这类广泛存在的通用格式
    return `${surname.charAt(0)}${digits(7)}`;
  }
  if (ds.code === 'GB') {
    // 英国驾照：SURNAME 的 5 位 + 生日编码 + 2 位首字母 + 校验
    const sn = (surname + '99999').slice(0, 5);
    const d = name.birthday.dateObj;
    const dec = String(d.getDate()).padStart(2, '0');
    const dec2 = String(d.getMonth() + 1).padStart(2, '0');
    const yr = String(d.getFullYear()).slice(2);
    return `${sn}${dec}${dec2}${yr}${initials}${pick(['9', 'A'])}${fillTemplate('AA')}${digits(2)}`;
  }
  if (ds.code === 'CA') {
    return `${surname.slice(0, 5)}${digits(6)}`;
  }
  // 澳大利亚
  return `${digits(9)}`;
}

/** 生成信用卡信息（仅使用公开测试号段，通过 Luhn 校验） */
function genCreditCard() {
  const brands = [
    { name: 'Visa', prefix: '4539', length: 16 },
    { name: 'Visa', prefix: '4716', length: 16 },
    { name: 'MasterCard', prefix: '5425', length: 16 },
    { name: 'MasterCard', prefix: '5310', length: 16 },
    { name: 'American Express', prefix: '3782', length: 15 },
    { name: 'American Express', prefix: '3714', length: 15 },
    { name: 'Discover', prefix: '6011', length: 16 },
    { name: 'JCB', prefix: '3530', length: 16 },
  ];
  const b = pick(brands);
  const number = makeCardNumber(b.prefix, b.length);
  const formatted = b.name === 'American Express'
    ? `${number.slice(0, 4)} ${number.slice(4, 10)} ${number.slice(10)}`
    : number.replace(/(.{4})/g, '$1 ').trim();
  return {
    brand: b.name,
    number,
    formatted,
    expiry: `${String(randInt(1, 12)).padStart(2, '0')}/${String(randInt(26, 32)).slice(2)}`,
    cvv: b.name === 'American Express' ? digits(4) : digits(3),
  };
}

/** 生成公司 / 职业信息 */
function genEmployment(ds) {
  const company = pick(ds.companies);
  const title = pick(ds.jobTitles);
  return {
    company,
    title,
    // 工作邮箱
    workEmail: `${title.split(' ')[0].toLowerCase()}@${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    annualIncome: randInt(35, 220) * 1000,
    yearsOfService: randInt(1, 15),
  };
}

/** 生成身体特征 */
function genPhysical(name) {
  const isMale = name.genderKey === 'M';
  // 身高使用厘米 + 英制双单位
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

/** 生成网络账号类字段（用户名 / 密码 / 安全问题 / UUID） */
function genAccount(name, email) {
  const base = `${name.firstName}${name.lastName}`.toLowerCase().replace(/[^a-z]/g, '');
  const username = pick([
    base,
    `${base}${randInt(1, 9999)}`,
    `${name.firstName.toLowerCase()}_${name.lastName.toLowerCase()}`,
    `${name.firstName.toLowerCase()}${randInt(10, 99)}`,
  ]);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 14; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
  return {
    username,
    password,
    uuid: uuidv4(),
    securityQuestions: pickMany([
      { q: '您母亲的婚前姓氏是？', a: name.lastName },
      { q: '您就读的第一所学校名称是？', a: `${name.lastName} Elementary School` },
      { q: '您最喜欢的城市是？', a: 'Springfield' },
      { q: '您的第一辆汽车品牌是？', a: pick(['Toyota', 'Ford', 'Honda', 'Chevrolet']) },
      { q: '您最喜爱的宠物名字是？', a: pick(['Buddy', 'Max', 'Bella', 'Luna']) },
    ], 3),
    // 常见账号 ID
    accountNumber: digits(10),
    routingNumber: digits(9),
    iban: `GB${digits(2)}${fillTemplate('AAAA')}${digits(14)}`,
  };
}

/* ------------------------------------------------------------------ *
 * 主生成函数
 * ------------------------------------------------------------------ */

/**
 * 生成一份完整虚拟身份
 * @param {string} countryCode 'US' | 'GB' | 'CA' | 'AU'
 * @returns {object} 完整身份对象
 */
export function generateIdentity(countryCode = 'US') {
  const ds = COUNTRIES[countryCode] || us;

  const name = genName(ds);
  const birthday = genBirthday();
  name.birthday = { date: birthday.date, dateObj: birthday.dateObj };
  const zodiac = genZodiac(birthday.dateObj);
  const address = genAddress(ds);
  const phone = genPhone(ds);
  const email = genEmail(ds, name);
  const nationalId = genNationalId(ds);
  const license = genLicense(ds, name);
  const employment = genEmployment(ds);
  const physical = genPhysical(name);
  const account = genAccount(name, email);
  const card = genCreditCard();

  return {
    countryCode: ds.code,
    country: { zh: ds.nameZh, en: ds.nameEn, flag: ds.flag },
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
    university: pick(ds.universities),
    // 用于界面展示的分组字段定义
    meta: {
      generatedAt: new Date().toISOString(),
      id: uuidv4().slice(0, 8).toUpperCase(),
    },
  };
}

/**
 * 批量生成
 * @param {string} countryCode
 * @param {number} count
 */
export function generateBatch(countryCode, count) {
  return Array.from({ length: count }, () => generateIdentity(countryCode));
}

/** 将身份对象压平为「字段名 -> 值」的键值对，便于导出与展示 */
export function flattenIdentity(id) {
  return {
    country: id.country.en,
    countryZh: id.country.zh,
    title: id.name.title,
    firstName: id.name.firstName,
    middleName: id.name.middleName,
    lastName: id.name.lastName,
    fullName: id.name.fullName,
    gender: id.name.gender.en,
    birthDate: id.birthday.date,
    age: id.birthday.age,
    zodiac: id.zodiac.en,
    ssn: id.nationalId.value,
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
    university: id.university,
    username: id.account.username,
    password: id.account.password,
    uuid: id.account.uuid,
    accountNumber: id.account.accountNumber,
    routingNumber: id.account.routingNumber,
    iban: id.account.iban,
    creditCardBrand: id.card.brand,
    creditCardNumber: id.card.number,
    creditCardExpiry: id.card.expiry,
    creditCardCVV: id.card.cvv,
  };
}
