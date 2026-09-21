# 数据字典

## 一、样本流与版本字段

| 变量 | 含义 | 类型 |
|---|---|---|
| respondent_id | 后端生成的匿名 UUID | 文本 |
| wave_id | 数据收集波次 | 文本 |
| revision_id | 材料修订版本 | 文本 |
| base_material_id | 统一基础材料编号 | 文本 |
| material_id | 随机条件对应材料编号 | 文本 |
| condition_id | G1/G2/G3/G4 | 分类 |
| randomized | 是否成功随机化 | 0/1 |
| current_step | 当前或退出页面 | 文本 |
| started_at/randomized_at/completed_at | UTC ISO 时间 | 时间 |
| complete_questionnaire | 是否到达完成状态 | 0/1 |
| submitted | 是否完成最终提交 | 0/1 |
| exit_stage | 完成或退出阶段 | 文本 |
| duration_sec | 后端计算的总时长 | 秒 |

## 二、筛选字段

- consent：知情同意，0/1；
- age：年龄；
- chinese_reading：能否阅读简体中文，0/1；
- social_media_experience：是否具有基本社交媒体浏览经验，0/1；
- device：mobile/tablet/desktop。

## 三、技术字段

- stimulus_loaded_base：统一城市介绍是否成功展示；
- base_scroll_ok：是否滚动到基础材料底部；
- base_time_sec：基础材料页停留秒数；
- stimulus_loaded：评论材料是否成功展示；
- forced_view_ok：是否滚动到评论材料底部；
- stimulus_time_sec：评论材料页停留秒数。

## 四、核心变量

### 基线总体品牌形象

- brand_pre1：总体很差—总体很好；
- brand_pre2：很不吸引人—很吸引人；
- brand_pre3：我对澄湾的喜爱程度；很不喜欢—很喜欢。

至少 2 题有效后计算 `brand_image_pre`。

### 即时自我 PAD

- self_P；
- self_A；
- self_D。

均保留原始 1—7 分。宽表导出增加标准化变量 `(raw-4)/3`。

### 后测总体品牌形象

- brand_post1；
- brand_post2；
- brand_post3：我对澄湾的喜爱程度；很不喜欢—很喜欢。

至少 2 题有效后计算 `brand_image_post` 和 `overall_image_valid`。

### 访问意向

- visit1；
- visit2。

两题均有效后计算 `visit_intention`。

### 感知评论 PAD

- perceived_comment_P；
- perceived_comment_A；
- perceived_comment_D；
- emotion_label。

## 五、材料质量

- naturalness；
- platform_likelihood；
- readability；
- information_amount；
- specificity；
- city_context_natural。

均为 1—7 分。

## 六、理解和质量检查

- memory_check：多选，以 JSON 数组保存；
- new_risk_inferred：是否推断出事故、犯罪、灾害或服务故障；
- new_risk_text：开放说明；
- real_city_guess：现实城市误认；
- attention_check：指定选择“比较同意”；
- purpose_guess：研究目的猜测。

## 七、人口学

- gender；
- education；
- device。

## 八、事件日志

事件包括：

- page_view；
- page_submit；
- scroll_bottom；
- stimulus_loaded；
- visibility_hidden；
- visibility_visible；
- pagehide；
- experiment_complete。

每条事件均保存 page_id、客户端时间、服务器时间和 JSON payload。

## V1.1 新增事件

| event_type | page_id | payload | 说明 |
|---|---|---|---|
| `image_slide_view` | `base_intro` / `comments` | `slide_index` | 受试者首次滑动查看第 2 或第 3 张图片时记录；仅作为技术与材料浏览描述字段 |

界面版本由 `config/study.json` 中的 `ui_version=xhs-mobile-v1.1` 标记，并与 `revision_id=R2` 一同冻结。


## V1.7 操纵检查显示文本

- `perceived_comment_P`：评论区整体心情从“很不开心”到“很开心”。
- `perceived_comment_A`：评论区整体状态从“很平静／很松弛”到“很兴奋／很带劲”。
- `perceived_comment_D`：评论者对行程的控制感从“完全被安排推着走”到“完全能自己掌握”。

上述字段名、1—7取值范围和数据库类型不变。


## V1.8 题项措辞更新

- `self_A`：非常平静—非常兴奋；
- `self_D`：行程超出我的掌控—行程在我的掌控之中。

仅更新前端显示措辞，变量名和计分规则不变。
