# Chengwan Netlify Full-stack V2.5 — R13/Q13

当前部署候选：**PRETEST-W6 / R13 / Q13**。

## 核心原则
- 29个参与者作答字段完整保留；题号、顺序、变量名、必答规则和计分规则沿用R11结构。
- G1/G3/G4按最新预测试结果定点重写；G2基本冻结，仅调整emoji语境和位置。
- 评论前增加统一阅读提示，提醒同时关注评论中的事实信息与评论者的感受/状态；提示不计为题项。
- A题仍为 `self_A_pre/post`、`perceived_comment_A`，只是端点加入更详细的低/高激活描述。
- Q24 `emotion_label` 更新为记录 / 松弛 / 兴奋期待 / 紧张警觉四类锚点。
- `stimulus_text_source_revision` 已修复为当前版本 `R13`，不再硬编码R10。

## 本轮材料策略
- G1：路线记录、课代表总结、交通笔记、攻略整理等信息型元话语。
- G3：真的很期待、好兴奋、迫不及待、马上继续等趋近型高激活线索。
- G4：反复确认、一直看时间、持续警觉、注意力占用、很难放松等高激活线索。
- Emoji：每组均有3条评论出现副语言符号；emoji嵌入表达最强的句子，而不是统一放在句末。

## 启动
Netlify：
- Build command: `npm run build`
- Publish directory: `public`
- Functions directory: `netlify/functions`

至少配置：
- `ADMIN_TOKEN`

## 当前阶段
默认 `mode=pretest`、`quota_per_condition=40`，用于R13独立预测试。正式实验目标计划为随机化 **N=312（78/组）**，但应在R13预测试通过后再切换正式波次。

## 发布前必须补全
当前配置未提供真实 `researcher_contact`、`contact_email`、`ethics_approval`，validate会给出release warning。正式招募前必须填写并核对。

## QA
`node scripts/validate.mjs` 与 `node --test tests/*.test.mjs` 均应通过。V2.5当前本地测试为32/32通过。
