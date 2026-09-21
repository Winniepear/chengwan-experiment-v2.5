# Q11接入字段与计分

完整29题的编号、原文、类型、选项与必答条件见 `DATA_FIELDS_Q11.csv`；可复制原文见 `reference/06_29项问卷纯文本.txt`。本文件只说明工程语义，不能替代研究预注册。

## 原始字段，共29项

| 页面 | 字段 | 规则 |
|---|---|---|
| consent | consent, age, eligibility_basic | 同意且成年且合并资格符合才进入；拒绝参加不强迫填其他答案 |
| planning | planning_1, planning_2, planning_3 | 各1—7，在所有城市材料之前 |
| baseline | brand_pre1—3, self_P_pre, self_A_pre, self_D_pre | 品牌≥2/3，自身3/3；共同帖子之后、评论之前 |
| self_pad_post | self_P_post, self_A_post, self_D_post | 各1—7，匹配前测措辞 |
| outcomes | brand_post1—3, visit1, visit2 | 品牌≥2/3、访问2/2 |
| perceived | perceived_comment_P/A/D | 各1—7，只评价评论者 |
| final_checks | emotion_label, naturalness, information_amount, new_risk_inferred, attention_check, gender | 类别存选项原文；风险0/1；注意题1—7，不按答对与否阻止提交 |

前端不显示未施测旧题，后端不接受将这些字段偷偷加入当前页面。资格合并后 `chinese_reading` / `social_media_experience` 不虚构回填，尤其eligibility_basic=0不意味着两项都为0。

## 版本/流程字段（不计入29项）

会话创建时：participants写respondent_id、revision_id=R11、wave_id=PRETEST-W4、base_material_id；responses的__system页写questionnaire_revision_id=Q11、UI/部署版本、post_material_id、stimulus_text_source_revision=R10、survey_item_count=29。

随机化：condition_id、material_id、randomized、randomized_at、当前步骤。events记录候选未满额组、分配前计数与配额，只供后台审计，不改变分组概率。

展示：城市文字加载/滚动/时间；帖子文字、图片、滚动/时间；评论文字与头像各自加载、评论滚动/时间。stimulus_loaded仍是跨页组合图片标记，不是评论是否理解。

提交：complete_questionnaire、submitted、duration_sec和时间字段。核心结果保存与最终提交是两回事，不能只因未提交末页就自动删掉已经保存的结果。

## 派生计算

- planning_mean：三题均为有效整数1—7才算均值；planning_complete只表示三题完整。原规划得分不中心化、不按条件归一化、不自动二分。
- brand_image_pre/post：对应3题至少2题有效才算均值。
- visit_intention：visit1/visit2均有效才算均值。
- self_X_delta：规范post减pre；任意一项缺失则NULL。
- self_X_pre_std / post_std：(raw-4)/3；self_X_delta_std=delta/3，范围[-2,2]不截断。
- self_X_pair_valid：配对完整性；不表示“变化方向正确”。
- self_X_alias_conflict：规范post与旧alias同时存在才判断是否冲突；不覆盖原值。
- attention_pass：Q11数值6为1，其余有效1—7为0；没有答案为NULL。
- attention_administered：只在已有注意题答案时为1，否则NULL；不将创建会话视为已经作答。
- memory_administered：Q11为0；memory_correct为NULL，而不是失败。历史记录按原实际答案保留并计算，不用Q11规则抹去旧数据。

self_D沿用预期行程掌控感，不是一般人格控制或支配他人。PAD三维不合成总分。

## 未施测及历史兼容

Q11未施测：comment_feeling_open、platform_likelihood、readability、specificity、city_context_natural、memory_check、new_risk_text、real_city_guess、purpose_guess、education。宽表可能保留这些历史列，但Q11行为空。旧记录缺规划/前测，不补中点或后测。

历史版本元数据只读实际记录；未保存的问卷或部署版本不以当前配置猜测回填。没有前测的旧self值仍是其原后测字段，不制造规范post或变化值。

宽表是数据库历史列的并集，列数多于29是正常的；29只指Q11受试者需要作答的原始变量。

## 导出范围与分析

后台默认当前波次/版本，也能取消筛选查看历史；直接API可用 `?scope=current`，不传则全部历史。统计默认当前轮。不要直接合并不同revision和questionnaire的原值。

主要规划调节分析仍在独立统计软件中完成。应按批准的分析集计算中心化分数，再检验C(condition_id)*planning_c；后台只导出原值和均分，不提供自动显著性、人格标签或结果驱动删样本。
