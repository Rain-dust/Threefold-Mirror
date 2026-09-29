import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCheck,
  GitBranch,
  Info,
  Leaf,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { type AppState, type Branch } from '../shared/schema';
import { CONF, date, fullDate } from './data';
import { Pill, EvidenceButton, SectionTitle } from './ui';

export type Run = (
  url: string,
  body: unknown,
  success: string,
) => Promise<(AppState & { decisionId?: string }) | null>;
export function DecisionsPage({
  state,
  busy,
  run,
  onEvidence,
  selectedId,
  setSelectedId,
  creating,
  setCreating,
}: {
  state: AppState;
  busy: boolean;
  run: Run;
  onEvidence: (ids: string[]) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  creating: boolean;
  setCreating: (v: boolean) => void;
}) {
  const decision = state.decisions.find((d) => d.id === selectedId) || state.decisions[0];
  const [months, setMonths] = useState(3);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [reflection, setReflection] = useState('');
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    setBranchId(null);
    setAction('');
    setOutcome('');
    setReflection('');
    setChanged(false);
  }, [decision?.id]);
  return (
    <div className="page-enter">
      <div className="page-heading with-action">
        <div>
          <span className="eyebrow">DECISION MIRROR</span>
          <h1>让选择，经过时间。</h1>
          <p>过去提供依据，现在给出边界，未来展开可能。</p>
        </div>
        {decision && !creating && (
          <button className="primary" onClick={() => setCreating(true)}>
            <Plus size={16} />
            新的决策
          </button>
        )}
      </div>
      {creating || !decision ? (
        <DecisionForm
          demo={state.config.demo}
          busy={busy}
          stale={state.stale}
          cancel={decision ? () => setCreating(false) : undefined}
          submit={async (data) => {
            const result = await run('/decisions', data, '未来分支已生成并写入 Obsidian');
            if (result) {
              setSelectedId(result.decisionId!);
              setCreating(false);
            }
          }}
        />
      ) : (
        <>
          <div className="decision-selector">
            <label htmlFor="decision-picker">正在回看的选择</label>
            <select
              id="decision-picker"
              value={decision.id}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {state.decisions.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.title} · {{ open: '推演中', acting: '行动中', reflected: '已复盘' }[d.status]}
                </option>
              ))}
            </select>
          </div>
          <div className="decision-header">
            <Pill>
              {
                { open: '分支待选择', acting: '行动正在发生', reflected: '已成为新的历史' }[
                  decision.status
                ]
              }
            </Pill>
            <h2>{decision.title}</h2>
            {decision.context && <p>{decision.context}</p>}
            <span>
              {date(decision.created_at)} ·{' '}
              {decision.generated_by === 'offline-rules-v1' ? '离线条件推演' : '模型推演'}
              {decision.model_id !== state.model?.id ? ' · 保留决策当时的模型快照' : ''}
            </span>
          </div>
          <div className="decision-ground">
            <div>
              <span className="eyebrow">PAST / 过去的依据</span>
              <p>{decision.past}</p>
              <EvidenceButton ids={decision.evidence} onOpen={onEvidence} />
            </div>
            <ArrowRight size={18} />
            <div>
              <span className="eyebrow">PRESENT / 现在的边界</span>
              <p>{decision.present}</p>
            </div>
          </div>
          <div className="branch-heading">
            <SectionTitle eyebrow="POSSIBLE FUTURES" title="同一个现在，不同的以后" />
            <div className="segmented" aria-label="未来时间范围">
              {[1, 3, 12].map((m) => (
                <button
                  key={m}
                  className={months === m ? 'active' : ''}
                  onClick={() => setMonths(m)}
                >
                  {m === 12 ? '1 年' : `${m} 个月`}
                </button>
              ))}
            </div>
          </div>
          <div
            className="branches-grid"
            style={{ gridTemplateColumns: `repeat(${decision.branches.length}, minmax(0, 1fr))` }}
          >
            {decision.branches.map((branch, i) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                index={i}
                months={months}
                selected={branchId === branch.id || decision.intervention?.branch_id === branch.id}
                onSelect={decision.status === 'open' ? () => setBranchId(branch.id) : undefined}
                onEvidence={onEvidence}
              />
            ))}
          </div>
          {decision.status === 'open' && (
            <section className="action-panel">
              <div>
                <span className="eyebrow">FROM POSSIBILITY TO REALITY</span>
                <h2>
                  {branchId
                    ? `把「${decision.branches.find((b) => b.id === branchId)?.label}」带回现实`
                    : '选择一个分支，再写下一个具体行动。'}
                </h2>
                <p>行动是一次干预。看见未来后，你可以主动改变它。</p>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (branchId)
                    await run(
                      `/decisions/${decision.id}/action`,
                      { branch_id: branchId, action },
                      '行动已记录。等现实发生后，回来复盘。',
                    );
                }}
              >
                <label htmlFor="action">下一步做什么，何时回来检验？</label>
                <textarea
                  id="action"
                  required
                  minLength={3}
                  maxLength={3000}
                  placeholder="例如：本周只验证一个核心问题，周日根据真实反馈决定是否继续。"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                />
                <button
                  className="primary"
                  disabled={!branchId || busy || action.trim().length < 3}
                >
                  <Check size={16} />
                  记录行动
                </button>
              </form>
            </section>
          )}
          {decision.intervention && (
            <div className="intervention-card">
              <CheckCheck size={21} />
              <div>
                <span className="eyebrow">INTERVENTION / 你已经选择</span>
                <h3>
                  {decision.branches.find((b) => b.id === decision.intervention?.branch_id)?.label}
                </h3>
                <p>{decision.intervention.action}</p>
                <small>{fullDate(decision.intervention.created_at)}</small>
              </div>
            </div>
          )}
          {decision.status === 'acting' && (
            <section className="reflection-panel">
              <SectionTitle eyebrow="LET REALITY ANSWER" title="后来，真实发生了什么？" />
              <p>预测没有实现，也可能是你成功改变了轨迹。把结果与干预分开记录。</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await run(
                    `/decisions/${decision.id}/reflection`,
                    { outcome, reflection, changed_by_prediction: changed },
                    '复盘已写回 Obsidian，并成为新的历史依据',
                  );
                }}
              >
                <label htmlFor="outcome">
                  真实结果 <span>用户自述</span>
                </label>
                <textarea
                  id="outcome"
                  required
                  minLength={3}
                  maxLength={5000}
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="实际做了什么？观察到了哪些结果？"
                />
                <label htmlFor="reflection">你的反思</label>
                <textarea
                  id="reflection"
                  required
                  minLength={3}
                  maxLength={5000}
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="原先的哪些假设变了？下一次想保留什么？"
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={changed}
                    onChange={(e) => setChanged(e.target.checked)}
                  />
                  看到这些预测，改变了我的行动
                </label>
                <button className="primary" disabled={busy}>
                  保存复盘，更新三世镜
                  <ArrowRight size={16} />
                </button>
              </form>
            </section>
          )}
          {decision.reflection && (
            <div className="completed-reflection">
              <div>
                <span className="eyebrow">OUTCOME / 真实结果</span>
                <p>{decision.outcome?.text}</p>
              </div>
              <div>
                <span className="eyebrow">REFLECTION / 你的回看</span>
                <p>{decision.reflection.text}</p>
                <Pill kind="self_report" />
              </div>
              <div className="intervention-value">
                <Leaf size={18} />
                {decision.reflection.changed_by_prediction
                  ? '你确认：这次推演改变了自己的行动。系统保留干预价值，不把预测落空简单视为失败。'
                  : '你确认：这次推演没有改变行动。结果仍然是下一次判断的重要依据。'}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function BranchCard({
  branch,
  index,
  months,
  selected,
  onSelect,
  onEvidence,
}: {
  branch: Branch;
  index: number;
  months: number;
  selected: boolean;
  onSelect?: () => void;
  onEvidence: (ids: string[]) => void;
}) {
  const horizon = branch.horizons.find((h) => h.months === months)!;
  return (
    <article className={'branch-card ' + (selected ? 'selected' : '')}>
      <div className="branch-top">
        <span>{String.fromCharCode(65 + index)}</span>
        <GitBranch size={20} strokeWidth={1.2} />
        {selected && <Check size={16} />}
      </div>
      <h3>{branch.label}</h3>
      <small>{branch.allocation}</small>
      <div className="branch-horizon">
        <span>{months === 12 ? '一年后的可能' : `${months} 个月后的可能`}</span>
        <h4>{horizon.title}</h4>
        <p>{horizon.description}</p>
      </div>
      <blockquote>“{branch.voice}”</blockquote>
      <details>
        <summary>
          展开假设、变量与风险
          <Plus size={13} />
        </summary>
        <div className="branch-assumptions">
          {[
            { title: '成立假设', values: branch.assumptions },
            { title: '主要变量', values: branch.variables },
            { title: '风险', values: branch.risks },
            { title: '不确定性', values: branch.uncertainties },
          ].map((group) => (
            <div key={group.title}>
              <strong>{group.title}</strong>
              <ul>
                {group.values.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
      <div className="branch-meta">
        <span>{CONF[branch.confidence]} · 假设</span>
        <EvidenceButton ids={branch.evidence} onOpen={onEvidence} />
      </div>
      {onSelect && (
        <button className={selected ? 'primary' : 'outline-button'} onClick={onSelect}>
          {selected ? (
            <>
              <Check size={14} />
              已选择此分支
            </>
          ) : (
            <>
              选择这个方向
              <ArrowRight size={14} />
            </>
          )}
        </button>
      )}
    </article>
  );
}

export function DecisionForm({
  demo,
  busy,
  stale,
  submit,
  cancel,
}: {
  demo: boolean;
  busy: boolean;
  stale: boolean;
  submit: (data: unknown) => Promise<void>;
  cancel?: () => void;
}) {
  const [title, setTitle] = useState(demo ? '未来三个月，我该投入多少时间给三世镜？' : '');
  const [context, setContext] = useState('');
  const [options, setOptions] = useState(['全力投入', '保持小步试验', '暂缓，先恢复']);
  return (
    <div className="decision-form-wrap">
      <div className="decision-form-aside">
        <GitBranch size={42} strokeWidth={0.9} />
        <h2>未来不是一条线。</h2>
        <p>
          你不需要在这里找到
          <br />
          一个绝对正确的答案。
          <br />
          <br />
          让不同选择的代价与可能，
          <br />
          变得可以被看见。
        </p>
        <span>PAST → PRESENT → FUTURES</span>
      </div>
      <form
        className="decision-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit({ title, context, options });
        }}
      >
        <label htmlFor="decision-title">你正在面对什么选择？</label>
        <textarea
          id="decision-title"
          className="decision-title-input"
          placeholder="一个真实的、你尚未决定的问题。"
          required
          minLength={4}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="decision-context">
          还有哪些重要的边界？ <span>选填</span>
        </label>
        <textarea
          id="decision-context"
          placeholder="可用时间、预算、期限、不能牺牲的事……"
          maxLength={3000}
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <label>
          你想比较的方向 <span>可修改，2–4 个</span>
        </label>
        <div className="options-input">
          {options.map((o, i) => (
            <div key={i}>
              <span>{String.fromCharCode(65 + i)}</span>
              <input
                aria-label={`分支 ${String.fromCharCode(65 + i)}`}
                required
                maxLength={60}
                value={o}
                onChange={(e) => setOptions(options.map((v, j) => (j === i ? e.target.value : v)))}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  aria-label={`删除分支 ${String.fromCharCode(65 + i)}`}
                  className="icon-button"
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 4 && (
          <button
            type="button"
            className="text-button add-option"
            onClick={() => setOptions([...options, ''])}
          >
            <Plus size={14} />
            再加一个方向
          </button>
        )}
        <div className="form-note">
          <Info size={14} />
          推演将明确列出假设与不确定性，不给出虚假的成功概率。
        </div>
        <div className="form-actions">
          {cancel && (
            <button type="button" className="secondary" onClick={cancel}>
              返回
            </button>
          )}
          <button className="primary" disabled={busy || stale}>
            {busy ? <Loader2 size={16} className="spin" /> : <GitBranch size={16} />}
            让三世一起看这个选择
            <ArrowRight size={16} />
          </button>
        </div>
        {stale && <p className="form-error">资料已变化，请先点击上方“更新三世镜”。</p>}
      </form>
    </div>
  );
}
