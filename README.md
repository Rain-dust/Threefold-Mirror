# 三世镜 / Threefold Mirror

**三世镜是一套基于个人长期记忆运行的 Agent Framework。**
它试图理解你如何从过去成为现在，当前的你处于什么状态，以及不同选择可能把你带向怎样的未来，让这些理解参与现在的决策。

Obsidian 保存人生证据；同一个 **Mirror Agent** 通过过去、现在、未来三种时间视角工作。过去需要证据，现在是持续更新的 Self Model，未来是带假设的条件模拟。最终选择属于用户。

它不是 App、Dashboard、数字人、心理测量工具或人生预测服务。没有界面、Web 服务、模型账号管理或三个互相聊天的人格。

## 如何运行

```text
原始人生记录 → 检索证据 → 过去轨迹 → 当前 Self Model
                                      ↓
                    Decision → 多个条件未来 → 用户选择
                                      ↓
                          行动 → Outcome → Reflection
                                      ↓
                      新状态 + 新历史 → 下一次决策
```

推理由当前调用它的 Codex、Astra、Claude Code 或其他 Agent 完成。这里提供可移植的 Schema、Workflow、证据协议、模板，以及确定性的本地 CLI。**CLI 不会独立理解人生，也不会调用一个隐藏的 LLM。**

将整个仓库提供给 Agent，然后说：

> 阅读 `skills/threefold-mirror/SKILL.md`。我的 Vault 在 `D:\Notes\Life`。用 Decision Mirror 帮我分析“未来三个月是否主要投入这个项目”。已有笔记只读；将三世镜记录写入 `ThreefoldMirror/`。先检索证据，遇到缺口保留未知。

Skill 的引用以本仓库为根；请保留整个仓库，不要只复制单个 SKILL.md。无需安装 Obsidian 插件或更换用户目录结构。

## 本地运行与可复查示例

需要 Node.js 22.12+。依赖安装需联网；以下命令自身不会发起网络请求。

```sh
npm ci
npm run check
npm test
npm run golden
```

`golden` 使用 [虚构 Vault](examples/golden-vault)，**不是你的个人资料**。它执行完整闭环，再执行一次检查无重复记录，输出 [运行报告](examples/GOLDEN_PATH_REPORT.md)。示例的十月 Outcome 是明确模拟的未来资料。它验证数据闭环，不声称验证真实个人预测准确率或不同 Agent 的理解质量。

在 PowerShell 中查看示例：

```powershell
$vault = (Resolve-Path 'examples/golden-vault').Path
npm run mirror -- retrieve --vault "$vault" --query "项目 精力" --at 2026-09-29
npm run mirror -- model --vault "$vault" --at 2026-10-29
npm run mirror -- validate --vault "$vault"
npm run mirror -- history --vault "$vault"
npm run mirror -- rebuild --vault "$vault" --at 2026-10-29
```

真实 Vault 换成你的绝对路径。`retrieve` 返回原文候选与独立标记的推理记录；Agent 必须读上下文，不能把关键词命中当模式。可重复传 `--exclude Private` 限制本次检索；它不成为隐式全局配置。

Agent 先在工作目录准备 Markdown，再执行：

```sh
npm run mirror -- append --vault /absolute/vault --file /absolute/draft.md
```

`append` 只在 Vault 的 `ThreefoldMirror/` 写入。它校验引用、时序和关联后原子追加；同 ID 同内容重试不重复写入，同 ID 不同内容报错。事件发生时间与记录写入时间分开，新记录时间必须递增。原笔记不改写。

## 一个完整 Decision Mirror

虚构人物林舟问：“未来三个月是否主要投入三世镜？”

1. Mirror 找到 Atlas 暂停、Beacon 小范围交付和 Parser 持续维护。Atlas 同篇笔记提到搬家与照护；这些材料不能证明“技术难点消失就会放弃”。
2. 当时 Self Model：自述精力偏低，每周确认四小时，重视个人持续使用。每项保留来源、认识论状态、时间范围、置信度、复查日与有效期。
3. [D-001](examples/golden-vault/ThreefoldMirror/Decisions/D-001.md) 对应 [F-001](examples/golden-vault/ThreefoldMirror/Simulations/F-001.md) 的三个分支：主要投入、限时副项目、暂停。各有假设、原始证据、历史类比及差异、风险、机会、未知、1/3/12 个月变化与递增的不确定性。
4. 案例用户明确选择 B。选择和“看见模拟后删减功能”的干预分别记录，计划不当作完成。
5. 用户纠正关于 Atlas 的弱假设。[Correction](examples/golden-vault/ThreefoldMirror/Corrections/C-001.md) 立即使原判断退出当前模型；修订替代旧判断，历史仍可检查。
6. 四周后 [Outcome](examples/golden-vault/ThreefoldMirror/Outcomes/O-001.md) 报告两个闭环、精力恢复，同时工作交付期结束。[Reflection](examples/golden-vault/ThreefoldMirror/Reflections/R-001.md) 记录干预影响与替代解释，不给没有对照组的结果算“预测准确率”。
7. 新 State 直接引用 Outcome 原话。[D-002](examples/golden-vault/ThreefoldMirror/Decisions/D-002.md) 再问同题，[F-002](examples/golden-vault/ThreefoldMirror/Simulations/F-002.md) 基于新模型重新生成，使用刚发生的新历史。

## 数据归属与可纠错性

长期事实与推理都保存在人类可读的 **Markdown + YAML Frontmatter** 中：

```text
Vault/
  原有笔记……                         # 只读，格式不变
  ThreefoldMirror/
    Events/                           # 经历、用户选择、干预
    States/                           # 有时间尺度的状态修订
    Patterns/                         # 可证伪的模式与反例
    Decisions/                        # 问题、选项、限制与资源
    Simulations/                      # 某时间点的条件分支
    Outcomes/                         # 用户报告/可靠记录的结果
    Reflections/                      # 对比、替代解释、待验证经验
    Corrections/                      # 用户对旧判断的纠正
  .mirror-cache/index.json             # 派生数据，可删除重建
```

没有 `persona.md` 或永久 `future-me.md`。Self Model 是当前有效 State/Pattern 的投影；历史判断始终保留。短期状态必须过期，复查到期会降低有效置信度，不会自动升级为人格。新证据可以强化、削弱或替代旧判断。用户纠错先记录 Correction，再按需追加修订。

重要判断保留 wikilink、原话、文件 SHA-256、原始行号、来源时间范围和反证。源文改变时旧引用被标记失效，当前模型不再默默信任它。AI 总结不能成为原始证据；Reflection 的新经验必须重新连到实际 Outcome。校验能确认引用存在，**不能自动证明语义、因果或用户授权正确**，这些是 Mirror 的职责。

本项目的读写与索引在本地进行。实际运行 Agent 时，资料是否发送给远程模型取决于该 Agent 的运行环境；本框架不提供云存储，也不替运行环境承诺离线隐私。无需本框架之后，Markdown 仍能直接打开、检索和用 Git 版本控制。

## 框架入口

| 内容 | 入口 |
| --- | --- |
| Agent 路由与约束 | [AGENTS.md](AGENTS.md)、[Skill](skills/threefold-mirror/SKILL.md) |
| 过去、现在、条件未来 | [Past](workflows/past.md)、[Present](workflows/present.md)、[Future](workflows/future.md) |
| 决策闭环与纠错 | [Decision Mirror](workflows/decision-mirror.md)、[Reflection / Correction](workflows/reflection-correction.md) |
| 数据、证据、时间协议 | [Data Contract](references/data-contract.md)、[Evidence](references/evidence.md)、[Temporal Model](references/temporal-model.md) |
| 数据协议 | [JSON Schema](schemas/record.schema.json)、[字段说明](schemas/README.md)、[模板](templates/) |
| 确定性实现 | [core/](core/)、[CLI](scripts/mirror.ts)、[测试](tests/protocol.test.ts) |
| 验收与审计 | [验收表](references/acceptance.md)、[仓库审计](references/repository-audit.md) |

当前边界：本地单 Vault、协作式单写者协议、词语检索候选、不做向量检索或预测校准数学。Node 是参考实现的运行时，不是数据格式依赖。JSON Schema 表达字段结构，跨记录约束由协议和校验器补充。未知 schema_version 拒绝写入；未来升级需显式迁移，不能批量改用户原笔记。
