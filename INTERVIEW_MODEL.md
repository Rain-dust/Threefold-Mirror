# Human Understanding / Bootstrap Interview v1

Phase 3 方法：**Map → Probe → Verify → Integrate → Model → Evolve**。先从生活建立 Human Map，再形成少量可校准判断，随后随时间修正。目标是可靠的初始理解，不是猜人格或制造惊艳。

## 审计与实现边界

Phase 2 已有单问待答、上一答关联、15 域 coverage、State/Pattern 的证据与时间边界、Prior 的低权威、Correction/Supersede，以及 Decision → Outcome → Reflection。原 Bootstrap 缺少广扫与深入的切换、降低抽象度和综合方法；原校准要求一次记录覆盖全部断言。

复用现有记录：Observation 是 epistemic_status，Hypothesis 也是 epistemic_status；Channel、Regression、变化阶段与张力均用 State/Pattern 表达，不新增实体、心理量表或命令。Human Map 是 Agent 的工作视图；15 域 coverage 是兼容的储存索引，不是用户问卷。

唯一新增可选字段是 Self Model 的 `calibration_focus`：预先选出最重要的 assertion/prior 引用。Calibration 可分次追加；累计实际反馈覆盖 focus 后初始化才完成。未选判断仍保留在模型并标明未校准。旧模型省略该字段时仍要求覆盖全部引用，既有记录无需迁移。详见 [数据契约](references/data-contract.md)。

代码负责证据、关联、追加和重建；Agent 负责语义选择、证据是否支持判断、用户负担与停止时机。不会通过关键词判断人格，也不会声称协议测试证明理解真人。

## 1. Human Map

以下镜头可重叠，也可长期 unknown；不是固定本体，更不是强制问完的象限。

| 镜头 | 注意什么 | 复用 coverage 域 |
| --- | --- | --- |
| Mind | 学习、矛盾、观点更新、判断与反思 | decision_style、knowledge_skills、values |
| Body | 睡眠、能量、运动、恢复、压力下的行为 | body_energy |
| Spirit | 关系、归属、连接、意义、重要的人 | relationships、values、identity |
| Vocation | 工作、学习、创造、项目、金钱、自主性 | work_vocation、current_goals、motivations |
| Resources / Constraints | 时间、环境、能力、资产、责任 | resources、constraints、knowledge_skills |
| Current Trajectory | 改善、恶化、探索、失去、进入新阶段 | current_situation、important_history、recurring_patterns、desired_future |

每个重要线索保留：生活描述、原始引用、时间、认识状态、证据类型/独立性、未知/矛盾。口述的行为仍是 self_report，不伪装成独立观察。拒答只说明边界；unknown 不是低分。

参考 [Dan Koe 的 HUMAN 3.0](https://thedankoe.com/letters/a-complete-knowledge-base-of-human-3-0/) 的多领域视角与实践区分；它是可替换的参考框架。三世镜不采用其等级、Metatype、Lifestyle Archetype、Glitch 评级或测试流程，也不把它当成心理诊断或已验证的人格分类。

## 2. 五阶段

| 阶段 | 任务 | 进入下一阶段的依据 |
| --- | --- | --- |
| Orientation | 从最近一周的实际生活开始；太大就缩到今天/昨天 | 有可回忆的生活入口，或明确知道用户想跳过什么 |
| Broad Human Scan | 以轻问题扩展地图；一答可覆盖多域 | 已看见显著盲区及其重要性，不让强话题代表整个人 |
| Adaptive Deep Dive | 深入高信号变化、模式、重要 self-report | 有实例、边界、反例，或诚实保留 unresolved |
| Cross-domain & Temporal Synthesis | 连结领域与时间，区分叙述、相关与因果假设 | 有限 v0.1 已有用，继续追问边际收益降低 |
| Calibration | 呈现少量高影响判断，逐个收取实际反馈 | 所选关键判断已有反馈；未知和未校准项继续保留 |

阶段是工作次序，不是固定题量或计时闸门。可以 Broad → Deep → Broad → Deep；发现重要盲区就回到广扫，综合中发现缺口可再验证。用户疲劳或要求暂停时立即停问，保留进度；没有可支撑的判断就保持 interview，不为完成初始化造一个结论。

## 3. Broad Scan 与 Deep Dive 的下一问

每答之后检查：重要性、变化、矛盾、决策相关性、跨域影响、信息增益、证据质量、覆盖盲区、假设不确定性、时间相关性、负担、参与意愿、重复程度。无需数值评分。

若一个强话题遮住可能改变理解的生活条件，先广扫；有具体高影响不确定性且广角已足够，才深入。深入后重新看地图，解释为何继续该主题或换域。明确拒谈的域不反复追问。不能把“最有趣”“最容易”或“信息量最大”单独作为选择规则。

认知负担逐步增加：**Concrete → Behavior → Pattern → Change → Meaning → Identity / Values**。上下文足够、用户愿意时允许深入意义和未来。难答时降级 **Abstract → Specific → Recent → Concrete Event → Choice Anchor**；一次只问一个，仍难就跳过。允许不知道、没想过、都不是、其他、跳过；问题失败不是用户失败。参见 [操作流程](workflows/bootstrap.md)。

## 4. Development Phase / Change State

先描述“什么正在变、何时开始、什么触发”，再考虑 Stable、Dissonance、Exploration/Uncertainty、Discovery、Integration 等暂定解释。稳定、旧方法失效、尝试新路、初见效果、持续整合可在不同领域同时存在，不能排成强制升级阶梯。缺少基线或持续证据时保留 unknown，不给整个人贴 Phase 标签。

用有期限的 State 记录当前变化，用 Pattern 提出可能机制与替代解释；词汇不代表诊断或发展等级。

## 5. Knowledge / Experience / Skill

| 区分 | 可支持的结论 | 不能推导的结论 |
| --- | --- | --- |
| Knowledge | 用户知道、理解或能解释的具体内容 | 已实践、稳定执行 |
| Experience | 用户实际经历/尝试了什么，何时、结果如何 | 已熟练或可重复成功 |
| Skill | 在所述条件下可重复完成的能力及失败边界 | 任何压力/情境下都能做到 |

按具体任务分别保存（如 `knowledge.delivery`、`experience.delivery`、`skill.delivery`），不是评分。知道理论、做过一次、稳定做到是不同证据主张。跨阶段升级需新证据与修订，不能因表述流利自动升级。缺口也可能是做过很多但无法解释，并非必然“懂多做少”。Future 的资源假设必须逐一检查这些差别。

## 6. Claim Verification 与证据质量

“我很自律/理性/开放”首先只是 self_report、unverified。重要、高影响、矛盾或将用于推演时，选择一个验证入口：最近实例、失败情境、持续时间、反例、实际行为/结果。没有实例就是 unresolved，不推导相反人格，也不逼用户自证。

为重要判断在 Markdown 中写简短证据说明：类型（自述/口述行为/历史例子/实际选择/Outcome/授权记录）、来源是否独立、跨时间/场景支持、反证与替代解释、什么会推翻判断。一次谈话的多个答案、同一事件的多份转述、用户对 AI 描述的复述都不能算独立支持。**Evidence quality > evidence count**；工程上的数量/时间最低限制不等于心理学有效性门槛。

Prior Self Knowledge 是 **high-information / low-authority**：用于找到缺口，保留 derived、原始出处和日期不明；不能做独立佐证。校准同意也是反馈，不是新的独立行为验证。

## 7. Channel 与 Regression

Channel：突然高投入只能先说明当前状态。按相关性逐一了解起点、触发、投入、过去类似经历、代价、对身体/关系/其他项目的影响、持续时间与后来是整合还是消退。不要求全部问完。用 temporary State；未知持续性不得改写成长期兴趣、价值或职业。

Regression：区分“没有证据会”和“曾能做到、现在某条件下无法使用”。找过去能力、当前失效、压力条件、恢复条件和反例；分别保留时间与来源，Pattern 记录条件性风险。压力下失效不是否定原能力；也不能无证据断言一定恢复。Past/Present/Future 都要考虑能力可用的条件。

## 8. Cross-domain reasoning

尝试连接有证据的 A → B → C，必要时是反馈循环。每条边区分用户的因果解释、时间上的共现、Agent 的机制假设；给出替代原因、断链条件。缺一环就显示未知，不为了画出漂亮循环补证据。

Current Core Tension 是能解释当前多个现象的局部、带条件的 hypothesis/inference，例如具体项目投入与已报告恢复需求的拉扯；不是人生唯一问题。不用任何人都能套的“自由 vs 稳定”替代证据。无充分依据时它可以是 unknown。

## 9. Temporal synthesis 与 Self Model v0.1

重要判断尽量回到 **Before → Trigger → Change → Current State → Possible Direction**。分开事件发生时间与记录时间；缺失的节点就是 unknown。Possible Direction 是条件性的待观察方向，不在未校准时进入 Decision/Future Simulation。

Self Model 的人类可读内容覆盖下列视角，缺证据的部分可合并在 Unknowns，绝不为标题填充断言：Present Reality、Current Trajectory、Known、Self-reports、Likely Patterns、Developmental Transition、Knowledge/Experience/Skill Gaps、Channels、Regression Risks、Cross-domain Dynamics、Core Tension、Unknowns、Contradictions、Working Hypotheses。Known 不把口述行为伪装成独立 fact。

结论要少、可追溯、有时间/条件、可推翻。底层保存全部当前 assertion_refs 以免隐藏反证；用户只逐步校准高影响结论。参见 [模板](templates/bootstrap-payloads.md)。

## 10. Calibration 与防止 Anchoring

早期可以在私有工作笔记形成候选假设；先问中立的生活实例。综合前不反复向用户输出人格解释，只有必要的、局部低风险事实澄清例外；也不能把未展示的理论埋进引导性问句。沉默、继续聊、复述 AI 措辞都不是同意或独立佐证。

综合后通常选 2–4 个高影响判断；证据只支持一个就只选一个，无判断就不凑数。一次展示/询问一个，邀请找错，不要求审核全部字段。允许 correct / partially_correct / wrong / outdated / not_sure 和自然语言。实际反馈即时追加；非 correct 先 Correction，使目标及相关 prior 依赖退出当前模型，再保存反馈和有证据的修订。not_sure 不当确认；未收到回答不能创建 Calibration。

First Mirror Moment 只在用户实际反馈支持时，作为私人产品效果观察。没有也可以成功完成 v0.1。禁止以制造 Mirror Hit 为选题目标，禁止 Barnum statements 与自证循环。

## 11. Stopping rule 与验证范围

综合考虑：广角是否避免显著盲区、主要 trajectory 是否已知或明确未知、是否有可靠生活事实和部分行为脉络、是否有值得校准的高影响判断、重要未知是否已记录、继续追问是否重复/收益低、用户是否疲劳。不是全部勾选才能结束；不足项进入模型边界。不得固定分钟数、总题数或各域配额。

短暂停问不等于 ready。有限模型可用时生成 v0.1 并进入 Calibration；若全部只有不知道/跳过，就保留未知与进度，不伪造有用判断。校准完成表示开始持续学习，不表示完整认识用户。

自动测试验证记录流转、约束与重建；虚构对话只能展示方法可执行，不能证明洞察正确、真实覆盖好或真人 Mirror Hit。跨 Runtime 的实际质量留给 [User Zero 实验](USER_ZERO_PROTOCOL.md)。本轮不采访真人、不读取私人来源。
