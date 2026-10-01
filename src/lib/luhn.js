/**
 * 校验位算法合集
 * 注意：这里生成的所有号码都只是「格式合法」的示例数据，
 * 不对应任何真实存在的个人、账户或证件。
 */

/**
 * Luhn 算法计算校验位（用于信用卡号 / IMEI 等）
 * 传入不含校验位的数字串，返回 0-9 的校验位。
 */
export function luhnCheckDigit(partial) {
  let sum = 0;
  let double = true; // 校验位将位于最右侧，因此从右往左第一个参与计算的位需要加倍
  for (let i = partial.length - 1; i >= 0; i--) {
    let d = partial.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return (10 - (sum % 10)) % 10;
}

/** 校验一个数字串是否通过 Luhn 校验 */
export function luhnValid(numStr) {
  const s = String(numStr).replace(/\D/g, '');
  if (!s) return false;
  return luhnCheckDigit(s.slice(0, -1)) === Number(s[s.length - 1]);
}

/**
 * 生成一个通过 Luhn 校验的信用卡号。
 * 使用公开的测试号段（BIN），不涉及任何真实发卡行的有效账户。
 * @param {string} prefix 卡号前缀（BIN + 可能的发卡行标识）
 * @param {number} length 总长度，默认 16
 */
export function makeCardNumber(prefix, length = 16) {
  const bodyLen = length - prefix.length - 1; // 预留 1 位校验位
  let body = prefix;
  for (let i = 0; i < bodyLen; i++) body += String(Math.floor(Math.random() * 10));
  return body + String(luhnCheckDigit(body));
}

/** 生成 [1,9] 之间的加权随机整数，权重数组越大越靠前概率越高 */
export function weightedIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}
