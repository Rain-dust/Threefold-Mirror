import type {
  Note,
  Evidence,
  Claim,
  Pattern,
  Future,
  SelfModel,
  Decision,
  Branch,
} from '../shared/schema.js';
import { hash, uid, now } from './vault.js';

const dimensions = [
  {
    key: 'mind',
    label: '心智与注意力',
    regex: /专注|分心|注意力|焦虑|压力|平静|思考|focus|anxious|stress/i,
  },
  {
    key: 'body',
    label: '身体与精力',
    regex: /睡眠|睡了|熬夜|精力|疲惫|运动|休息|身体|sleep|energy|tired/i,
  },
  {
    key: 'vocation',
    label: '事业与创造',
    regex: /项目|作品|工作|创造|发布|交付|开发|project|work|ship/i,
  },
  {
    key: 'relationships',
    label: '关系与意义',
    regex: /朋友|家人|伴侣|关系|意义|陪伴|独处|family|friend|meaning/i,
  },
  {
    key: 'knowledge',
    label: '知识与能力',
    regex: /学习|阅读|掌握|技能|练习|知识|learn|skill|read/i,
  },
  {
    key: 'resources',
    label: '资源与环境',
    regex: /储蓄|收入|预算|资产|资金|现金|时间安排|环境|存款|budget|saving/i,
  },
  {
    key: 'values',
    label: '价值与取舍',
    regex: /重视|价值|自由|长期|自主|在乎|优先|values|priority/i,
  },
  {
    key: 'habits',
    label: '习惯与倾向',
    regex: /总是|再次|习惯|每周|每天|反复|重复|坚持|always|habit/i,
  },
];

export function extractEvidence(notes: Note[]): Evidence[] {
  const result: Evidence[] = [];
  for (const n of notes) {
    if (n.date && n.date > now().slice(0, 10)) continue;
    let inCode = false;
    const lines = n.body.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/^\s*```/.test(line)) {
        inCode = !inCode;
        return;
      }
      const quote = line.replace(/^\s*[-*>]\s?/, '').trim();
      if (
        inCode ||
        quote.startsWith('#') ||
        quote.length < 6 ||
        quote.length > 1200 ||
        /^!\[/.test(quote)
      )
        return;
      if (
        !dimensions.some((d) => d.regex.test(quote)) &&
        !/决定|成功|失败|放弃|完成|目标|结果|变化|decision|outcome/i.test(quote)
      )
        return;
      result.push({
        id: 'ev-' + hash(n.path + ':' + (index + n.bodyLine) + ':' + n.hash).slice(0, 16),
        path: n.path,
        line: index + n.bodyLine,
        quote,
        hash: n.hash,
        date: n.date,
        observed_at: n.observed_at,
        title: n.title,
        kind: 'self_report',
      });
    });
  }
  return result;
}

const negative =
  /不足|下降|很低|偏低|疲惫|熬夜|分心|焦虑|压力很大|透支|中断|放弃|低落|减少|low|exhausted/i;
const positive = /充足|提升|上升|恢复|平静|专注|完成|发布|稳定|坚持|进展|high|improved/i;
function direction(text: string): Claim['trend'] {
  if (negative.test(text)) return 'falling';
  if (positive.test(text)) return 'rising';
  return 'unknown';
}
export function stateChanges(claims: Claim[], previous?: SelfModel | null) {
  if (!previous) return [];
  return claims
    .filter((c) => {
      const old = previous.claims.find((p) => p.id === c.id);
      return old?.value !== c.value || old.trend !== c.trend || old.confidence !== c.confidence;
    })
    .map(
      (c) =>
        `${c.label}：${c.value}（${{ rising: '出现积极线索', falling: '出现消耗线索', steady: '相对稳定', unknown: '趋势待确认' }[c.trend]}）`,
    );
}
export function buildOfflineModel(
  notes: Note[],
  fingerprint: string,
  previous?: SelfModel | null,
  warnings: string[] = [],
): SelfModel {
  const allEvidence = extractEvidence(notes);
  const claims: Claim[] = dimensions.map((d) => {
    const matches = allEvidence.filter((e) => d.regex.test(e.quote));
    const dated = matches.filter((e) => e.date && e.date <= now().slice(0, 10));
    const latest = dated.at(-1);
    const recent = latest
      ? dated
          .filter(
            (e) =>
              e.date >=
              new Date(Date.parse(latest.date) - 30 * 86400000).toISOString().slice(0, 10),
          )
          .slice(-4)
      : matches.slice(-3);
    const latestNote = latest ? dated.filter((e) => e.path === latest.path) : [];
    const isOld = !latest || Date.now() - Date.parse(latest.date) > 45 * 86400000;
    let value = latest
      ? latest.quote.slice(0, 36) + (latest.quote.length > 36 ? '…' : '')
      : matches.length
        ? '有记录，日期待确认'
        : '等待更多记录';
    let kind: Claim['kind'] = latest ? 'self_report' : 'inference';
    if (d.key === 'body' && latest) {
      const sleep = latestNote
        .flatMap((e) =>
          [
            ...e.quote.matchAll(
              /(?:睡眠|睡了|sleep)\s*(?:时长|约|平均|：|:)?\s*(\d+(?:\.\d+)?)\s*(?:小时|h)/gi,
            ),
          ].map((match) => ({ match, evidence: e })),
        )
        .at(-1);
      if (sleep) {
        value = `最近自述睡眠 ${sleep.match[1]} 小时`;
        if (!recent.some((e) => e.id === sleep.evidence.id)) recent.push(sleep.evidence);
        kind = 'self_report';
      }
    }
    return {
      id: d.key,
      dimension: d.key,
      label: d.label,
      value,
      detail: latest
        ? `最近记录于 ${latest.date}。${latest.quote}${isOld ? ' 这条记录已超过 45 天，不能代表今天的状态。' : ''}`
        : matches.length
          ? '记录没有可确认的日期，暂不判断当前状态和趋势。'
          : '目前没有足够的直接记录，保留为空，等待你的补充。',
      kind,
      confidence: !recent.length || isOld ? 'unknown' : 'low',
      trend: isOld ? 'unknown' : direction(latestNote.map((e) => e.quote).join(' ')),
      evidence: recent.map((e) => e.id),
    };
  });
  const patterns: Pattern[] = [];
  const themes = [
    {
      regex: /新项目|开始|启动|放弃|暂停|中断/,
      title: '开始与持续之间，可能存在落差',
      description:
        '多篇记录提到启动或中断。值得把项目开始时的投入与之后的持续条件放在一起回顾；这还不是稳定人格结论。',
      category: '行为线索',
    },
    {
      regex: /睡眠|熬夜|疲惫|精力|休息/,
      title: '身体状态，可能是行动的隐形边界',
      description:
        '身体与精力在不同时间反复出现。观察休息与创造进展的关系，尚不能从共同出现推断因果。',
      category: '身体线索',
    },
    {
      regex: /完成|发布|交付|反馈/,
      title: '把作品交出去，让现实参与判断',
      description: '多篇记录提到完成、发布或反馈。可以继续验证，小范围交付是否更适合你的工作节奏。',
      category: '创造线索',
    },
    {
      regex: /自由|长期|自主|重视|在乎/,
      title: '你愿意保留的东西，正在显现',
      description:
        '这些文字反复涉及取舍与价值。它们是待你确认的价值线索，尚不足以构成固定的人格画像。',
      category: '价值线索',
    },
  ];
  for (const theme of themes) {
    const matches = allEvidence.filter((e) => theme.regex.test(e.quote));
    if (new Set(matches.map((e) => e.path)).size < 2) continue;
    if (
      theme.category === '行为线索' &&
      (!matches.some((e) => /放弃|暂停|中断/.test(e.quote)) ||
        !matches.some((e) => /新项目|开始|启动/.test(e.quote)))
    )
      continue;
    patterns.push({
      id: 'pattern-' + patterns.length,
      title: theme.title,
      description: theme.description,
      kind: 'inference',
      confidence: 'low',
      evidence: matches.slice(-4).map((e) => e.id),
      category: theme.category,
    });
  }
  const body = claims.find((c) => c.id === 'body')!;
  const vocation = claims.find((c) => c.id === 'vocation')!;
  const lowEnergy = body.trend === 'falling';
  const tensions: string[] = [];
  if (lowEnergy && vocation.evidence.length)
    tensions.push('创造仍在占据你的注意力，身体记录却提示消耗。投入意愿与可用精力可能不一致。');
  if (!claims.find((c) => c.id === 'resources')!.evidence.length && vocation.evidence.length)
    tensions.push('已经有项目记录，但可用时间与资源仍不清楚。做更大承诺前需要补足这个边界。');
  const future: Future = {
    title: !allEvidence.length
      ? '未来，需要从一条真实记录开始'
      : lowEnergy
        ? '把持续创造，建立在可恢复的节奏上'
        : '让一个小小的完成，成为下一段轨迹',
    narrative: !allEvidence.length
      ? '目前没有足够证据描述你正在成为谁。先导入记录，或留下今天的状态。'
      : lowEnergy
        ? '如果当前消耗延续，更大的投入可能进一步挤压恢复时间；如果先降低并行任务，你可能更接近一种能够持续的创造方式。这是需要现实验证的条件推演。'
        : '如果记录中的创造与学习能够转化成定期的小交付，你可能积累更清晰的方向。但现有资料无法证明未来成果，也不能排除环境改变。',
    voice: !allEvidence.length
      ? '先告诉我今天真实发生了什么。我们从那里开始。'
      : lowEnergy
        ? '如果我是走过这段时间的你，我希望你先为精力留出余地。把下一步缩小到明天还愿意继续的程度。'
        : '如果我是之后的你，我希望你先完成一个可以被现实回应的小版本。保留调整方向的自由，也给积累一点时间。',
    assumptions: [
      '现有记录基本反映真实经历，但未被独立核验',
      '未来一段时间的环境没有重大变化',
      '尚未记录的信息可能改变判断',
    ],
    risks: lowEnergy
      ? ['投入增加可能挤压恢复时间', '过早承诺，降低之后调整的空间']
      : ['对投入与回报的估计可能偏乐观', '未记录的身体、资源或关系变化'],
    uncertainties: [
      '无法从有限文本估计成功概率',
      '记录的选择性与时间间隔',
      '你的行动会改变这条未来路径',
    ],
    evidence: [...new Set([...body.evidence, ...vocation.evidence])],
    confidence: 'low',
    kind: 'hypothesis',
  };
  const intervention = notes.filter((n) => n.frontmatter.type === 'intervention').at(-1);
  if (intervention) {
    const actionEvidence = allEvidence.filter((e) => e.path === intervention.path);
    future.assumptions.push(
      `最新行动计划仍待现实检验：${String(intervention.frontmatter.action || '').slice(0, 500)}`,
    );
    future.narrative +=
      ' 你已记录新的行动计划；若执行，它可能使此前的路径失效。应把接下来的真实结果与这次干预一起回顾。';
    future.evidence = [...new Set([...future.evidence, ...actionEvidence.map((e) => e.id)])];
  }
  const changes = stateChanges(claims, previous);
  const used = new Set([
    ...claims.flatMap((c) => c.evidence),
    ...patterns.flatMap((p) => p.evidence),
    ...future.evidence,
  ]);
  return {
    id: uid('model'),
    created_at: now(),
    source_hash: fingerprint,
    generated_by: 'offline-rules-v1',
    note_count: notes.length,
    evidence: allEvidence.filter((e) => used.has(e.id)),
    claims,
    patterns,
    future,
    tensions,
    changes,
    gaps: claims.filter((c) => c.confidence === 'unknown').map((c) => `${c.label}需要一条近期记录`),
    warnings: [
      ...warnings,
      ...(notes.some((n) => n.date > now().slice(0, 10))
        ? ['未来日期的记录未用于解释已发生的过去。']
        : []),
      '当前为离线规则分析：关键词提取与条件推演，不能理解完整语义；所有模式均为待确认线索。',
    ],
  };
}

export function simulateOffline(
  model: SelfModel,
  input: { title: string; context: string; options?: string[] },
): Decision {
  const options = input.options || ['全力投入', '保持小步试验', '暂缓，先恢复'];
  const depleted = model.claims.find((c) => c.id === 'body')?.trend === 'falling';
  const evidence = [
    ...new Set([
      ...model.patterns.flatMap((p) => p.evidence),
      ...model.claims.flatMap((c) => c.evidence),
    ]),
  ].slice(0, 12);
  const branches: Branch[] = options.map((label, index) => {
    const intensive = /全力|大量|辞职|all.in/i.test(label);
    const pause = /暂|暂停|放弃|停止|恢复/i.test(label);
    const tone = intensive ? '集中推进' : pause ? '保留空间' : '小步验证';
    return {
      id: `branch-${index + 1}`,
      label,
      allocation: intensive
        ? '情景假设 · 主要可用时间投入'
        : pause
          ? '情景假设 · 暂不增加投入'
          : '情景假设 · 设置有限投入窗口',
      horizons: [
        {
          months: 1,
          title: intensive ? '更快看到轮廓' : pause ? '重新看见优先级' : '得到第一份真实反馈',
          description: `如果选择「${label}」来面对「${input.title}」，${intensive ? '集中时间可能带来更快的初步进展' : pause ? '短期内可能腾出恢复与重新评估的空间' : '一个有边界的试验可能帮助验证最关键的假设'}。${depleted ? '最近的精力记录提示，应先确认可持续的投入上限。' : '实际进展仍取决于可用时间与外部反馈。'}`,
        },
        {
          months: 3,
          title: intensive
            ? '成果与消耗，一起显现'
            : pause
              ? '方向仍可重新选择'
              : '让证据决定下一步',
          description: `${intensive ? '如果初步反馈有效，可能形成较完整成果；如果消耗持续，推进可能中断' : pause ? '如果其他优先事项得到处理，可以重新评估；同时也可能失去部分机会窗口' : '如果试验持续，可能积累是否扩大投入的依据；也可能发现应该更换方向'}。${model.patterns.length ? '历史中的重复线索值得在每次回顾时重新核对。' : '缺少类似历史结果，不能判断哪种结局更可能。'}`,
        },
        {
          months: 12,
          title: '留给尚未发生的现实',
          description: `「${tone}」可能改变技能积累、资源分配与身份认同。但一年后的环境和你的价值取舍尚未知晓，此处保留多个可能结果，不提供单一路径或成功概率。`,
        },
      ],
      voice: intensive
        ? `如果你决定把主要时间交给「${label}」，我希望你也写清楚什么情况下要停下来。${depleted ? '请先认真对待最近的精力信号。' : '用真实反馈检验这份投入。'}`
        : pause
          ? '暂缓可以是一次主动选择。给它一个重新审视的日期，留意这是恢复空间，还是在回避一个仍然重要的问题。'
          : `为「${label}」写下一个最小行动与复盘日期。让实际发生的事，决定你是否继续加码。`,
      assumptions: [
        intensive
          ? '可以重新分配主要可用时间'
          : pause
            ? '暂缓不会带来不可逆损失'
            : '可以设计一个成本可控的小试验',
        input.context ? `用户补充：${input.context}` : '尚未提供具体期限、预算和不可妥协的边界',
        '记录中的状态未发生重大变化',
      ],
      variables: ['每周真实可用时间', '身体恢复与注意力', '外部反馈质量', '资源与机会成本'],
      risks: intensive
        ? ['恢复与其他事务被挤压', '高投入后更难退出']
        : pause
          ? ['机会窗口可能关闭', '暂缓可能延长为无期限搁置']
          : ['反馈样本可能太小', '投入分散，进展慢于预期'],
      uncertainties: [
        '不能推断成功概率',
        '未记录的限制可能改变分支',
        '看见预测后采取的行动会改变结果',
      ],
      evidence,
      confidence: 'low',
      kind: 'hypothesis',
    };
  });
  return {
    id: uid('decision'),
    title: input.title,
    context: input.context,
    created_at: now(),
    updated_at: now(),
    model_id: model.id,
    source_hash: model.source_hash,
    generated_by: 'offline-rules-v1',
    status: 'open',
    past: model.patterns.length
      ? model.patterns.map((p) => p.title).join('；') +
        '。这些是可参考的历史线索，尚未证明与你的决策相似或有因果关系。'
      : '没有足够的历史证据可以回顾类似选择；不会为你编造经历。',
    present:
      model.tensions[0] ||
      model.claims
        .filter((c) => c.evidence.length)
        .slice(0, 2)
        .map((c) => `${c.label}：${c.value}`)
        .join('；') ||
      '当前状态资料不足。请先记录可用时间、精力或资源边界。',
    evidence,
    evidence_snapshot: model.evidence.filter((e) => evidence.includes(e.id)),
    branches,
    intervention: null,
    outcome: null,
    reflection: null,
  };
}
