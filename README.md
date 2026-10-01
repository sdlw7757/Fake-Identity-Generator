<div align="center">

# 🪪 虚拟身份生成器

**Fake Identity Generator**

全球 **63** 个国家 / 地区的虚拟身份信息生成器 · 纯静态 · 无后端 · 无追踪

[![在线演示](https://img.shields.io/badge/在线演示-sdlw7757.github.io-4F8CFF?style=for-the-badge&logo=googlechrome&logoColor=white)](https://sdlw7757.github.io/Fake-Identity-Generator/)
[![GitHub](https://img.shields.io/badge/GitHub-查看源码-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sdlw7757/Fake-Identity-Generator)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A5%2022.22.2-339933.svg?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-11-F69220.svg?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Countries](https://img.shields.io/badge/countries-63-4F8CFF.svg)](#-功能特性)
[![Deploy](https://github.com/sdlw7757/Fake-Identity-Generator/actions/workflows/deploy.yml/badge.svg)](https://github.com/sdlw7757/Fake-Identity-Generator/actions/workflows/deploy.yml)

</div>

> 全部数据在浏览器本地随机生成，**不会上传到任何服务器**。生成结果均为虚构，仅用于开发者测试自己产品的表单校验、注册流程与 UI 布局。

---

## 📖 目录

| 章节 | 内容 |
| :--- | :--- |
| [⚠️ 合法用途声明](#-合法用途声明务必阅读) | 允许与禁止的用途边界 |
| [✨ 功能特性](#-功能特性) | 四大页签、63 国数据、批量导出 |
| [🚀 快速开始](#-快速开始) | 本地开发、构建、自动化测试 |
| [🌐 部署](#-部署到-github-pages) | GitHub Pages 与自动更新 |
| [🧩 扩展新国家](#-扩展新国家) | 两步接入一个国家 |
| [📁 项目结构](#-项目结构) | 目录说明 |
| [🛠️ 技术栈](#️-技术栈) | 依赖与构建产物 |

---

## ⚠️ 合法用途声明（务必阅读）

本项目生成的全部姓名、地址、电话、证件号与银行卡号均为**程序随机组合的虚构数据**：

- ❌ 不对应任何真实存在的个人、住址或账户；
- ❌ 银行卡号仅使用**公开测试号段（BIN）**，虽通过 Luhn 校验，但**不对应任何有效账户**，无法用于任何真实支付；
- ❌ 证件号（SSN / NINO / SIN / TFN）仅为**格式模拟**，与任何真实发证机构无关。

<table>
<tr><th>✅ 允许的用途</th><th>❌ 严禁的用途</th></tr>
<tr valign="top">
<td>

1. 开发者测试**自己产品**的表单校验、注册流程、UI 布局
2. 非真实业务的界面演示、教学示例
3. 填充测试数据库、做压力 / 边界测试

</td>
<td>

1. 真实平台账号注册（Amazon / Stripe / 银行等）
2. KYC 认证、金融交易、开卡开户
3. 规避平台政策、欺诈或任何违法行为

</td>
</tr>
</table>

> **用虚拟身份进行真实金融操作属于诈骗行为**，违反多国刑法。请务必遵守你所在地区的法律法规。

---

## ✨ 功能特性

界面结构：顶部四个页签，每个页签下先给出用途介绍，再是生成结果。

| 页签 | 内容 |
| :--- | :--- |
| 🪪 **临时身份** | 个人资料、信用卡信息、教育背景、职业信息、联系方式、证件号（SSN / NINO / SIN 等）、身体特征、生活方式、在线资料 |
| 📍 **临时地址** | 街道、城市、州 / 省、邮政编码；单行完整地址；可直接复制的**信封邮寄格式** |
| 📧 **临时邮箱** | 多种常见命名风格的邮箱、工作邮箱、用户名、强密码、安全问题、UUID |
| 💳 **临时信用卡** | 通过 Luhn 校验的卡号（Visa / MasterCard / Amex / Discover / JCB / UnionPay / Diners），含卡组织、卡号、有效期、CVV、持卡人、发卡行、国家、账单地址 |

### 其他能力

| 功能 | 说明 |
| :--- | :--- |
| 🌍 **63 国家 / 地区** | 覆盖美洲、欧洲、亚太、中东非、大洋洲，按大洲分组的下拉选择 |
| 🔍 **筛选条件** | 性别 + 国家 + 州 / 省 + 城市，四级联动 |
| 🎯 **规则驱动** | 每个国家按自己的电话模板、邮编模板、姓名顺序与证件号算法生成 |
| 📦 **批量生成** | 一次最多 50 条，支持 **JSON / CSV / SQL / TXT** 导出 |
| 📋 **一键复制** | 单字段复制 + 整段邮寄地址复制 |
| 🌗 **白天 / 夜间主题** | 默认浅色（白天），可切换深色，自动记忆偏好 |
| 📱 **移动端自适应** | 三档断点（760 / 560 / 380px），字段自动堆叠、控件防缩放、适配刘海屏 |
| ⌨️ **快捷键** | <kbd>1</kbd>–<kbd>4</kbd> 切页签、<kbd>G</kbd> 生成、<kbd>B</kbd> 批量生成 |
| 🖨️ **打印友好** | 可直接打印或导出 PDF |
| 🔗 **开源直达** | 顶栏与页脚均提供 GitHub 仓库入口 |

### 在线资料（Online）

「在线资料」卡片参照同类站点的 *Online* 段设计，包含：用户名、密码、个人网站、浏览器 User-Agent、IP 地址。

> **关于 IP 地址** —— 固定使用 **RFC 5737 文档保留网段**（`192.0.2.0/24`、`198.51.100.0/24`、`203.0.113.0/24`）。
> 这些网段永远不会指向真实主机，避免生成的 IP 意外命中他人真实地址。

### 各国格式示例

| 国家 | 电话 | 邮编 | 证件号 |
| :--- | :--- | :--- | :--- |
| 🇺🇸 美国 | `(505) 631-9095` | `75201` / ZIP+4 | SSN `810-73-7393` |
| 🇬🇧 英国 | `07872 149686` | `SW1A 4EL` | NINO `AB 12 34 56 C` |
| 🇯🇵 日本 | `030-9826-5200` | `100-0001` | My Number |
| 🇩🇪 德国 | `089 2482366` | `10115` | Steuer-ID |
| 🇨🇳 中国 | `139 4694 4678` | `110000` | 身份证（带校验位） |
| 🇨🇦 加拿大 | `(416) 555-0134` | `M5H 2N2` | SIN（带 Luhn） |

> 邮编会**继承所选城市的真实外码**（如伦敦 `SW1A`、多伦多 `M5H`），再按该国规则补齐其余位数，因此既格式合法又与城市对应。

---

## 🚀 快速开始

### 环境要求

| 依赖 | 版本 | 说明 |
| :--- | :--- | :--- |
| **Node.js** | `≥ 22.22.2`（推荐 24 LTS） | 冒烟测试依赖的 `jsdom 30` 要求 `^22.22.2 \|\| ^24.15.0 \|\| >=26`，Node 20 及以下无法运行 |
| **pnpm** | `≥ 10`（推荐 11） | `pnpm-workspace.yaml` 的 `allowBuilds` 是 pnpm 10+ 的写法 |

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器 → http://localhost:5173
pnpm dev
```

### 构建生产版本

```bash
pnpm build      # 产物输出到 dist/
pnpm preview    # 本地预览构建结果
```

构建产物是**纯静态文件**，可直接托管到任何静态服务器。

> ⚠️ **不要**用 `file://` 直接双击打开 `dist/index.html`：产物使用 ES Module 与代码分割，
> 浏览器在 `file://` 协议下会因 CORS 策略拒绝加载模块。本地预览请使用 `pnpm preview`（或任意静态服务器）。

### 自动化测试

项目内置两套自检脚本，用于保证数据质量与界面可用性：

```bash
pnpm validate   # 数据模块 + 生成引擎自检（全部 63 国）
pnpm smoke      # 界面冒烟测试（jsdom 中加载构建产物）
pnpm check      # 一键跑完：生成数据入口 → 自检 → 构建 → 冒烟测试
```

<details>
<summary><b>🔍 <code>pnpm validate</code> 会校验什么</b></summary>

<br>

遍历**全部国家**校验：

- 每个国家数据模块的数组完整性（城市、姓名库、公司、职位、院校等是否达到最小条数）与重复项
- 城市字段是否齐全（`city` / `cityZh` / `state` / `zip` 为字符串 / `streets`）
- 数据文件源码规范：无 BOM、字符串统一单引号、`export default` 齐全、运行时字段集合统一
- **城市邮编形状是否与本国 `postalTpl` 模板一致**（支持加拿大这类只存外码前缀的情况）
- 每国各生成 40 份身份，检查必填字段是否缺失
- **所有银行卡号是否通过 Luhn 校验**、卡号长度是否与卡组织匹配、有效期是否未过期
- **邮编与电话的形状是否与该国模板一致**（含英国这类外码长度可变的特殊情况）
- 证件号是否非空、年龄是否落在 18–65、邮箱格式是否合法
- **校验位算法回归**：Luhn 已知向量、巴西 CPF、中国身份证、加拿大 SIN 的校验位自洽性
- **筛选功能**：性别、州、城市筛选是否稳定生效，无效条件是否安全回退

</details>

<details>
<summary><b>🔍 <code>pnpm smoke</code> 会校验什么</b></summary>

<br>

在 jsdom 中加载打包后的真实产物，验证：

- 四个页签的结构 / 切换 / 介绍
- **跨页签身份一致性**（切换页签不会「换一个人」）
- 多国电话与邮编格式
- 筛选联动
- 主题切换
- JSON / CSV / SQL / TXT 导出是否正确

</details>

---

## 🌐 部署到 GitHub Pages

项目已内置 GitHub Actions 工作流（[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)），推送到 GitHub 后自动部署。

工作流在部署前会执行 `pnpm run check`（自检 + 构建 + 冒烟测试），**任何一步失败都不会发布**，避免把坏数据部署上线。

> **关于版本** —— 工作流使用 **Node 24 + pnpm 11**，且 pnpm 版本只在 [`package.json`](./package.json) 的
> `packageManager` 字段声明一处（action 会自动读取）。若在 `pnpm/action-setup` 里再写 `version`，
> 两者字符串不一致时会直接报 `Multiple versions of pnpm specified` 而导致 CI 失败。

### 首次部署步骤

1. **创建仓库并推送代码**

   ```bash
   git init
   git add .
   git commit -m "feat: 虚拟身份生成器"
   git branch -M main
   git remote add origin git@github.com:<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

2. **开启 Pages**
   进入仓库 → `Settings` → `Pages` → 在 **Build and deployment** 下把 `Source` 设为 **GitHub Actions**。

3. **等待自动部署**
   推送后 `Actions` 标签页会自动运行 `Deploy to GitHub Pages`，完成后访问：

   ```
   https://<你的用户名>.github.io/<仓库名>/
   ```

> 构建配置中 `base: './'` 使用**相对路径**，因此无论部署在根域名还是 `/<仓库名>/` 子路径下都能正常加载资源。

### 🔄 自动更新机制

工作流已配置三种触发方式，满足后续「自动更新」需求：

| 触发方式 | 场景 |
| :--- | :--- |
| `push` | 推送到 `main` / `master` 分支时自动重新构建部署 |
| `schedule` | **每周一 UTC 00:00 定时重建**，保证依赖与产物持续更新 |
| `workflow_dispatch` | 在 Actions 页面**手动点击运行**，随时触发更新 |

如需调整定时频率，修改 `.github/workflows/deploy.yml` 中的 `cron` 表达式即可，例如改为每天重建：

```yaml
schedule:
  - cron: '0 0 * * *'
```

---

## 📁 项目结构

```text
.
├── .github/workflows/deploy.yml   # GitHub Actions 自动部署工作流
├── index.html                     # 入口 HTML
├── vite.config.js                 # Vite 构建配置（base: './' 适配 Pages）
├── package.json                   # packageManager 字段声明 pnpm 版本
├── scripts/
│   ├── gen-index.mjs              # 扫描 data/ 自动生成 index.js
│   ├── validate.mjs               # 数据与生成引擎自检（全部国家）
│   └── smoke-ui.mjs               # 界面冒烟测试（jsdom）
└── src/
    ├── main.js                    # 应用主入口：四页签 UI 与交互
    ├── style.css                  # 样式表（深色 / 浅色主题、响应式）
    ├── lib/
    │   ├── generator.js           # 生成引擎（规则驱动，无国家分支）
    │   ├── random.js              # 随机数、邮编模板、电话模板
    │   ├── luhn.js                # Luhn 校验与卡号生成
    │   └── exporters.js           # 复制 / JSON / CSV / SQL / TXT 导出
    └── data/
        ├── countryMeta.js         # 各国格式规则注册表（新增国家改这里）
        ├── index.js               # 自动生成：国家代码 → 素材库
        ├── us.js  uk.js  ca.js  au.js  de.js  fr.js  jp.js  …
        └── …                      # 每个国家一个数据模块
```

---

## 🧩 扩展新国家

架构是**规则驱动**的，引擎里没有任何针对具体国家的 `if/else`，新增国家只需两步：

**① 登记格式规则** —— 在 [`src/data/countryMeta.js`](src/data/countryMeta.js) 的 `COUNTRY_META` 中加入一行：

```js
KR: {
  nameZh: '韩国', nameEn: 'South Korea', flag: '🇰🇷', region: 'asia',
  order: NAME_ORDER.EAST,        // 姓名顺序：WEST / EAST / LATIN
  id: ID_KIND.RRN,               // 证件号算法
  idLabel: '住民登录号',
  phone: '0B-BBBB-CCCC',         // 电话模板
  postal: { zh: '邮编', en: '우편번호' },
  postalTpl: 'CCCCC',            // 邮编模板
},
```

| 占位符 | 含义 |
| :---: | :--- |
| `A` | 大写字母 |
| `B` | 非零数字 |
| `C` | 数字 |
| `D` | 字母或数字（用于爱尔兰 Eircode 这类混合编号） |

> 电话模板中的 `A/B/C` **一律代表数字**（见 `fillPhone`）。
> 若某国邮编外码长度可变（如英国 `N1` / `SE10` / `EC1A`），加上 `postalFlex: true`，引擎会直接沿用城市自带的外码。

**② 放入数据模块** —— 创建 `src/data/kr.js`，导出规范字段：

```js
export const kr = {
  code: 'KR',
  cities: [/* ... */],
  maleFirst: [/* ... */], femaleFirst: [/* ... */], lastNames: [/* ... */],
  companies: [/* ... */], jobTitles: [/* ... */], universities: [/* ... */],
  domainSuffixes: [/* ... */],
};

export default kr;
```

然后运行 `pnpm gen:index` 自动重建入口文件（**无需手工维护 import 列表**）。

> `gen-index` 只会收录上面列出的 9 个规范字段。早期数据集（`us` / `uk` / `ca` / `au`）中额外的
> `states` / `areaCodes` / `phoneFormat` 等字段已在生成入口时被剔除，避免它们覆盖 `countryMeta.js` 的元数据。

界面上的国家下拉、州 / 城市联动会**自动出现**，不用改任何 UI 代码。

> 💡 `src/data/index.js` 是按各数据集自身的 `code` 字段建索引的，而不是文件名 —— 因为两者未必一致（如 `uk.js` 的 `code` 是 `GB`）。

---

## 🛠️ 技术栈

| 层面 | 选型 |
| :--- | :--- |
| **构建** | [Vite 5](https://vitejs.dev) —— 零配置、秒级 HMR |
| **框架** | 原生 JavaScript（ES Modules），**无运行时依赖** |
| **样式** | 原生 CSS + CSS 变量实现主题切换 |
| **测试** | Node 脚本 + jsdom 冒烟测试 |
| **部署** | GitHub Actions → GitHub Pages |

### 构建产物

63 国的姓名 / 城市素材库体积较大，构建时通过 `manualChunks` 拆成两个文件：

| 产物 | 体积（gzip） | 说明 |
| :--- | ---: | :--- |
| `index-*.js` | ~14 kB | 应用逻辑（UI、生成引擎、导出） |
| `country-data-*.js` | ~390 kB | 国家素材库，单独成块便于长期缓存 |

这样应用代码更新时，体积较大的素材库仍能命中浏览器缓存，同时也避免 Rollup 的 chunk 体积告警。

---

## 📜 许可

本项目基于 [MIT License](./LICENSE) 开源。

仅供学习与合法的开发测试用途。使用者需自行承担因不当使用产生的一切法律责任。

<div align="center">

**[⬆ 回到顶部](#-虚拟身份生成器)**

</div>