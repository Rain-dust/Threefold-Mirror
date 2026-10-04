# 三世镜 / Threefold Mirror

**三世镜是一套让 AI 随时间持续认识同一个人的 Agent Framework。**

**Threefold Mirror is an agent framework that learns a person over time.**

Understand who you were. Model who you are. Explore who you may become.

它维护的是关于同一个人的 **Model of You**。同一个 Mirror Agent 使用 Past、Present、Future 三个时间视角：理解过去的证据，维护当下可修正的模型，探索未来的条件分支。推理由调用它的 Agent 完成；这里提供 Schema、确定性 CLI、工作流和长期记忆协议。没有 UI、服务器、模型 Provider SDK 或三个独立人格。

**Conversation first. Data optional. Consent required.**

> 我不会先翻你的过去。
>
> 我会先认识现在的你。
>
> 如果你愿意，我们再一起回头看你留下的记录。

## 第一次使用

把 GitHub 项目链接交给自己的 Agent，让它安装项目、阅读 [Skill](skills/threefold-mirror/SKILL.md)，然后说：

> 启动三世镜。

Agent 先和你对话，每次只问一个当前有价值的问题，根据你的上一答决定下一问。它不会扫描磁盘、用户目录、笔记软件、聊天记录或云账户。

Phase 3 将认识方法写成了 [Human Understanding / Interview Model](INTERVIEW_MODEL.md)：从最近生活开始，先建立广角 Human Map，再按高信号区域深入验证，综合跨领域影响和时间变化，最后逐步校准少量关键判断。问题太难就降低抽象度，允许不知道、跳过；上下文充分后才深入模式、意义与价值。知道、做过、稳定做到分开记录，高强度 Channel 不自动变成长期人格，压力下的能力失效也保留时间与条件。

**没有 Obsidian、Notion、飞书、日记、聊天导出或旧 AI 总结，都能开始。** 访谈形成 Self Model v0.1，说明已知、证据、推断、置信度、矛盾和未知。你对关键判断反馈 Correct / Wrong / Partially correct / Outdated / Not sure；不确定或错误判断先进入 Correction。首次校准完成后才进入正常 Decision / Future。

外部资料完全可选。在访谈中出现值得补充的缺口时，你可以继续聊天、直接提供资料、导入以前 AI 的个人总结，或明确授权某一个有范围的数据来源。提到“我有 Obsidian”不等于授权读取。旧 AI 总结标为 **derived Prior Self Knowledge**，不当作原始事实，也不要求重新读取全部聊天。

## 本地运行

需要 Node.js 22.12+。安装依赖后，这些命令不发起网络请求：

```sh
npm ci
npm run mirror -- start
npm run mirror -- help
```

没有本地配置时，`start` 直接给出访谈开场和一个问题，不发现任何来源，也不写个人资料。持久化时，Agent 为你指定独立私人目录：

```text
npm run mirror -- init --instance <PRIVATE_ABSOLUTE_DIRECTORY_OUTSIDE_REPOSITORY>
```

`init` 建立私人目录和 Git 忽略的 `.threefold-mirror.local.json`，默认 `configured_sources: []`；不会把“目录已创建”当作“已完成初始化”。完成校准后状态才是 `ready`。所有命令可用 `--config` 指定一个 `.threefold-mirror.local.*` 文件。

Agent 通过 `ask` / `answer` 记录访谈，`append --file <private-draft.md>` 保存 State、Self Model、Correction 和 Calibration。草稿也保存在私人目录。`capture --statement "…"` 保存 Life Fragment，`import-prior --file <provided-summary> --label "以前 AI 的总结"` 保存旧模型。命令会校验结构、证据和关联；不能代替 Agent 判断用户是否真的说过这些话。

## Life Sources 与 Mirror Memory

```text
用户对话 / 主动提供的资料 / 明确授权的 Life Sources
                     ↓
               Evidence Retrieval
                     ↓
             一个 Mirror Agent
                     ↓
            可修正的 Self Model
                     ↓
          私人的 Mirror Memory
```

**Threefold Mirror = Mirror Core + Personal Instance。**

| Public Core：可开源 | Personal Instance：私人目录 |
| --- | --- |
| Core、Schemas、Skill、Workflows | Self Model、States、Patterns |
| Evidence / Interview 协议 | Decisions、Simulations、Outcomes |
| Adapters、Templates、Tests | Corrections、Life Fragments、导入的 Prior |
| 明确虚构的 Examples | Evidence 引用、用户配置、缓存 |

Life Sources 只读。Mirror Store 独立保存 `ThreefoldMirror/<类型>/<ID>.md`，不会假设模型写回原始笔记软件。只保留理解你需要的结构化记录和证据引用，不复制全部人生资料。外部引用由 `source_id + locator + hash + 原话/行号 + 时间范围` 组成。

第一个实现是 [Local Markdown Adapter](adapters/local-markdown.ts)，也可读取明确授权的 Obsidian 目录。Core 只接收 [EvidenceSource](core/sources.ts)，不知道来源是哪种软件。目前没有实现 Notion、飞书、Google Drive 等 API。

指定来源和授权范围后，用 `source-set --file <private-source-grant.json>` 保存授权，支持文件/文件夹白名单、排除路径、日期窗口、read/search 权限，write 固定为 false。`source-revoke --source <id>` 撤销；缩小范围可替换同 ID 的配置。见 [授权协议与示例](references/source-consent.md)。时间窗口只打开文件名带日期且在窗口内的 Markdown；无日期文件会跳过并报告，避免为了猜测日期而先读取内容。

Personal Instance 必须在 Public Core 之外且不在 Git 仓库中；与本地 Life Source 也不能互相包含。私人配置、缓存和常见私人目录被忽略，另有 `npm run privacy:audit` 检查明显泄露。详见 [Privacy Boundary](references/privacy.md)。Git 忽略不是对强制添加或旧提交的保密保证。

## 长期使用

- **Capture**：“三世镜，记一下……”——随手记录事件、状态、兴趣、阅读/观看内容、决策背景。一次阅读不会自动变成稳定价值观。
- **Check-in**：“三世镜，看看我最近状态。”——先读已有模型与授权证据，再追问少量真正缺失的信息。
- **Reflection**：“三世镜，复盘一下这件事。”——区分事件、选择、计划、实际结果和解释，按证据追加经验与状态修订。

Decision → Conditional Simulation → 用户选择 → Outcome → Reflection → 新模型 → 下一次 Decision 保持完整。没有发生的结果不能补写。Correction 先使旧判断退出当前模型，随后按证据追加修订；原记录始终保留。短期状态会复查、衰减和过期，不自动变成人格。源证据改变、删除、越出授权范围或撤销后，相关引用失效。

长期记录为 Markdown + YAML，`.mirror-cache/` 可删除重建。并发写入采用协作锁和原子发布；相同 ID/内容重试无重复，不同内容拒绝覆盖。没有向量数据库、账户系统或云存储。Agent 是否把内容发送给远程模型取决于其运行环境。

## 验证与阅读

```sh
npm run schema
npm run check
npm test
npm run golden
npm run privacy:audit
```

`golden` 运行原有 [Temporal Golden Path](examples/GOLDEN_PATH_REPORT.md)、[Bootstrap Golden Path](examples/BOOTSTRAP_GOLDEN_REPORT.md) 和 Phase 3 [Interview Golden Path](examples/INTERVIEW_GOLDEN_REPORT.md)。全部材料均虚构：Temporal 使用仓库内保留的旧版回归夹具，Bootstrap / Interview 使用仓库外临时实例；重复执行检查幂等，不会连接你的数据源。脚本验证协议和工作流，不能证明洞察正确或理解真人。跨 Agent Runtime 的真人实验按 [USER_ZERO_PROTOCOL](USER_ZERO_PROTOCOL.md) 另行开展，本轮尚未执行。

框架入口：[AGENTS.md](AGENTS.md) · [Skill](skills/threefold-mirror/SKILL.md) · [Bootstrap](workflows/bootstrap.md) · [低摩擦使用](workflows/life-fragments.md) · [Data Contract](references/data-contract.md) · [Evidence](references/evidence.md) · [Temporal Model](references/temporal-model.md) · [逐项验收](references/acceptance.md)。

旧版 `--vault` 不再用于生产 CLI。新用户用 `start`；已有 MVP 记录的迁移需显式选择私人目录并重建外部引用，不能自动移动原笔记或改写旧断言。旧的同目录布局仅保留在虚构回归夹具中。
