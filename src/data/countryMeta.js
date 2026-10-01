/**
 * 国家元数据与格式规则注册表
 *
 * 每个国家只需在此登记格式化规则（姓名顺序、电话模板、邮编模板、证件号类型等），
 * 生成引擎便可根据规则自动产出「格式合法」的数据，
 * 而不需要在引擎里为每个国家写 if/else 分支。
 *
 * tpl 模板字符：
 *   A -> 随机大写字母       B -> 随机非零数字(1-9)
 *   C -> 随机数字(0-9)      D -> 随机字母或数字(0-9A-Z，用于爱尔兰 Eircode 等)
 *
 * 电话模板中的 A/B/C 一律代表「数字」，含义与邮编模板不同（见 random.js 的 fillPhone）。
 */

/* ------------------------------------------------------------------ *
 * 姓名顺序
 *   west  : 名 中间名 姓        （欧美主流）
 *   east  : 姓 名               （中日韩越）
 *   latin : 名 姓               （巴西、印尼等）
 * ------------------------------------------------------------------ */
export const NAME_ORDER = {
  WEST: 'west',
  EAST: 'east',
  LATIN: 'latin',
};

/* ------------------------------------------------------------------ *
 * 证件号生成规则
 * ------------------------------------------------------------------ */
export const ID_KIND = {
  SSN: 'ssn',            // 美国 社会安全号
  NINO: 'nino',          // 英国 国民保险号
  SIN: 'sin',            // 加拿大 社会保险号
  TFN: 'tfn',            // 澳大利亚 税号
  CODICE_FISCALE: 'cf',  // 意大利 税号
  NIF: 'nif',            // 西班牙 NIF
  CPF: 'cpf',            // 巴西 CPF
  CURP: 'curp',          // 墨西哥 CURP
  RUT: 'rut',            // 智利 RUT
  AADHAAR: 'aadhaar',    // 印度 Aadhaar
  MYNUMBER: 'mynumber',  // 日本 My Number
  RRN: 'rrn',            // 韩国 住民登录号
  ID_CARD: 'idcard',     // 中国 身份证
  NRIC: 'nric',          // 新加坡/马来西亚 NRIC
  STEUER_ID: 'steuer',   // 德国 税号
  BSN: 'bsn',            // 荷兰 BSN
  PESEL: 'pesel',        // 波兰 PESEL
  OIB: 'oib',            // 克罗地亚 OIB
  PERSONAL_ID: 'personal' // 通用个人编号（占位）
};

/**
 * 国家注册表
 * key 使用 ISO 3166-1 alpha-2 代码
 */
export const COUNTRY_META = {
  // ---------------- 北美 ----------------
  US: { nameZh: '美国', nameEn: 'United States', flag: '🇺🇸', region: 'americas', order: NAME_ORDER.WEST, id: ID_KIND.SSN, idLabel: '社会安全号 SSN', phone: '(AAA) BBB-CCCC', postal: { zh: '邮编', en: 'ZIP Code' }, postalTpl: 'CCCCC' },
  CA: { nameZh: '加拿大', nameEn: 'Canada', flag: '🇨🇦', region: 'americas', order: NAME_ORDER.WEST, id: ID_KIND.SIN, idLabel: '社会保险号 SIN', phone: '(AAA) BBB-CCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'ACA BAB' },
  MX: { nameZh: '墨西哥', nameEn: 'Mexico', flag: '🇲🇽', region: 'americas', order: NAME_ORDER.WEST, id: ID_KIND.CURP, idLabel: '人口登记码 CURP', phone: 'AA BBBB CCCC', postal: { zh: '邮编', en: 'Código Postal' }, postalTpl: 'CCCCC' },

  // ---------------- 南美 ----------------
  BR: { nameZh: '巴西', nameEn: 'Brazil', flag: '🇧🇷', region: 'americas', order: NAME_ORDER.LATIN, id: ID_KIND.CPF, idLabel: '税号 CPF', phone: '(AA) BCCCC-CCCC', postal: { zh: '邮编', en: 'CEP' }, postalTpl: 'CCCCC-CCC' },
  AR: { nameZh: '阿根廷', nameEn: 'Argentina', flag: '🇦🇷', region: 'americas', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '身份证号 DNI', phone: 'BB CCCC-CCCC', postal: { zh: '邮编', en: 'Código Postal' }, postalTpl: 'ACCCCAAA' },
  CL: { nameZh: '智利', nameEn: 'Chile', flag: '🇨🇱', region: 'americas', order: NAME_ORDER.WEST, id: ID_KIND.RUT, idLabel: '税号 RUT', phone: 'B CCCC CCCC', postal: { zh: '邮编', en: 'Código Postal' }, postalTpl: 'CCCCCCC' },
  CO: { nameZh: '哥伦比亚', nameEn: 'Colombia', flag: '🇨🇴', region: 'americas', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '身份证号 Cédula', phone: 'BBB CCC CCCC', postal: { zh: '邮编', en: 'Código Postal' }, postalTpl: 'CCCCCC' },
  PE: { nameZh: '秘鲁', nameEn: 'Peru', flag: '🇵🇪', region: 'americas', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '身份证号 DNI', phone: 'BBB CCC CCC', postal: { zh: '邮编', en: 'Código Postal' }, postalTpl: 'CCCCC' },

  // ---------------- 欧洲 ----------------
  GB: { nameZh: '英国', nameEn: 'United Kingdom', flag: '🇬🇧', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.NINO, idLabel: '国民保险号 NINO', phone: '07BBB CCCCCC', postal: { zh: '邮编', en: 'Postcode' }, postalTpl: 'AA BAA', postalFlex: true },
  DE: { nameZh: '德国', nameEn: 'Germany', flag: '🇩🇪', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.STEUER_ID, idLabel: '税号 Steuer-ID', phone: '0BB CCCCCCC', postal: { zh: '邮编', en: 'Postleitzahl' }, postalTpl: 'CCCCC' },
  FR: { nameZh: '法国', nameEn: 'France', flag: '🇫🇷', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '社保号 NIR', phone: '0B CC CC CC CC', postal: { zh: '邮编', en: 'Code Postal' }, postalTpl: 'CCCCC' },
  IT: { nameZh: '意大利', nameEn: 'Italy', flag: '🇮🇹', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.CODICE_FISCALE, idLabel: '税号 Codice Fiscale', phone: 'BBB CCCCCCC', postal: { zh: '邮编', en: 'CAP' }, postalTpl: 'CCCCC' },
  ES: { nameZh: '西班牙', nameEn: 'Spain', flag: '🇪🇸', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.NIF, idLabel: '税号 NIF', phone: 'BBB CCC CCC', postal: { zh: '邮编', en: 'Código Postal' }, postalTpl: 'CCCCC' },
  NL: { nameZh: '荷兰', nameEn: 'Netherlands', flag: '🇳🇱', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.BSN, idLabel: '公民服务号 BSN', phone: '0B CCCCCCCC', postal: { zh: '邮编', en: 'Postcode' }, postalTpl: 'CCCC AA' },
  BE: { nameZh: '比利时', nameEn: 'Belgium', flag: '🇧🇪', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '国家登记号', phone: '04BB CCCCC', postal: { zh: '邮编', en: 'Code Postal' }, postalTpl: 'CCCC' },
  CH: { nameZh: '瑞士', nameEn: 'Switzerland', flag: '🇨🇭', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: 'AHV 保险号', phone: '0BB CCC CC CC', postal: { zh: '邮编', en: 'PLZ' }, postalTpl: 'CCCC' },
  AT: { nameZh: '奥地利', nameEn: 'Austria', flag: '🇦🇹', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '社保号 SVNR', phone: '0BBB CCCCCC', postal: { zh: '邮编', en: 'PLZ' }, postalTpl: 'CCCC' },
  PT: { nameZh: '葡萄牙', nameEn: 'Portugal', flag: '🇵🇹', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.NIF, idLabel: '税号 NIF', phone: '9BB CCC CCC', postal: { zh: '邮编', en: 'Código Postal' }, postalTpl: 'CCCC-CCC' },
  SE: { nameZh: '瑞典', nameEn: 'Sweden', flag: '🇸🇪', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '个人身份号', phone: '0BB CCC CC CC', postal: { zh: '邮编', en: 'Postnummer' }, postalTpl: 'CCC CC' },
  NO: { nameZh: '挪威', nameEn: 'Norway', flag: '🇳🇴', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '出生号 Fødselsnummer', phone: 'BBB CC CCC', postal: { zh: '邮编', en: 'Postnummer' }, postalTpl: 'CCCC' },
  DK: { nameZh: '丹麦', nameEn: 'Denmark', flag: '🇩🇰', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '个人号 CPR', phone: 'BB BB BB BB', postal: { zh: '邮编', en: 'Postnummer' }, postalTpl: 'CCCC' },
  FI: { nameZh: '芬兰', nameEn: 'Finland', flag: '🇫🇮', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '个人身份码 HETU', phone: '0BB CCC CCCC', postal: { zh: '邮编', en: 'Postinumero' }, postalTpl: 'CCCCC' },
  IE: { nameZh: '爱尔兰', nameEn: 'Ireland', flag: '🇮🇪', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: 'PPS 号', phone: '0BB CCC CCCC', postal: { zh: '邮编', en: 'Eircode' }, postalTpl: 'ACC DDDD' },
  PL: { nameZh: '波兰', nameEn: 'Poland', flag: '🇵🇱', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PESEL, idLabel: 'PESEL 号', phone: 'BBB CCC CCC', postal: { zh: '邮编', en: 'Kod pocztowy' }, postalTpl: 'CC-CCC' },
  CZ: { nameZh: '捷克', nameEn: 'Czechia', flag: '🇨🇿', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '出生号', phone: 'BBB CCC CCC', postal: { zh: '邮编', en: 'PSČ' }, postalTpl: 'CCC CC' },
  GR: { nameZh: '希腊', nameEn: 'Greece', flag: '🇬🇷', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '税号 AFM', phone: 'BBB CCCCCCC', postal: { zh: '邮编', en: 'TK' }, postalTpl: 'CCCCC' },
  RU: { nameZh: '俄罗斯', nameEn: 'Russia', flag: '🇷🇺', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '个人保险账号 SNILS', phone: '9BBB CCCCCC', postal: { zh: '邮编', en: 'Индекс' }, postalTpl: 'CCCCCC' },
  UA: { nameZh: '乌克兰', nameEn: 'Ukraine', flag: '🇺🇦', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '纳税人号', phone: '0BB CCC CCCC', postal: { zh: '邮编', en: 'Індекс' }, postalTpl: 'CCCCC' },
  TR: { nameZh: '土耳其', nameEn: 'Turkey', flag: '🇹🇷', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '身份证号 TCKN', phone: '0BBB CCC CCCC', postal: { zh: '邮编', en: 'Posta Kodu' }, postalTpl: 'CCCCC' },
  HU: { nameZh: '匈牙利', nameEn: 'Hungary', flag: '🇭🇺', region: 'europe', order: NAME_ORDER.EAST, id: ID_KIND.PERSONAL_ID, idLabel: '税号 Adószám', phone: '0B CCC CCCC', postal: { zh: '邮编', en: 'Irányítószám' }, postalTpl: 'CCCC' },
  RO: { nameZh: '罗马尼亚', nameEn: 'Romania', flag: '🇷🇴', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '个人识别号 CNP', phone: '0BB CCC CCCC', postal: { zh: '邮编', en: 'Cod poștal' }, postalTpl: 'CCCCCC' },
  BG: { nameZh: '保加利亚', nameEn: 'Bulgaria', flag: '🇧🇬', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '统一民事号 ЕГН', phone: '0BB CCC CCCC', postal: { zh: '邮编', en: 'Пощенски код' }, postalTpl: 'CCCC' },
  HR: { nameZh: '克罗地亚', nameEn: 'Croatia', flag: '🇭🇷', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.OIB, idLabel: '个人识别号 OIB', phone: '0BB CCC CCCC', postal: { zh: '邮编', en: 'Poštanski broj' }, postalTpl: 'CCCCC' },
  SK: { nameZh: '斯洛伐克', nameEn: 'Slovakia', flag: '🇸🇰', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '出生号 Rodné číslo', phone: '0BBB CCC CCCC', postal: { zh: '邮编', en: 'PSČ' }, postalTpl: 'CCC CC' },
  LT: { nameZh: '立陶宛', nameEn: 'Lithuania', flag: '🇱🇹', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '个人代码 Asmens kodas', phone: '0BBB CCCCC', postal: { zh: '邮编', en: 'Pašto kodas' }, postalTpl: 'AA-CCCCC' },
  LV: { nameZh: '拉脱维亚', nameEn: 'Latvia', flag: '🇱🇻', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '个人代码 Personas kods', phone: '2BBB CCCC', postal: { zh: '邮编', en: 'Pasta indekss' }, postalTpl: 'AA-CCCC' },
  EE: { nameZh: '爱沙尼亚', nameEn: 'Estonia', flag: '🇪🇪', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '个人代码 Isikukood', phone: '5BBB CCCC', postal: { zh: '邮编', en: 'Postiindeks' }, postalTpl: 'CCCCC' },
  IS: { nameZh: '冰岛', nameEn: 'Iceland', flag: '🇮🇸', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '个人身份号 Kennitala', phone: 'BBB CCCC', postal: { zh: '邮编', en: 'Póstnúmer' }, postalTpl: 'CCC' },
  LU: { nameZh: '卢森堡', nameEn: 'Luxembourg', flag: '🇱🇺', region: 'europe', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '国家识别号', phone: '6BB CCC CCC', postal: { zh: '邮编', en: 'Code postal' }, postalTpl: 'A-CCCC' },

  // ---------------- 亚太 ----------------
  JP: { nameZh: '日本', nameEn: 'Japan', flag: '🇯🇵', region: 'asia', order: NAME_ORDER.EAST, id: ID_KIND.MYNUMBER, idLabel: '个人编号 My Number', phone: '0B0-BBBB-CCCC', postal: { zh: '邮编', en: '郵便番号' }, postalTpl: 'CCC-CCCC' },
  KR: { nameZh: '韩国', nameEn: 'South Korea', flag: '🇰🇷', region: 'asia', order: NAME_ORDER.EAST, id: ID_KIND.RRN, idLabel: '住民登录号', phone: '0B-BBBB-CCCC', postal: { zh: '邮编', en: '우편번호' }, postalTpl: 'CCCCC' },
  CN: { nameZh: '中国', nameEn: 'China', flag: '🇨🇳', region: 'asia', order: NAME_ORDER.EAST, id: ID_KIND.ID_CARD, idLabel: '身份证号', phone: '1BB CCCC CCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'CCCCCC' },
  HK: { nameZh: '中国香港', nameEn: 'Hong Kong', flag: '🇭🇰', region: 'asia', order: NAME_ORDER.EAST, id: ID_KIND.PERSONAL_ID, idLabel: '身份证号 HKID', phone: 'BBBB CCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'CCCCCC' },
  TW: { nameZh: '中国台湾', nameEn: 'Taiwan', flag: '🇹🇼', region: 'asia', order: NAME_ORDER.EAST, id: ID_KIND.PERSONAL_ID, idLabel: '身份证号', phone: '09BB CCC CCC', postal: { zh: '邮编', en: '郵遞區號' }, postalTpl: 'CCC' },
  SG: { nameZh: '新加坡', nameEn: 'Singapore', flag: '🇸🇬', region: 'asia', order: NAME_ORDER.WEST, id: ID_KIND.NRIC, idLabel: '身份证号 NRIC', phone: 'BBBB CCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'CCCCCC' },
  MY: { nameZh: '马来西亚', nameEn: 'Malaysia', flag: '🇲🇾', region: 'asia', order: NAME_ORDER.WEST, id: ID_KIND.NRIC, idLabel: '身份证号 MyKad', phone: '0BB-CCC CCCC', postal: { zh: '邮编', en: 'Poskod' }, postalTpl: 'CCCCC' },
  TH: { nameZh: '泰国', nameEn: 'Thailand', flag: '🇹🇭', region: 'asia', order: NAME_ORDER.EAST, id: ID_KIND.PERSONAL_ID, idLabel: '身份证号', phone: '0BB CCC CCCC', postal: { zh: '邮编', en: 'รหัสไปรษณีย์' }, postalTpl: 'CCCCC' },
  VN: { nameZh: '越南', nameEn: 'Vietnam', flag: '🇻🇳', region: 'asia', order: NAME_ORDER.EAST, id: ID_KIND.PERSONAL_ID, idLabel: '身份证号 CCCD', phone: '0BB CCC CCCC', postal: { zh: '邮编', en: 'Mã bưu chính' }, postalTpl: 'CCCCCC' },
  ID: { nameZh: '印度尼西亚', nameEn: 'Indonesia', flag: '🇮🇩', region: 'asia', order: NAME_ORDER.LATIN, id: ID_KIND.PERSONAL_ID, idLabel: '身份证号 KTP', phone: '08BB-CCCC-CCCC', postal: { zh: '邮编', en: 'Kode Pos' }, postalTpl: 'CCCCC' },
  PH: { nameZh: '菲律宾', nameEn: 'Philippines', flag: '🇵🇭', region: 'asia', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '统一多用途编号 UMID', phone: '09BB CCC CCCC', postal: { zh: '邮编', en: 'ZIP Code' }, postalTpl: 'CCCC' },
  IN: { nameZh: '印度', nameEn: 'India', flag: '🇮🇳', region: 'asia', order: NAME_ORDER.WEST, id: ID_KIND.AADHAAR, idLabel: 'Aadhaar 号', phone: '9BBBB CCCCC', postal: { zh: '邮编', en: 'PIN Code' }, postalTpl: 'CCCCCC' },
  PK: { nameZh: '巴基斯坦', nameEn: 'Pakistan', flag: '🇵🇰', region: 'asia', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '身份证号 CNIC', phone: '0BBB CCCCCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'CCCCC' },
  BD: { nameZh: '孟加拉国', nameEn: 'Bangladesh', flag: '🇧🇩', region: 'asia', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '国民身份证号', phone: '01BB-CCCCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'CCCC' },
  AE: { nameZh: '阿联酋', nameEn: 'United Arab Emirates', flag: '🇦🇪', region: 'asia', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: 'Emirates ID', phone: '0BB CCC CCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'CCCCC' },

  // ---------------- 中东 / 非洲 ----------------
  SA: { nameZh: '沙特阿拉伯', nameEn: 'Saudi Arabia', flag: '🇸🇦', region: 'mea', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '国民身份证号', phone: '0BB CCC CCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'CCCCC' },
  IL: { nameZh: '以色列', nameEn: 'Israel', flag: '🇮🇱', region: 'mea', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '身份证号 Teudat Zehut', phone: '0BB-CCC-CCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'CCCCCCC' },
  ZA: { nameZh: '南非', nameEn: 'South Africa', flag: '🇿🇦', region: 'mea', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '身份证号', phone: '0BB CCC CCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'CCCC' },
  NG: { nameZh: '尼日利亚', nameEn: 'Nigeria', flag: '🇳🇬', region: 'mea', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '国民身份号 NIN', phone: '0BBB CCC CCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'CCCCCC' },
  EG: { nameZh: '埃及', nameEn: 'Egypt', flag: '🇪🇬', region: 'mea', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '国民身份证号', phone: '01B CCCCCCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'CCCCC' },
  KE: { nameZh: '肯尼亚', nameEn: 'Kenya', flag: '🇰🇪', region: 'mea', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '国民身份证号', phone: '07BB CCCCCC', postal: { zh: '邮编', en: 'Postal Code' }, postalTpl: 'CCCCC' },
  MA: { nameZh: '摩洛哥', nameEn: 'Morocco', flag: '🇲🇦', region: 'mea', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: '国民身份证号', phone: '06BB-CCCCCC', postal: { zh: '邮编', en: 'Code Postal' }, postalTpl: 'CCCCC' },

  // ---------------- 大洋洲 ----------------
  AU: { nameZh: '澳大利亚', nameEn: 'Australia', flag: '🇦🇺', region: 'oceania', order: NAME_ORDER.WEST, id: ID_KIND.TFN, idLabel: '税号 TFN', phone: '04BB CCC CCC', postal: { zh: '邮编', en: 'Postcode' }, postalTpl: 'CCCC' },
  NZ: { nameZh: '新西兰', nameEn: 'New Zealand', flag: '🇳🇿', region: 'oceania', order: NAME_ORDER.WEST, id: ID_KIND.PERSONAL_ID, idLabel: 'IRD 号', phone: '0BB CCC CCCC', postal: { zh: '邮编', en: 'Postcode' }, postalTpl: 'CCCC' },
};

/** 大洲分组（用于界面归类展示） */
export const REGIONS = [
  { key: 'americas', nameZh: '美洲', icon: '🌎' },
  { key: 'europe', nameZh: '欧洲', icon: '🌍' },
  { key: 'asia', nameZh: '亚太', icon: '🌏' },
  { key: 'mea', nameZh: '中东 / 非洲', icon: '🕌' },
  { key: 'oceania', nameZh: '大洋洲', icon: '🏝️' },
];

/** 全部国家代码 */
export const ALL_CODES = Object.keys(COUNTRY_META);

export default COUNTRY_META;
