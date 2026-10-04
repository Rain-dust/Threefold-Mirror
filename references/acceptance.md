# v0.3.0 · User Zero Baseline

复验日期：2026-10-04。本次只审计、固化既有 Phase 1 / 2 / 3 成果，没有改动核心认识方法、Schema 或运行时代码，没有进行真人实验。**User Zero 仍为尚未运行；工程通过不等于真人效果已验证。**

- 工作区原有 30 项 tracked changes 与 27 个 untracked 文件均属于现有框架、协议、模板、虚构夹具、测试或生成 Schema；均纳入 checkpoint。没有发现需要删除的临时文件。
- 审阅提交候选内容，未发现私人记忆、真实个人数据、私人绝对路径或密钥；唯一被忽略的现有目录为 node_modules。既有 .gitignore 规则经 git check-ignore 验证，公共代码与私人 Memory 路径隔离保持有效。隐私检查是启发式，不是完整 DLP 或 Git 历史证明。
- package.json 与 package-lock.json 的版本均为 0.3.0。Node.js 24.14.0；按 lockfile 重新安装成功。默认 npm 注册表连接超时、离线缓存不足；本次用一次性 `npm ci --registry=https://registry.npmmirror.com --no-audit --no-fund` 完成，未改动依赖版本、锁文件或持久 npm 配置。
- `npm run schema` 通过，两份生成 Schema 与运行前逐字节一致；`npm run check` 通过；`npm test` 39/39 通过，无失败或跳过。
- `npm run golden` 三套通过：Temporal 16 个记录，Bootstrap 三场景 15 / 9 / 3 个记录，Interview 38 个记录。各脚本均完整重跑检查幂等，未产生重复；Markdown 重建一致、虚构来源未改变。运行前后仓库文件哈希一致。
- `npm run privacy:audit` 零发现；补充密钥/私人路径检查零发现，文档相对链接无缺失；`git diff --check` 通过。`mirror -- help` 与无配置 `mirror -- start` 通过，启动不生成配置或个人记录。

提交后的协议复核仅补齐 CLI 与 Agent 的分工、私人观察笔记位置、体验片段、错误/不同意区分与结束复盘；没有改变采访方法或增加产品需求。11 项观察重点均可通过实际对话、证据、校准/纠错和私人评价观察，未预设成功结果。

以下 Phase 1 / 2 / 3 验收保留其原有边界。真人观察与复盘依据 [USER_ZERO_PROTOCOL](../USER_ZERO_PROTOCOL.md)，不预填任何用户反馈或 Mirror Hit。

## Phase 3 · Human Understanding / Bootstrap Interview v1 验收

本轮先审计既有 Bootstrap、Self Model、Skill、Workflow 和 Schema，写出 [INTERVIEW_MODEL](../INTERVIEW_MODEL.md)，再实施 [Skill](../skills/threefold-mirror/SKILL.md)、[操作流程](../workflows/bootstrap.md)、模板、渐进校准与虚构测试。没有正式采访真人，也没有读取私人来源。

| 最终验收问题 | 方法与落地位置 | 能证明的边界 |
| --- | --- | --- |
| 先建 Human Map，而非早猜人格？ | 生活开场、五阶段次序、早期中立问题；假设到综合后才展示 | Skill/Workflow 明确约束，虚构演练遵循；不是所有 Agent 的行为保证 |
| Broad Scan 防止单话题 tunnel vision？ | 六个重叠镜头、拒谈可 unknown、每次深入后复查盲区 | Golden 演示项目→身体/约束/关系/学习，且 Deep→Broad→Deep；不是固定配额 |
| 按高信号进入 Deep Dive？ | 不确定性、重要性、变化、矛盾、决策相关性、跨域影响，兼顾负担/重复 | Agent 选问方法与 reason 记录；代码不做关键词心理评分 |
| 区分 Knowledge / Experience / Skill？ | 独立 scoped State，模型摘要和 Future 条件逐项区别 | 虚构知道理论/演示一次，稳定交付仍 unknown；代码不自动提升 |
| 理解变化阶段？ | 局部、可修正的变化 State，Before→Trigger→Change→Current | 演示 exploration/first trial 假设，无等级、Metatype 或强制阶梯 |
| Channel 与 Stable Trait 分开？ | 临时状态、起点/代价/历史结局的相关追问，保留期限 | 测试临时假设不可改成 inferred stable、重复同期证据不满足长期条件、到期不升级 |
| 能记录 Regression 风险？ | 原有能力、压力、当前不可用、恢复条件；Pattern 保留替代解释 | Golden 保存并在用户 unsure 后撤回，历史仍在；不证明因果 |
| 重要 Self-report 会验证？ | 最近实例/失败/持续/反例；无法回答保留 unverified/unresolved | 自述执行力未获实例也不推断相反人格 |
| Cross-domain Dynamics、时间变化与 Core Tension？ | 每条影响区分共现/解释/假设；时间节点未知留空；张力需证据和可推翻性 | 普通 State/Pattern 已表达，未新增心理实体；综合准确性尚需真人验证 |
| 允许大量 Unknown，不编造完整模型？ | coverage 是索引，未知标题合并，不强制填充；无有用判断可暂停 interview | 多数未知、全部未知回答、不同 focus 数量均能保留；无反馈仍禁止 Decision/Future |
| 不早出人格结论、避免 Anchoring？ | 中立验证、不把理论塞进问句、不把 AI 复述当独立佐证 | Workflow 和独立虚构演练检查；自动测试不能证明语言永不诱导 |
| First Mirror Moment 是结果而非优化目标？ | 只有实际效果反馈可记录；没有也能完成有限模型 | Golden 明示未观察；不伪造真人命中 |
| 早期减轻负担，后来允许深入？ | Concrete→Behavior→Pattern→Change→Meaning/Values；难答缩到近期事件/选择锚点 | 虚构从难答缩到今天/昨天，后期进入具体意义；没有永久浅问限制 |
| 支持不知道、难答、都不是、其他、跳过？ | 实际原话保存为答案，尊重拒谈和暂停；沉默不能冒充回答 | 协议测试待答解除/继续，全部无信息不会制造模型；不在换措辞后强迫追问 |
| 校准是否 progressive？ | 可选 calibration_focus，分次保存反馈；Correction 优先；旧格式仍要求全部引用 | 测试中断重载、非focus不能解锁、旧模型反馈不转移、新模型再校准、未选项不自动确认 |
| Prior 和 Phase 1/2 是否保持？ | derived、高信息低权威、不可当原始证据；Source 只读、明确范围、纠错/时间闭环 | 全部既有测试与两套 Golden 保留通过，新增第3套；无新Adapter、SDK、UI或大CLI |
| 方法是否进入可移植 Skill/Workflow？ | 入口直达方法、逐轮决策、具体降级、停止/校准/恢复规则，模板与 CLI 互相链接 | 独立 Agent 按3个虚构情境执行；发现并修复无实例暂存及纠错顺序歧义 |

执行结果：`npm run schema`、`npm run check`、`npm test`（39项）、`npm run golden`（Temporal / Bootstrap / Interview，全部重复验证幂等）、`npm run privacy:audit`（零发现）。Phase 3 Golden 保存38个虚构记录，其中9个判断在关键反馈完成后仍未校准；两条被质疑判断已退出当前投影。见 [生成报告](../examples/INTERVIEW_GOLDEN_REPORT.md) 与 [测试](../tests/interview.test.ts)。

如果换成能力弱于 Codex 的 Agent：**方法层面比 Phase 2 更接近“是”**。它已有明确的下一步依据、低负担例子、真假/时间边界、降级/换域/停止和纠错流程，不必临场发明采访方法。但实际语义理解质量还未经跨 Runtime 真人测试，不能承诺所有 Agent 都理解正确。[USER_ZERO_PROTOCOL](../USER_ZERO_PROTOCOL.md) 已准备，状态为未运行。

## 保留的第二轮架构收敛验收（历史结果）

下列为 Phase 2 当时的验收记录；本轮校准语义的变化以上文及现行数据契约为准。

验证基于实际执行的 [Bootstrap Golden Path](../examples/BOOTSTRAP_GOLDEN_REPORT.md)、[原 Temporal Golden Path](../examples/GOLDEN_PATH_REPORT.md)、[新增边界测试](../tests/bootstrap.test.ts) 和 [原协议测试](../tests/protocol.test.ts)。全部使用虚构数据，没有扫描或读取真实个人来源。

| 最终验收问题 | 结果与依据 |
| --- | --- |
| 陌生用户把项目交给 Agent，是否先访谈、不扫盘？ | 是。Skill 路由到 start；无配置时直接进入 interview。启动测试验证零 Source 调用，已配置但不存在的来源也不影响开场。 |
| 没有 Obsidian / Notion / 飞书能否完整开始？ | 是。Scenario A 只通过对话完成 v0.1、校准、Past/Present/Decision。 |
| 外部数据是否完全 optional？ | 是。初始 configured_sources 为空；A 明确拒绝外部资料仍完成初始化。 |
| 是否只有用户明确授权后读取指定 Source？ | 是。协议要求实际用户授权，运行时检查 grant；无授权、撤销、无 read/search 能力都会拒绝。程序不能认证用户意图，Agent 不得伪造授权。 |
| 授权是否有明确 Scope？ | 是。文件/文件夹白名单、排除项、日期窗、只读权限；越界、Windows 大小写变体、符号链接被测试。 |
| Core 是否不知道底层是哪种软件？ | 是。EvidenceSource 接收 opaque locator；测试用不含文件路径的来源完成 State 写入、强化、长期 Observation 和引用失效。 |
| Obsidian 是否只是 Adapter？ | 是。Local Markdown Adapter 可读授权的 Obsidian 目录；Core 不包含其路径/API 逻辑。 |
| 个人数据是否与 Public Core 物理隔离？ | 是。生产路径拒绝 repo 内/包含 repo、其他 Git 仓库及链接路径；Source/Store 不得重叠。本地配置被 Git 忽略。 |
| 能否直接导入以前 AI 的个人总结？ | 是。import-prior 只读用户指定文件，不要求原始聊天；Scenario B 验证缺口访谈。 |
| Prior 是否不会被误认为 Raw Fact？ | 是。derived 类型，不能作为 primary evidence；其依赖只能是临时、低置信度 inference/hypothesis。 |
| Self Model v0.1 是否经过校准？ | 是。所有已评审断言/prior 都需要实际反馈；非 correct 先追加 Correction。未完成时不能进入 Decision/Future。 |
| 用户以后是否可以继续纠正？ | 是。Correction / supersedes 保留；更正 prior 会使依赖断言退出当前模型。 |
| 没有日记习惯能否通过 Life Fragments 积累？ | 是。capture 保存实际话语，支持事件、兴趣、消费内容、状态和决策背景；不自动生成人格。未知发生时间仍未知。 |
| 原 Evidence / Correction / Supersede / Decision / Outcome / Future 是否正常？ | 是。保留的 20 项协议测试与 16-record Golden Path 通过；原来源字节不变、并发/幂等/缓存重建继续验证。 |
| 不用 Obsidian，三世镜还是三世镜吗？ | **是。开源的是 AI 如何逐渐认识一个人。** |

运行结果：npm run schema、npm run check、npm test（32 项）、npm run golden（两套，均重复执行验证幂等）、npm run privacy:audit（零发现），以及 Skill quick_validate。Bootstrap 三条场景分别持久化 15 / 9 / 3 个虚构记录，校准状态完全从 Markdown 重建。

边界：访谈的语义选择由调用 Agent 完成，Golden Path 是预先编写的虚构对话，不是自然语言智能评测。Local Markdown 日期授权要求文件名带日期；无日期文件跳过并报告。隐私审计是轻量启发式，不检查 Git 历史，也不能识别所有个人语句。未添加 UI、第三方云集成、Provider SDK、OAuth 或预测模型。

## 保留的第一阶段验收

The executable evidence is [Golden Path report](../examples/GOLDEN_PATH_REPORT.md), [protocol tests](../tests/protocol.test.ts) and [the resulting Vault](../examples/golden-vault/). This run uses high-quality fictional life notes actually present on disk. No real personal vault, real user choice or real later outcome was claimed or fabricated.

| Acceptance question | Answer and evidence |
| --- | --- |
| Past 是否来自人生证据？ | 是，从磁盘原始记录检索并引用；本次是明确虚构的人生案例，尚未做真实个人 Vault 验证。Atlas/Beacon/Parser 提供不同轨迹与反例。 |
| Present 是否随时间更新？ | 是，S-energy-1 → S-energy-2，由低精力更新为正在恢复，引用实际存储的 O-001。 |
| Future 是否由当前状态动态生成？ | 是，F-001/F-002 保存不同模型指纹、当前 refs 与条件分支。语义推理由 Agent 提供；CLI 校验输入的一致性。 |
| Future 是否是条件模拟？ | 是，mode 固定 conditional、认识论状态为 hypothesis，假设/未知/不确定性必填；不是预言。 |
| 同题不同状态能否产生不同未来？ | 是，D-001 与 D-002 同题，F-002 纳入恢复中的精力和新 Outcome；测试断言分支不同。 |
| 五种认识论状态是否区分？ | 是，fact/self_report/observation/inference/hypothesis 独立枚举，证据协议规定含义；语义分类仍需 Agent 审查。 |
| 重要判断能否追溯 Evidence？ | 是，原话、路径、行号、哈希、时间范围、反证；AI 总结不能作为原始引用。自动校验不等同于语义证明。 |
| 短期状态是否避免污染人格？ | 是，时间尺度、有效期、复查衰减、长期证据最低门槛；没有自动升级路径。 |
| 用户能否纠正？ | 是，C-001 立即使目标退出当前模型；记录真实用户纠正是 Agent 的责任。 |
| 历史判断能否 supersede 而不消失？ | 是，P-novelty-1 保留，P-novelty-2 明确替代并链接 Correction。 |
| Decision 能否连接真实 Outcome？ | 协议支持并校验 Decision→choice→simulation→Outcome 的完整关联；本次执行使用模拟四周后的 O-001，不冒充真实结果。 |
| Outcome 是否改变 Self Model？ | 是，R-001 提出更新，State 修订直接引用 O-001，而不是引用 Reflection 的总结。 |
| 下一次 Agent 能否使用新历史？ | 是，第二次检索命中新 Outcome，F-002 直接引用它；Reflection 仅作为推理上下文。 |
| 没有 UI 是否完整运行？ | 是，CLI、Agent Skill 与 Markdown 完成整个闭环，未启动服务器或浏览器。 |

额外验收：源笔记字节不变；空历史明确不足；引用被改/删除会失效；纠错中断也不会恢复旧误判；记录不可覆盖；重复运行无重复；缓存可删除重建；并发写入成功或明确失败，不发布半个记录。

尚未声称完成：自然语言推理质量的跨模型评测、真实用户长期效用、因果识别、统计校准、超大 Vault 的检索召回率。MVP 验证的是一个可追溯、可纠错、能把新现实送回推理的数据闭环。
