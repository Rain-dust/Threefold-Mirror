# MVP acceptance

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
