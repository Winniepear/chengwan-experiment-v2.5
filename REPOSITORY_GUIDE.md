# V2.5 Git 仓库使用说明

## 本次交付是什么

这是 `chengwan_h5_experiment_netlify_fullstack_v2.5.zip` 的 Git 仓库化交付。

- 仓库目录：`chengwan-experiment-v2.5`
- 默认分支：`main`
- 标签 `upstream-v2.5.0`：原始 V2.5 工程文件的首次导入。
- 标签 `v2.5.0`：增加 Git 忽略规则、字节保留规则和本使用说明后的交付版。
- 材料 / 问卷：`R13 / Q13`，仍然是 29 个作答字段。
- 默认运行波次：`PRETEST-W6`，每组配额仍为 40。

**本次没有实施后续讨论的测量、评论、计时、随机化或见数迁移调整。**
这不是 Credamo/jsPsych 转换包，也不是新的实验材料版本。
原 `README.md`、运行代码、问卷与材料配置、图片、测试和数据库迁移均保留。
原压缩包内个别历史参考文件名已有编码异常，本次也未擅自重命名。

当前仓库只在交付文件中建立，尚未发布到 GitHub，也没有配置远程地址。
提交作者使用技术性标记 `Repository Export`，不代表研究者身份或来源作者。
原 ZIP 不包含 Git 历史；这里的两次提交仅记录导入和仓库包装，不是此前研发历史。

## 路径一：GitHub Desktop（适合直接发布）

1. 下载 `chengwan-experiment-v2.5-git-repository.zip` 并解压。
2. 在 GitHub Desktop 选择 **File → Add local repository**。
3. 选择解压后的 `chengwan-experiment-v2.5` 文件夹。该层同时包含 `.git`、`package.json`、`netlify.toml`；不要选择 `public` 或外层下载目录。
4. 点击 **Add repository**，再点击 **Publish repository**。
5. 仓库名称可用 `chengwan-experiment-v2.5`；建议保持 **Keep this code private** 勾选，然后发布。
6. 需要给导师或协作者访问时，在远程仓库中单独授予访问权限，不必公开未冻结的实验材料。

仓库已经初始化并提交，不要重复创建或把 ZIP 当作单个源码文件上传。

## 路径二：从 Git bundle 恢复

将 `chengwan-experiment-v2.5.bundle` 放在终端当前目录，运行：

```bash
git clone --branch main chengwan-experiment-v2.5.bundle chengwan-experiment-v2.5
cd chengwan-experiment-v2.5
git log --oneline --decorate -2
git status
```

这样克隆出的 `origin` 指向本地 bundle，不是 GitHub。通过 GitHub Desktop 发布前，执行：

```bash
git remote remove origin
```

随后可按路径一将该目录添加到 Desktop 并发布。ZIP 内的仓库则本来就没有 origin。

## 命令行推送到你自行创建的空仓库

先创建一个你自己的空远程仓库，不要让远程自动初始化 README、许可证或 gitignore。
复制该仓库真实的 HTTPS 地址，再执行以下命令；必须替换示例地址：

```bash
git remote add origin https://github.com/YOUR_USERNAME/chengwan-experiment-v2.5.git
git push -u origin main
git push origin --tags
```

没有在本交付中创建这个示例 URL 对应的远程仓库。
不要把访问令牌写进 URL、源码或 Git 配置再提交。

## 本地校验

原包要求 Node.js >= 22.16.0；本次在 Node.js 22.16.0 下运行：

```bash
npm test
npm run build
```

本工程的上述测试和配置构建脚本使用 Node 内置模块，因此本次未安装外部依赖也完成了它们。
`npm run build` 会重新生成材料清单的时间戳，出现这两个生成文件的工作区变化属于原构建逻辑。
这不代表已经完成 Netlify Functions 的生产 SDK 打包。

如需使用 Netlify 本地开发命令，按原工程安装依赖后运行：

```bash
npm install
npm run dev
```

原 V2.5 没有 `package-lock.json`，两项生产依赖声明为 `latest`；本次没有擅自更改这些版本。
以后固定依赖需单独测试并提交锁文件，不应把本次 Git 导出称为完全锁定的依赖环境。

## Netlify 配置（保留原值）

```text
Build command: npm run build
Publish directory: public
Functions directory: netlify/functions
```

管理员令牌使用 Netlify 环境变量 `ADMIN_TOKEN`；仓库仅含占位 `.env.example`。
本次没有改动线上站点、数据库、配额或真实环境变量，也未进行真实 Netlify / PostgreSQL / 手机生产验收。
研究联系人、联系邮箱和伦理审批信息仍按原包为空，原校验会发出警告；正式招募前需按研究流程审核并重新冻结配置。

特别注意：原校验脚本明确检查 `PRETEST-W6`、`pretest` 等候选版设置。
切换正式波次不能仅替换一个数字，应同步更新相关冻结配置、验证规则及部署设置，并重新测试。

## 数据与安全

- `.gitignore` 排除了 `.env`、常见令牌/密钥文件、`node_modules`、本地数据库和常见受试者导出文件名。
- 仍需在每次提交前审阅实际变更；忽略规则不能取代完整的保密审查，也不会自动移除已经提交过的文件。
- 本次没有加入任何真实受试者答卷。参考目录里的 CSV 为变量字典、版本对照和空数据模板。
- 原包测试脚本含仅供本地合成测试使用的固定测试令牌；它不是生产管理员令牌。
- 未新增开源许可证，未改变原材料及依赖的权利状态。
- `repository_export/SOURCE_MANIFEST.json` 记录原 ZIP 的实际文件哈希；`FILE_MANIFEST.json` 更新为当前 Git 工作树文件清单。

## 检查范围

见 `repository_export/QA.md`。完整性检查与本地测试通过，不表示人类情绪操纵、伦理审批、生产安全或统计设计已经得到验证。

## 官方操作说明

- GitHub Desktop：Adding an existing project to GitHub using GitHub Desktop
  https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop
- Git bundle
  https://git-scm.com/docs/git-bundle
