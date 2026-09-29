import { useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Circle,
  Compass,
  Feather,
  FileText,
  FolderOpen,
  GitBranch,
  Info,
  Layers3,
  Loader2,
  Minus,
  Orbit,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from 'lucide-react';
import { type AppState, type Claim, type SelfModel } from '../shared/schema';
import { type Page, CONF, date, fullDate } from './data';
import { Pill, EvidenceButton, SectionTitle, Empty, MirrorScene } from './ui';

export function Onboarding({
  onDemo,
  onConnect,
  busy,
}: {
  onDemo: () => void;
  onConnect: () => void;
  busy: boolean;
}) {
  return (
    <div className="onboarding page-enter">
      <div className="page-heading">
        <span className="eyebrow">A LIFE, IN BECOMING</span>
        <h1>看见来路，也看见可能。</h1>
        <p>
          过去的你提供依据，未来的你带来视角。
          <br className="mobile-break" />
          现在的你，决定这一切。
        </p>
      </div>
      <MirrorScene empty onSelect={onConnect} />
      <div className="onboard-start">
        <span className="eyebrow">从一条真实的记忆开始</span>
        <h2>
          人生不是一段简介。
          <br />
          而是一条仍在生长的轨迹。
        </h2>
        <p>
          连接 Obsidian，让过去的记录成为今天的依据。
          <br />
          所有长期记忆，始终以可读的 Markdown 保留在你的电脑上。
        </p>
        <div>
          <button className="primary" onClick={onConnect}>
            <FolderOpen size={16} />
            连接我的 Obsidian
            <ArrowUpRight size={16} />
          </button>
          <button className="secondary" disabled={busy} onClick={onDemo}>
            {busy ? <Loader2 className="spin" size={16} /> : <Orbit size={16} />}先体验示例人生
          </button>
        </div>
        <small>
          <ShieldCheck size={13} />
          无需账号 · 无需密钥即可体验 · 原始笔记不会被修改
        </small>
      </div>
    </div>
  );
}

export function MirrorHome({
  model,
  state,
  go,
  onEvidence,
  onCheckin,
  newDecision,
  onDecision,
  busy,
  onRebuild,
}: {
  model: SelfModel;
  state: AppState;
  go: (p: Page) => void;
  onEvidence: (ids: string[]) => void;
  onCheckin: () => void;
  newDecision: () => void;
  onDecision: (id: string) => void;
  busy: boolean;
  onRebuild: () => void;
}) {
  const latestDecision = state.decisions[0];
  const cards = [
    model.claims.find((c) => c.id === 'mind')!,
    model.claims.find((c) => c.id === 'body')!,
    model.claims.find((c) => c.id === 'vocation')!,
  ];
  return (
    <div className="page-enter">
      <div className="page-heading with-action">
        <div>
          <span className="eyebrow">THE PRESENT SHAPES WHAT COMES NEXT</span>
          <h1>在此刻，照见自己。</h1>
          <p>你走过的路，和你正在走向的未来，在这里相遇。</p>
        </div>
        <button className="primary" onClick={onCheckin}>
          <Plus size={17} />
          记录此刻
        </button>
      </div>
      <MirrorScene onSelect={go} />
      <div className="model-status">
        <span>
          <span className="live-dot" />
          {model.note_count} 篇记录已映入三世镜<span className="dot-separator">·</span>
          {model.generated_by === 'offline-rules-v1'
            ? '离线规则分析'
            : model.generated_by.replace('compatible:', '')}
        </span>
        <button disabled={busy} onClick={onRebuild}>
          <RefreshCw size={12} className={busy ? 'spin' : ''} />
          {busy ? '正在更新' : '重新映照'}
          <span>{date(model.created_at)}</span>
        </button>
      </div>
      <section className="home-state">
        <SectionTitle
          eyebrow="HERE & NOW"
          title="此刻的你，正在发生什么"
          right={
            <button className="text-button" onClick={() => go('present')}>
              完整状态
              <ArrowRight size={14} />
            </button>
          }
        />
        <div className="state-preview-grid">
          {cards.map((c, i) => (
            <StateCard key={c.id} claim={c} index={i} onEvidence={onEvidence} compact />
          ))}
        </div>
      </section>
      <div className="home-bottom">
        <section className="future-letter">
          <div className="letter-top">
            <span>
              <Sparkles size={16} />
              来自一种可能的未来
            </span>
            <Pill kind="hypothesis" />
          </div>
          <span className="quote-mark">“</span>
          <h2>{model.future.title}</h2>
          <p>{model.future.voice}</p>
          <div className="letter-bottom">
            <EvidenceButton ids={model.future.evidence} onOpen={onEvidence} />
            <button className="text-button" onClick={() => go('future')}>
              听见未来的回声
              <ArrowUpRight size={14} />
            </button>
          </div>
        </section>
        <section className="next-decision">
          <span className="eyebrow">THE NEXT TURN</span>
          <div className="decision-mini-icon">
            <GitBranch size={24} strokeWidth={1.3} />
          </div>
          <h2>{latestDecision ? latestDecision.title : '每一个选择，\n都让未来重新分岔。'}</h2>
          <p>
            {latestDecision
              ? {
                  open: '分支已生成。选择一个方向，把推演带回现实。',
                  acting: '你已经开始行动。真实结果将成为下一次的依据。',
                  reflected: '这次选择已经完成复盘，成为新一段历史。',
                }[latestDecision.status]
              : '把一个正在犹豫的决定，放到时间中看一看。'}
          </p>
          <button
            className="outline-button"
            onClick={() => (latestDecision ? onDecision(latestDecision.id) : newDecision())}
          >
            {latestDecision ? '回到这次选择' : '开启一次决策镜'}
            <ArrowUpRight size={15} />
          </button>
        </section>
      </div>
      <div className="loop-strip">
        <Waypoints size={17} />
        <span>经历成为记忆</span>
        <ArrowRight />
        <span>记忆照见现在</span>
        <ArrowRight />
        <span>现在改变未来</span>
        <ArrowRight />
        <strong>行动，回到现实</strong>
      </div>
    </div>
  );
}

export function StateCard({
  claim,
  index,
  onEvidence,
  compact,
}: {
  claim: Claim;
  index: number;
  onEvidence: (ids: string[]) => void;
  compact?: boolean;
}) {
  const trend = {
    rising: { text: '积极线索', Icon: ArrowUp },
    falling: { text: '消耗线索', Icon: ArrowDown },
    steady: { text: '相对稳定', Icon: Minus },
    unknown: { text: '趋势待确认', Icon: Minus },
  }[claim.trend];
  return (
    <article className={'state-card ' + (compact ? 'compact' : '')}>
      <div className="card-top">
        <span className="card-number">0{index + 1}</span>
        <h3>{claim.label}</h3>
        <span className={'trend ' + claim.trend} title="趋势是对文字的推断，不是直接测量">
          <trend.Icon size={12} />
          {trend.text}
        </span>
      </div>
      <h4>{claim.value}</h4>
      {!compact && <p>{claim.detail}</p>}
      <div className="card-bottom">
        <Pill kind={claim.kind} />
        <EvidenceButton ids={claim.evidence} onOpen={onEvidence} />
      </div>
      {!compact && (
        <div className="confidence-note">
          {CONF[claim.confidence]} · 趋势为文本线索，不是量表分数
        </div>
      )}
    </article>
  );
}

export function PresentPage({
  model,
  onEvidence,
  onCheckin,
}: {
  model: SelfModel;
  onEvidence: (ids: string[]) => void;
  onCheckin: () => void;
}) {
  return (
    <div className="page-enter">
      <div className="page-heading with-action">
        <div>
          <span className="eyebrow">02 / PRESENT STATE</span>
          <h1>你不是一个固定的答案。</h1>
          <p>此刻的状态有边界、有矛盾，也有改变的空间。</p>
        </div>
        <button className="primary" onClick={onCheckin}>
          <Plus size={16} />
          补充此刻
        </button>
      </div>
      <div className="state-intro">
        <Compass size={23} strokeWidth={1.2} />
        <div>
          <strong>一份持续更新的自我模型</strong>
          <p>
            依据 {model.note_count} 篇记录 · 更新于 {fullDate(model.created_at)}
            。空白代表未知，不代表不足。
          </p>
        </div>
        <Pill>8 个观察维度</Pill>
      </div>
      {!!model.changes.length && (
        <section className="change-box">
          <span className="eyebrow">SINCE LAST REFLECTION</span>
          <h3>与上一次相比</h3>
          {model.changes.map((c, i) => (
            <p key={i}>
              <ArrowUpRight size={14} />
              {c}
            </p>
          ))}
        </section>
      )}
      {!!model.tensions.length && (
        <div className="tension-box">
          <Waypoints size={19} />
          <div>
            <strong>两种状态，可以同时存在</strong>
            {model.tensions.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
            <EvidenceButton
              ids={model.claims
                .filter((c) => ['body', 'vocation', 'resources'].includes(c.id))
                .flatMap((c) => c.evidence)}
              onOpen={onEvidence}
            />
          </div>
        </div>
      )}
      <div className="full-state-grid">
        {model.claims.map((c, i) => (
          <StateCard key={c.id} claim={c} index={i} onEvidence={onEvidence} />
        ))}
      </div>
      <div className="quiet-note">
        <Info size={15} />
        {model.warnings[0] || '模型判断来自有限资料；没有独立验证的自述不会升级为事实。'}
      </div>
    </div>
  );
}

export function PastPage({
  model,
  onEvidence,
}: {
  model: SelfModel;
  onEvidence: (ids: string[]) => void;
}) {
  const [tab, setTab] = useState<'patterns' | 'timeline'>('patterns');
  const notes = [...new Map(model.evidence.map((e) => [e.path, e])).values()].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return (
    <div className="page-enter">
      <div className="page-heading">
        <span className="eyebrow">01 / PAST PATTERNS</span>
        <h1>来路里，藏着一些线索。</h1>
        <p>回看已经发生的事，理解今天的你如何形成。</p>
      </div>
      <div className="page-tabs">
        <button className={tab === 'patterns' ? 'active' : ''} onClick={() => setTab('patterns')}>
          重复的线索 <span>{model.patterns.length}</span>
        </button>
        <button className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}>
          记忆时间线 <span>{notes.length}</span>
        </button>
        <span className="tabs-note">原始记录优先 · 每条线索可追溯</span>
      </div>
      {tab === 'patterns' ? (
        <div className="patterns-list">
          {model.patterns.map((p, i) => (
            <article className="pattern-row" key={p.id}>
              <div className="pattern-index">
                0{i + 1}
                <span />
              </div>
              <div>
                <span className="eyebrow">{p.category}</span>
                <h2>{p.title}</h2>
                <p>{p.description}</p>
                <div className="pattern-meta">
                  <Pill kind="inference" />
                  <span>{CONF[p.confidence]}</span>
                  <EvidenceButton ids={p.evidence} onOpen={onEvidence} />
                </div>
              </div>
              <div className="pattern-sources">
                {[...new Set(p.evidence.map((id) => model.evidence.find((e) => e.id === id)?.date))]
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((d) => (
                    <span key={d}>
                      <Circle size={6} />
                      {d}
                    </span>
                  ))}
              </div>
            </article>
          ))}
          {!model.patterns.length && (
            <Empty title="先保留未知">
              需要不同时间的多条记录，才能谨慎地提出重复线索。目前不会替你补写过去。
            </Empty>
          )}
        </div>
      ) : (
        <div className="timeline">
          {notes.map((n) => (
            <article key={n.path}>
              <div className="timeline-date">
                {n.date || '日期未知'}
                <span />
              </div>
              <div>
                <Pill kind="self_report" />
                <h3>{n.title}</h3>
                <p>{n.quote}</p>
                <button
                  className="text-button"
                  onClick={() =>
                    onEvidence(model.evidence.filter((e) => e.path === n.path).map((e) => e.id))
                  }
                >
                  <FileText size={14} />
                  {n.path}
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="quiet-note">
        <Info size={15} />
        时间线只展示已引用的原始资料。共同出现不等于因果，重复线索也不等于固定人格。
      </div>
    </div>
  );
}

export function FuturePage({
  model,
  onEvidence,
  newDecision,
}: {
  model: SelfModel;
  onEvidence: (ids: string[]) => void;
  newDecision: () => void;
}) {
  const f = model.future;
  return (
    <div className="page-enter">
      <div className="page-heading with-action">
        <div>
          <span className="eyebrow">03 / FUTURE SELF</span>
          <h1>
            未来是一种可能，
            <br />
            也是一次邀请。
          </h1>
          <p>不是预言。是把今天的状态，放到更长的时间里看。</p>
        </div>
        <Pill kind="hypothesis" />
      </div>
      <div className="future-feature">
        <div className="future-orbit" aria-hidden="true">
          <div />
          <div />
          <div />
          <span>
            未<br />来
          </span>
        </div>
        <div>
          <span className="eyebrow">IF THIS TRAJECTORY CONTINUES</span>
          <h2>{f.title}</h2>
          <p>{f.narrative}</p>
          <div className="future-meta">
            <Pill>{CONF[f.confidence]}</Pill>
            <EvidenceButton ids={f.evidence} onOpen={onEvidence} />
          </div>
        </div>
      </div>
      <div className="future-voice">
        <span>来自这个可能的我</span>
        <blockquote>“{f.voice}”</blockquote>
        <small>根据当前资料生成的反思视角 · 并非实际发生的未来</small>
      </div>
      <div className="future-details">
        {[
          { title: '这条未来，建立在什么之上', icon: Layers3, list: f.assumptions },
          { title: '可能使轨迹改变的因素', icon: GitBranch, list: f.risks },
          { title: '仍然不知道的事', icon: Circle, list: f.uncertainties },
        ].map(({ title, icon: Icon, list }) => (
          <section key={title}>
            <Icon size={19} strokeWidth={1.4} />
            <h3>{title}</h3>
            <ul>
              {list.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="decision-callout">
        <div>
          <GitBranch size={24} />
          <div>
            <h3>如果现在做出不同的选择呢？</h3>
            <p>把一个具体决定展开，比较一个月、三个月与一年后的可能。</p>
          </div>
        </div>
        <button className="primary" onClick={newDecision}>
          让未来分岔
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function JournalPage({
  model,
  onCheckin,
  onEvidence,
}: {
  model: SelfModel;
  onCheckin: () => void;
  onEvidence: (ids: string[]) => void;
}) {
  const entries = [
    ...new Map(
      model.evidence.filter((e) => e.path.startsWith('ThreefoldMirror/')).map((e) => [e.path, e]),
    ).values(),
  ].reverse();
  return (
    <div className="page-enter">
      <div className="page-heading with-action">
        <div>
          <span className="eyebrow">SMALL MOMENTS, REAL CHANGES</span>
          <h1>给此刻，一个落点。</h1>
          <p>不必写完整日记。只留下今天真正发生变化的事。</p>
        </div>
        <button className="primary" onClick={onCheckin}>
          <Plus size={16} />
          记录此刻
        </button>
      </div>
      <div className="journal-invite">
        <Feather size={34} strokeWidth={1} />
        <h2>有什么，是之前的记录还不知道的？</h2>
        <p>{model.gaps[0] || '最近的精力、正在做的选择，或者一个让你改变看法的瞬间。'}</p>
        <button className="outline-button" onClick={onCheckin}>
          花一分钟，更新现在的我
          <ArrowUpRight size={15} />
        </button>
      </div>
      <SectionTitle eyebrow="RECENTLY REFLECTED" title="已映入当前模型的记录" />
      {entries.length ? (
        <div className="journal-list">
          {entries.map((e) => (
            <button
              key={e.path}
              onClick={() =>
                onEvidence(model.evidence.filter((v) => v.path === e.path).map((v) => v.id))
              }
            >
              <div className="journal-date">{date(e.date)}</div>
              <div>
                <h3>{e.title}</h3>
                <p>{e.quote}</p>
                <span>{e.path}</span>
              </div>
              <ArrowUpRight size={18} />
            </button>
          ))}
        </div>
      ) : (
        <Empty title="从今天这一条开始">
          新记录会写入 Vault 的独立目录，并用于更新当前状态。完整历史始终留在 Obsidian 中。
        </Empty>
      )}
    </div>
  );
}
