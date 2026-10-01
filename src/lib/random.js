/**
 * 随机工具函数库
 * 全部使用 Math.random（非加密安全），仅用于生成测试用假数据。
 */

/** 返回 [min, max] 闭区间内的随机整数 */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 从数组中随机取一个元素 */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 从数组中随机取 n 个不重复元素 */
export function pickMany(arr, n) {
  const copy = arr.slice();
  const out = [];
  const count = Math.min(n, copy.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

/** 按概率返回布尔值 */
export function chance(p) {
  return Math.random() < p;
}

/**
 * 用随机字符替换模板中的占位符：
 *   A -> 大写字母    B -> 非零数字(1-9)    C -> 数字(0-9)    D -> 字母或数字
 */
export function fillTemplate(tpl) {
  return tpl.replace(/[ABCD]/g, (ch) => {
    if (ch === 'A') return String.fromCharCode(randInt(65, 90));
    if (ch === 'B') return String(randInt(1, 9));
    if (ch === 'C') return String(randInt(0, 9));
    return randInt(0, 1) ? String(randInt(0, 9)) : String.fromCharCode(randInt(65, 90));
  });
}

/** 生成 0 填充的定长数字字符串 */
export function digits(len) {
  let s = '';
  for (let i = 0; i < len; i++) s += String(randInt(0, 9));
  return s;
}

/**
 * 填充电话号码模板。
 * 电话模板中 A / B / C 一律代表「数字」，仅语义不同：
 *   A -> 0-9（区号首段等）   B -> 1-9（首位非零）   C -> 0-9
 * 注意不能复用 fillTemplate，那里 A 表示大写字母（用于邮编）。
 */
export function fillPhone(tpl) {
  return tpl.replace(/[ABC]/g, (ch) => (ch === 'B' ? String(randInt(1, 9)) : String(randInt(0, 9))));
}

/** 日期格式化为 YYYY-MM-DD */
export function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 生成一个 UUID v4 */
export function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
