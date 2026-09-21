# 澄湾小红书式移动端 H5：Netlify 全栈版 V1.9

本工程把原 V1.5 的静态前端、FastAPI 接口和 SQLite 数据库改造为：

- Netlify Static Hosting：H5、图片、头像和管理页；
- Netlify Functions：随机化、逐页保存、事件记录、统计和 CSV 导出；
- Netlify Database：平台内置的托管 PostgreSQL；
- Netlify 自动迁移：首次部署时建立 `participants`、`responses`、`events` 三张表。

城市介绍、帖子正文、图片、四组评论、随机化、数据库结构和导出字段均保持不变。V1.9 仅进一步调整即时自我控制感题项的中文端点，使其直接对应旅行行程的掌控体验；材料修订编号更新为 `revision_id=R8`。

## 一、部署前要求

1. Netlify Credit-based plan。Netlify Database 目前需要 Credit-based plan。
2. GitHub、GitLab 或 Bitbucket 仓库。
3. Node.js 22.13.0 或更高版本；工程通过 `.node-version` 建议使用 Node.js 24，并固定 Netlify CLI 26.2.0 用于本地开发。

## 二、最稳妥的部署流程

### 1. 解压并上传 Git 仓库

把整个工程目录上传到一个私有仓库。不要只上传 `public` 文件夹，否则 Functions 和数据库迁移不会部署。

### 2. 在 Netlify 导入仓库

Netlify 控制台选择：

`Add new project → Import an existing project → 选择 Git 仓库`

工程已经提供 `netlify.toml`，正常情况下无需手工填写构建参数：

- Build command：`npm run build:manifest`
- Publish directory：`public`
- Functions directory：`netlify/functions`

### 3. 设置管理员令牌

在 Netlify 项目中进入：

`Project configuration → Environment variables`

新增：

```text
ADMIN_TOKEN=一段至少32位的随机字符串
```

不要把真实令牌写进 Git 仓库或 `netlify.toml`。设置后重新部署一次。

### 4. 创建或确认 Netlify Database

因为项目安装了 `@netlify/database` 并带有迁移文件，Netlify 在支持的账户中会自动配置数据库并在部署前应用迁移。

如果没有自动创建，在项目侧边栏进入 `Database`，选择创建数据库，再重新部署。数据库连接变量 `NETLIFY_DB_URL` 由平台自动提供，不需要手工复制到前端。

### 5. 发布后检查

假设站点地址为：

```text
https://your-study.netlify.app
```

依次检查：

```text
https://your-study.netlify.app/api/health
https://your-study.netlify.app/
https://your-study.netlify.app/admin
```

`/api/health` 应返回 `ok: true`。随后完整提交一份测试问卷，在管理页输入 `ADMIN_TOKEN`，确认创建、随机化和提交人数增加，并下载四类 CSV。

## 三、本地测试

```bash
npm install
npx netlify login
npx netlify link
npm run validate
npx netlify dev
# 另开一个终端执行：npx netlify database migrations apply
```

打开 Netlify CLI 输出的本地地址。不要直接双击 `index.html`，否则 `/api/*` 不会连接到 Functions。

## 四、数据查看与导出

管理页：

```text
/admin
```

可查看当前波次统计，并导出：

- `experiment_wide.csv`
- `participants.csv`
- `responses_long.csv`
- `events.csv`
- 材料 SHA-256 清单

也可以在 Netlify 控制台的 `Database` 页面查看三张表。正式收集期间不要直接编辑生产数据。

## 五、随机化与并发控制

随机化仍按 G1—G4 等概率分配和每组配额执行。Netlify 版在 PostgreSQL 事务中增加了 advisory transaction lock，用于避免多个受试者同时随机化时突破配额。

## 六、隐私与安全

- 不保存姓名、手机号、精确地址、IP 地址或完整 User-Agent；
- 管理接口必须提供 `X-Admin-Token`；
- 管理令牌只通过 Netlify Functions 环境变量读取；
- CSV 对以 `= + - @` 开头的文本进行公式注入防护；
- API 和页面均设置禁止嵌入、禁用摄像头/麦克风/定位等安全头；
- 正式招募前仍需完成伦理审批、隐私说明、技术试运行和数据备份方案。

## 七、重要限制

- Netlify Functions 为按请求执行，首次访问可能有冷启动延迟；应在 N=30—60 技术试运行中记录接口失败率与页面保存耗时。
- Netlify Database 和 Functions 会产生平台用量；正式 N=720 前应核对当前套餐与额度。
- Deploy Preview 使用独立数据库分支。正式数据只应从生产域名收集，不要向受试者发放预览链接。
- 修改实验材料后必须更新 `revision_id`；单纯修复部署代码但不改变刺激内容时，不应改写材料版本。


## V1.7 新增与调整

### 1. 评论区操纵检查口语化

变量名与 1—7 计分方式保持不变，仅调整参与者看到的题目：

- `perceived_comment_P`：看完这几条评论，你觉得大家整体心情是偏不开心，还是偏开心？
- `perceived_comment_A`：这些评论让你觉得大家当时的状态是偏平静、松弛，还是偏兴奋、带劲？
- `perceived_comment_D`：从这些评论来看，大家更像是被行程和时间推着走，还是能自己安排、掌握节奏？

题目前明确提示参与者只评价六条评论，不考虑帖子正文和图片。

### 2. 发布账号头像

新增本地资源：`public/assets/avatar_publisher.png`。头像为 AI 生成的虚构旅行账号插画，不对应现实人物，并在四个条件中完全相同。


## V1.9 新增与调整

### 即时自我控制感题项进一步口语化

变量名、题序和 1—7 分计分方式保持不变，仅将 `self_D` 的两端由：

- “完全受情境支配—非常自主”

调整为：

- “行程超出我的掌控—行程在我的掌控之中”

题干仍为“此刻我感到”。该修改让参与者直接围绕当前旅行行程是否可控作答，减少“情境支配”和“自主”等抽象词造成的理解负担。后端数据库字段、标准化公式、宽表导出和统计代码不变。

## V1.8 新增与调整

### 1. 总体品牌形象题项去重

为避免“总体很差—总体很好”与“总体印象很负面—总体印象很正面”表达过于接近，保留三题量表结构和原变量名不变，将第三题调整为：

- `brand_pre3` / `brand_post3`：我对澄湾的喜爱程度；端点为“很不喜欢—很喜欢”。

这样仍保留总体评价、吸引力和喜爱程度三个相关但不完全相同的评价侧面。

### 2. 即时自我 PAD 端点精简

- `self_A`：端点改为“非常平静—非常兴奋”，删除“低激活／高激活”备注；
- `self_D`：端点改为“完全受情境支配—非常自主”，删除“无控制感／有控制感”备注。

变量名、1—7 分计分、数据库结构、宽表导出和统计计算方式均保持不变。
