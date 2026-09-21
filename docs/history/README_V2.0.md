# 澄湾小红书式移动端H5 · Netlify全栈 V2.0

## 当前交付内容

基于V1.9归档工程替换为用户确认的R9候选材料，不是另外设计一套实验。

| 项目 | 本版默认 |
|---|---|
| 工程版本 | netlify-fullstack-v2.0 |
| 界面版本 | xhs-mobile-v2.0 |
| 材料修订 | R9 |
| 问卷修订 | Q9 |
| 收集波次 | PRETEST-W2 |
| 阶段 | pretest（第二轮独立材料预测试候选） |
| 随机化 | 后端G1—G4配额约束等概率随机；未满额组中抽取 |
| 每组配额 | 40个随机名额，不是40份有效答卷 |
| 最短展示 | 城市文字25秒；帖子评论45秒 |

**尚未通过专家、认知访谈及新样本操纵校准。不要把本次技术检查当作操纵成功。**

## 本次已经替换

24条评论逐字采用本轮确认稿；同一位置共享同一事实首句。G1主要记录信息，G2为松弛正向，G3为兴奋正向，G4为焦虑担忧。四组C1均使用📍，C6均使用📝，其余评论不使用情绪emoji。

评论PAD题、自身感受题、材料质量题及风险事实题按确认稿替换。“很平静—很激动”下方加入约定的说明。品牌前后测、访问意向、记忆题、注意题、人口学题不改。

新增 `comment_feeling_open`，位于品牌后测和访问意向之后、评论PAD/类别之前的独立页面，最多1200字符、可跳过、空白存NULL。独立页面不会提前显示类别选项。但self PAD仍在前面，所以不宣称该开放题完全没有情绪提示。

**城市简介、统一帖子、标签、三张城市图、六名评论者身份与头像、发布头像全部保持R8原样。** 城市简介继续不显示图片和标签；帖子仍含“治愈感拉满”等松弛型表达。

## 项目结构

```
config/study.json                # 材料和题目的唯一编辑入口（不公开整个文件）
config/research_targets.json     # 仅供研究者使用的PAD目标
public/                         # 原移动端H5、头像图片、管理后台
netlify/functions/api.mjs        # 生产入口：连接Netlify Database
netlify/functions/lib/api-core.mjs
netlify/functions/lib/study-config.mjs  # 构建时自动同步，不要手工改
netlify/database/migrations/     # 原迁移原样保留
scripts/                        # 同步、校验、哈希
tests/                         # 本地接口测试；不会被发布到public
docs/                          # 升级、数据字典、变更、测试与历史记录
```

## 升级现有Netlify项目（不要删除数据库）

1. 停止旧轮招募，等待进行中的受试者完成；导出并备份四类CSV和旧版材料/配置。当前数据仍应按R8报告，不能覆写成R9。
2. 将本工程文件放到现有Git仓库项目根目录，更新全部 `config/`、`public/`、`netlify/functions/`、`scripts/` 与 `netlify.toml`，不要只上传public。
3. 保留现有Netlify项目绑定、数据库和真实环境变量。**不删除旧数据、不重建生产数据库、不在仓库提交ADMIN_TOKEN。** 新包没有生产令牌。
4. Netlify构建配置：`npm run build`；发布目录`public`；Functions目录`netlify/functions`。`npm run build`会先同步JSON到函数模块，再校验并生成哈希。
5. 保留Netlify环境变量中的ADMIN_TOKEN；没有时在Project configuration → Environment variables中添加，作用域需要包含Functions。环境变量更新后需新部署生效。
6. 新部署成功后，通过 `/api/health` 查看R9/PRETEST-W2；通过 `/admin` 登录，先验证一份非生产测试记录的完整提交和导出，再开始真实预测试。

建议在Deploy Preview或单独测试站点试运行，不将预览网址发给正式受试者。若在生产域名做技术测试，请先使用独立测试wave_id，测试结束再恢复PRETEST-W2并重新构建；保留测试记录的来源，不混入分析。

### 数据库是否需要迁移？

**本轮不需要新增SQL迁移。** 既有 `participants` / `responses` / `events` 三表保持原样；开放回答作为 `responses.variable_name=comment_feeling_open` 的记录保存，宽表和长表会导出。

新参与者标记为R9/PRETEST-W2。旧R8会话不能继续写入R9；完成后的同浏览器会话不会因刷新重新分组。匿名浏览器会话不能识别同一真实人换设备或隐私窗口的重复参与，应另由招募过程控制独立样本。

后台统计只显示当前波次/版本；CSV保持导出数据库中的全部历史记录。分析本轮时筛选 `revision_id=R9` 且 `wave_id=PRETEST-W2`。

## 管理入口及数据

- 实验：`https://你的站点.netlify.app/`
- 后台：`https://你的站点.netlify.app/admin`
- 基础健康检查：`/api/health`（只证明函数可响应，不证明数据库可写）
- 带X-Admin-Token的数据库连通检查：`/api/admin/health`
- 导出：宽表、样本流、长表回答、事件日志、材料哈希清单。

新增开放回答会进入宽表的 `comment_feeling_open` 列；原PAD变量名与1—7计分不变。`emotion_label`选项顺序和文字已更新，保存的是选项原文，不要按旧分类字符串合并编码。

### 关键限制仍保留

`stimulus_loaded`仍检查帖子中全部img（包括头像）是否加载，不等于评论文字是否阅读。25/45秒沿用旧计时口径，未改成扣除后台停留的阅读计时。本轮没有新增逐条评论可见时长，也没有改变分析排除规则。

所有操纵检查只用于校准；不根据回答是否符合目标情绪删除受试者，不按品牌显著性挑材料。保持字段名也不代表新旧测量完全等值。

## 本地检查与开发

```
npm run build
npm test
```

上述命令在Node 22.16或更高环境可运行。`npm test`使用Node内置SQLite测试适配器，验证实际API核心代码的流程/保存/导出；**不是PostgreSQL或Netlify云端集成测试**。测试中的advisory lock仅记录SQL调用，未验证真正并发锁。

普通本地开发：
```
npm install
npx netlify login
npx netlify link
npx netlify dev
```

另有纯本地、不接触真实数据库的功能预览：`npm run test:preview`。它在127.0.0.1:8799使用内存SQLite测试数据，重启即消失；**不可用它收集真实受试数据**。测试管理令牌只在tests内，不是生产默认密码。

### 依赖与实测范围

本轮没有新增生产依赖，沿用源V1.9的Netlify SDK声明与CLI 26.2.0。交付环境不能访问npm registry，因此没有执行npm install、SDK重新打包或真实Netlify部署，也未生成虚假的package-lock。已有仓库中的已验证package-lock可保留；没有锁文件时应在可联网环境运行npm install、核验构建并提交生成的锁文件，再冻结正式运行环境。

12项本地API测试通过；320/390宽度离线浏览器完整流程、768/1366布局检查通过。离线渲染使用真实HTML/CSS/JS、原图片和本地API核心，浏览器网络由测试适配器承接；不等同于微信/iPhone实机或Netlify生产测试。

## 官方部署资料（核对日期：2026-09-06）

- Netlify Database： https://docs.netlify.com/build/data-and-storage/netlify-database/getting-started/
- SDK pool/getDatabase： https://docs.netlify.com/build/data-and-storage/netlify-database/api/
- 自动迁移： https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/
- Functions环境变量： https://docs.netlify.com/build/functions/environment-variables/

详细材料见配套R9材料包，更新范围与测试限制见docs目录。
