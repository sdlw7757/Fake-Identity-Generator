/**
 * 导出与复制工具
 */

import { flattenIdentity } from './generator.js';

/** 复制文本到剪贴板，带降级方案（http 环境下 clipboard API 不可用） */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    /* 继续尝试降级方案 */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

/** 触发浏览器下载 */
export function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 导出为 JSON */
export function toJSON(identities) {
  const list = Array.isArray(identities) ? identities : [identities];
  const payload = list.length === 1 ? flattenIdentity(list[0]) : list.map(flattenIdentity);
  return JSON.stringify(payload, null, 2);
}

/** 转义 CSV 单元格 */
function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 导出为 CSV（带 UTF-8 BOM，Excel 打开不乱码） */
export function toCSV(identities) {
  const list = Array.isArray(identities) ? identities : [identities];
  const rows = list.map(flattenIdentity);
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h])).join(','));
  return '\uFEFF' + lines.join('\r\n');
}

/** 导出为纯文本（便于粘贴到表单） */
export function toText(identities) {
  const list = Array.isArray(identities) ? identities : [identities];
  return list
    .map((id, i) => {
      const f = flattenIdentity(id);
      const lines = Object.entries(f).map(([k, v]) => `${k}: ${v}`);
      return list.length > 1 ? `===== #${i + 1} =====\n${lines.join('\n')}` : lines.join('\n');
    })
    .join('\n\n');
}

/** 导出为 SQL INSERT 语句（用于填充测试数据库） */
export function toSQL(identities, table = 'test_users') {
  const list = Array.isArray(identities) ? identities : [identities];
  return list
    .map((id) => {
      const f = flattenIdentity(id);
      const cols = Object.keys(f).map((c) => `\`${c}\``).join(', ');
      const vals = Object.values(f)
        .map((v) => (typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`))
        .join(', ');
      return `INSERT INTO \`${table}\` (${cols}) VALUES (${vals});`;
    })
    .join('\n');
}
