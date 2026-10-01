# 🪪 虚拟身份生成器 · Fake Identity Generator

> 美国 / 英国 / 加拿大 / 澳大利亚 虚拟身份信息生成器 —— [haoweichi.com](https://www.haoweichi.com/) 的**开源自建替代实现**。
>
> 纯静态、无后端、无追踪，全部分布在浏览器本地生成，不上传任何数据。

---

## ⚠️ 合法用途声明（务必阅读）

本项目生成的全部姓名、地址、电话、证件号与银行卡号均为**程序随机组合的虚构数据**：

- 不对应任何真实存在的个人、住址或账户；
- 银行卡号仅使用**公开测试号段（BIN）**，虽通过 Luhn 校验但**不对应任何有效账户**，无法用于任何真实支付；
- 证件号（SSN / NINO / SIN / TFN）仅为**格式模拟**，与任何真实发证机构无关。

**允许的用途：**

1. ✅ 开发者测试**自己产品**的表单校验、注册流程、UI 布局
2. ✅ 非真实业务的界面演示、教学示例
3. ✅ 填充测试数据库、做压力/边界测试

**严禁的用途：**

1. ❌ 用于真实平台账号注册（Amazon / Stripe / 银行等）
2. ❌ 用于 KYC 认证、金融交易、开卡开户
3. ❌ 用于规避平台政策、欺诈或任何违法行为

> 用虚拟身份进行真实金融操作属于**诈骗行为**，违反多国刑法。请务必遵守你所在地区的法律法规。

---

## ✨ 功能特性

| 功能 | 说明 |
| --- | --- |
| 🌍 **四国支持** | 🇺🇸 美国 · 🇬🇧 英国 · 🇨🇦 加拿大 · 🇦🇺 澳大利亚 |
| 👤 **全套身份字段** | 姓名、性别、生日、年龄、星座、学历等 10+ 项 |
| 📍 **真实格式地址** | 按各国邮编规则生成（美国 ZIP+4 / 英国 Postcode / 加拿大 A1A 1A1 / 澳洲 4 位） |
| 📞 **合规电话格式** | 各国区号与手机号段规则 |
| 🪪 **证件号模拟** | SSN / NINO / SIN / TFN、驾驶证号 |
| 💳 **Luhn 校验卡号** | Visa / MasterCard / Amex / Discover / JCB 测试号段 |
| 🔐 **账号类字段** | 用户名、强密码、UUID、安全问题、Account#、Routing#、IBAN |
| 📦 **批量生成** | 一次最多 50 条，支持 **JSON / CSV / SQL / TXT** 导出 |
| 📋 **一键复制** | 单字段复制 + 复制全部 |
| 🌗 **深色 / 浅色主题** | 自动记忆偏好 |
| ⌨️ **快捷键** | `G` 生成、`B` 批量生成 |
| 🖨️ **打印友好** | 可直接打印或导出 PDF |

---

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖（需 Node.js 18+ 与 pnpm）
pnpm install

# 启动开发服务器 → http://localhost:5173
pnpm dev
```

### 构建生产版本

```bash
pnpm build      # 产物输出到 dist/
pnpm preview    # 本地预览构建结果
```

构建产物是**纯静态文件**，可直接用浏览器打开 `dist/index.html`，或托管到任意静态服务器。

---

## 🌐 部署到 GitHub Pages

项目已内置 GitHub Actions 工作流（`.github/workflows/deploy.yml`），推送到 GitHub 后自动部署。

### 首次部署步骤

1. **创建仓库并推送代码**

   ```bash
   git init
   git add .
   git commit -m "feat: 虚拟身份生成器"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
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
| --- | --- |
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

```
.
├── .github/workflows/deploy.yml   # GitHub Actions 自动部署工作流
├── index.html                     # 入口 HTML
├── vite.config.js                 # Vite 构建配置（base: './' 适配 Pages）
├── package.json
└── src/
    ├── main.js                    # 应用主入口：UI 渲染与交互
    ├── style.css                  # 样式表（深色/浅色主题、响应式）
    ├── lib/
    │   ├── generator.js           # 身份生成引擎（核心）
    │   ├── random.js              # 随机数与格式化工具
    │   ├── luhn.js                # Luhn 校验与卡号生成
    │   └── exporters.js           # 复制 / JSON / CSV / SQL / TXT 导出
    └── data/
        ├── us.js                  # 🇺🇸 美国数据集
        ├── uk.js                  # 🇬🇧 英国数据集
        ├── ca.js                  # 🇨🇦 加拿大数据集
        └── au.js                  # 🇦🇺 澳大利亚数据集
```

---

## 🧩 扩展新国家

只需三步：

1. 在 `src/data/` 下新建 `de.js`，导出与 `us.js` **相同结构**的数据对象（`code` / `nameZh` / `states` / `cities` / `maleFirst` …）。
2. 在 `src/lib/generator.js` 顶部导入并注册：

   ```js
   import { de } from '../data/de.js';
   export const COUNTRIES = { US: us, GB: uk, CA: ca, AU: au, DE: de };
   export const COUNTRY_LIST = [us, uk, ca, au, de];
   ```

3. 在 `genAddress()` / `genPhone()` / `genNationalId()` 中为 `de` 增加对应的格式分支。

界面的国家选择标签会自动渲染，无需改动 UI 代码。

---

## 🛠️ 技术栈

- **构建**：Vite 5 —— 零配置、秒级 HMR
- **框架**：原生 JavaScript（ES Modules），无运行时依赖，产物极小
- **样式**：原生 CSS + CSS 变量实现主题切换
- **部署**：GitHub Actions → GitHub Pages

---

## 📜 许可

[MIT](./LICENSE)

本项目仅供学习与合法的开发测试用途。使用者需自行承担因不当使用产生的一切法律责任。
