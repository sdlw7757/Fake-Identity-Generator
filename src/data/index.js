/**
 * 国家数据模块统一入口（本文件由 scripts/gen-index.mjs 自动生成，请勿手工编辑）
 *
 * 当前收录 63 个国家 / 地区。
 * 新增国家：在 src/data 下创建 xx.js 后运行 `pnpm gen:index`。
 */

import { ae } from './ae.js';
import { ar } from './ar.js';
import { at } from './at.js';
import { au } from './au.js';
import { bd } from './bd.js';
import { be } from './be.js';
import { bg } from './bg.js';
import { br } from './br.js';
import { ca } from './ca.js';
import { ch } from './ch.js';
import { cl } from './cl.js';
import { cn } from './cn.js';
import { co } from './co.js';
import { cz } from './cz.js';
import { de } from './de.js';
import { dk } from './dk.js';
import { ee } from './ee.js';
import { eg } from './eg.js';
import { es } from './es.js';
import { fi } from './fi.js';
import { fr } from './fr.js';
import { gr } from './gr.js';
import { hk } from './hk.js';
import { hr } from './hr.js';
import { hu } from './hu.js';
import { id } from './id.js';
import { ie } from './ie.js';
import { il } from './il.js';
import inData from './in.js';
import { is } from './is.js';
import { it } from './it.js';
import { jp } from './jp.js';
import { ke } from './ke.js';
import { kr } from './kr.js';
import { lt } from './lt.js';
import { lu } from './lu.js';
import { lv } from './lv.js';
import { ma } from './ma.js';
import { mx } from './mx.js';
import { my } from './my.js';
import { ng } from './ng.js';
import { nl } from './nl.js';
import { no } from './no.js';
import { nz } from './nz.js';
import { pe } from './pe.js';
import { ph } from './ph.js';
import { pk } from './pk.js';
import { pl } from './pl.js';
import { pt } from './pt.js';
import { ro } from './ro.js';
import { ru } from './ru.js';
import { sa } from './sa.js';
import { se } from './se.js';
import { sg } from './sg.js';
import { sk } from './sk.js';
import { th } from './th.js';
import { tr } from './tr.js';
import { tw } from './tw.js';
import { ua } from './ua.js';
import { uk } from './uk.js';
import { us } from './us.js';
import { vn } from './vn.js';
import { za } from './za.js';

/** 规范字段集合（与 README 中约定的数据模块结构一致） */
const KEYS = [
  'code', 'cities', 'maleFirst', 'femaleFirst', 'lastNames',
  'companies', 'jobTitles', 'universities', 'domainSuffixes',
];

/**
 * 只保留规范字段。
 * 早期数据集（us/uk/ca/au）额外带有 states / areaCodes / phoneFormat /
 * postalName / nameZh / nameEn / flag 等未被引擎使用的字段，
 * 这些字段既冗余又可能覆盖 countryMeta.js 的元数据，故在此统一剔除。
 */
const pick = (d) => {
  if (!d) return null;
  const out = {};
  for (const k of KEYS) if (d[k] !== undefined) out[k] = d[k];
  return out;
};

const all = {
  ae: pick(ae),
  ar: pick(ar),
  at: pick(at),
  au: pick(au),
  bd: pick(bd),
  be: pick(be),
  bg: pick(bg),
  br: pick(br),
  ca: pick(ca),
  ch: pick(ch),
  cl: pick(cl),
  cn: pick(cn),
  co: pick(co),
  cz: pick(cz),
  de: pick(de),
  dk: pick(dk),
  ee: pick(ee),
  eg: pick(eg),
  es: pick(es),
  fi: pick(fi),
  fr: pick(fr),
  gr: pick(gr),
  hk: pick(hk),
  hr: pick(hr),
  hu: pick(hu),
  id: pick(id),
  ie: pick(ie),
  il: pick(il),
  in: pick(inData),
  is: pick(is),
  it: pick(it),
  jp: pick(jp),
  ke: pick(ke),
  kr: pick(kr),
  lt: pick(lt),
  lu: pick(lu),
  lv: pick(lv),
  ma: pick(ma),
  mx: pick(mx),
  my: pick(my),
  ng: pick(ng),
  nl: pick(nl),
  no: pick(no),
  nz: pick(nz),
  pe: pick(pe),
  ph: pick(ph),
  pk: pick(pk),
  pl: pick(pl),
  pt: pick(pt),
  ro: pick(ro),
  ru: pick(ru),
  sa: pick(sa),
  se: pick(se),
  sg: pick(sg),
  sk: pick(sk),
  th: pick(th),
  tr: pick(tr),
  tw: pick(tw),
  ua: pick(ua),
  uk: pick(uk),
  us: pick(us),
  vn: pick(vn),
  za: pick(za),
};

/** 国家代码 -> 素材库（以各数据集自身的 code 字段为准） */
export const datasets = {
  ...Object.fromEntries(
    Object.values(all).filter(Boolean).map((d) => [d.code, d])
  ),
};

/** 与文件名同名的原始导入集合，便于调试 */
export const byFile = all;

export default datasets;
