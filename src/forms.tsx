import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  FileText,
  FolderOpen,
  Info,
  Leaf,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { type AppState, type Evidence, type SelfModel } from '../shared/schema';
import { date, api } from './data';
import { Pill, ModalShell } from './ui';

export function ConnectForm({
  state,
  busy,
  notify,
  connect,
}: {
  state: AppState;
  busy: boolean;
  notify: (s: string, error?: boolean) => void;
  connect: (data: unknown) => Promise<void>;
}) {
  const [path, setPath] = useState(state.config.demo ? '' : state.config.vault || '');
  const [ignored, setIgnored] = useState(state.config.ignored.join('\n'));
  const [preview, setPreview] = useState<{
    path: string;
    count: number;
    notes: { title: string; path: string; date: string }[];
    warnings: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const exclusions = () =>
    ignored
      .split('\n')
      .map((p) => p.trim().replaceAll('\\', '/'))
      .filter(Boolean);
  async function inspect(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      setPreview(await api('/vault/preview', { path: path.trim(), ignored: exclusions() }));
    } catch (err) {
      notify((err as Error).message, true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="modal-content">
      <p className="modal-description">
        选择本机上的 Obsidian Vault。三世镜读取 Markdown；新模型与记录只写入独立的{' '}
        <code>ThreefoldMirror/</code> 目录。
      </p>
      <form onSubmit={inspect}>
        <label htmlFor="vault-path">Vault 文件夹的完整路径</label>
        <input
          id="vault-path"
          required
          placeholder="D:\Notes\MyVault"
          value={path}
          onChange={(e) => {
            setPath(e.target.value);
            setPreview(null);
          }}
        />
        <label htmlFor="vault-ignore">
          不希望读取的目录 <span>选填，每行一个相对路径</span>
        </label>
        <textarea
          id="vault-ignore"
          rows={2}
          placeholder={'Private\nWork/Confidential'}
          value={ignored}
          onChange={(e) => {
            setIgnored(e.target.value);
            setPreview(null);
          }}
        />
        <button className="secondary" disabled={loading || busy}>
          {loading ? <Loader2 size={15} className="spin" /> : <FolderOpen size={15} />}只读预览
        </button>
      </form>
      {preview && (
        <div className="vault-preview">
          <strong>
            <Check size={16} />
            找到 {preview.count} 篇 Markdown
          </strong>
          <ul>
            {preview.notes.slice(0, 8).map((n) => (
              <li key={n.path}>
                <FileText size={13} />
                <span>{n.path}</span>
                <small>{n.date}</small>
              </li>
            ))}
          </ul>
          {preview.count > 8 && <small>其余 {preview.count - 8} 篇同样会纳入分析</small>}
          {preview.warnings.map((w, i) => (
            <p className="form-error" key={i}>
              {w}
            </p>
          ))}
          {preview.count === 0 && (
            <p>当前没有可读记录。连接后可从“记录此刻”开始，不会生成虚构经历。</p>
          )}
          <button
            className="primary"
            disabled={busy}
            onClick={() => connect({ path: preview.path, ignored: exclusions(), demo: false })}
          >
            连接并建立三世镜
            <ArrowRight size={15} />
          </button>
        </div>
      )}
      <div className="privacy-note">
        <ShieldCheck size={18} />
        <div>
          <strong>资料留在本机，解释可以追溯。</strong>
          <p>连接时默认使用离线分析。以后启用远程模型时，界面会明确说明哪些内容将被发送。</p>
        </div>
      </div>
      <button className="text-button" disabled={busy} onClick={() => connect({ demo: true })}>
        用独立的虚构示例体验完整流程
        <ArrowUpRight size={14} />
      </button>
    </div>
  );
}

export function CheckinForm({
  model,
  busy,
  submit,
}: {
  model: SelfModel | null;
  busy: boolean;
  submit: (data: unknown) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [energy, setEnergy] = useState('');
  const [focus, setFocus] = useState('');
  const [sleep, setSleep] = useState('');
  return (
    <form
      className="modal-content"
      onSubmit={(e) => {
        e.preventDefault();
        void submit({
          text,
          ...(energy ? { energy } : {}),
          ...(focus ? { focus } : {}),
          ...(sleep !== '' ? { sleep: Number(sleep) } : {}),
        });
      }}
    >
      <p className="modal-description">一两句话就够。记录变化，让模型跟上真实的你。</p>
      <label htmlFor="checkin-text">今天，什么值得留下？</label>
      <textarea
        id="checkin-text"
        className="checkin-text"
        required
        minLength={3}
        maxLength={8000}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="今天实际发生了什么？精力、想法或计划，有什么变化？"
      />
      <div className="checkin-optional">
        <span className="eyebrow">只补充你愿意补充的</span>
        {[
          { label: '此刻的精力', value: energy, set: setEnergy },
          { label: '此刻的专注', value: focus, set: setFocus },
        ].map((field) => (
          <div className="checkin-row" key={field.label}>
            <label>{field.label}</label>
            <div className="segmented">
              {[
                { id: 'low', text: '偏低' },
                { id: 'medium', text: '一般' },
                { id: 'high', text: '充足' },
              ].map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={field.value === option.id ? 'active' : ''}
                  onClick={() => field.set(field.value === option.id ? '' : option.id)}
                >
                  {option.text}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="checkin-row">
          <label htmlFor="sleep">最近一晚睡眠</label>
          <div className="sleep-input">
            <input
              id="sleep"
              aria-label="最近一晚睡眠小时"
              type="number"
              min="0"
              max="24"
              step="0.5"
              placeholder="—"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
            />
            <span>小时</span>
          </div>
        </div>
      </div>
      {!!model?.gaps.length && (
        <p className="form-note">
          <Info size={14} />
          目前最缺少的线索：{model.gaps[0]}。不必一次补全。
        </p>
      )}
      <div className="form-actions">
        <Pill kind="self_report" />
        <button className="primary" disabled={busy}>
          {busy ? <Loader2 className="spin" size={15} /> : <Check size={15} />}保存此刻，更新三世镜
        </button>
      </div>
    </form>
  );
}

export function SettingsForm({
  state,
  busy,
  submit,
}: {
  state: AppState;
  busy: boolean;
  submit: (data: unknown) => Promise<void>;
}) {
  const [provider, setProvider] = useState(state.config.provider);
  const remote = (() => {
    try {
      return !['localhost', '127.0.0.1', '[::1]'].includes(new URL(provider.baseUrl).hostname);
    } catch {
      return true;
    }
  })();
  return (
    <form
      className="modal-content"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(provider);
      }}
    >
      <label>分析方式</label>
      <div className="provider-options">
        <button
          type="button"
          className={provider.mode === 'offline' ? 'selected' : ''}
          onClick={() => setProvider({ ...provider, mode: 'offline' })}
        >
          <Leaf size={20} />
          <strong>离线规则</strong>
          <span>
            完全本地 · 无需密钥
            <br />
            提取线索与条件推演，语义能力有限
          </span>
        </button>
        <button
          type="button"
          className={provider.mode === 'compatible' ? 'selected' : ''}
          onClick={() => setProvider({ ...provider, mode: 'compatible' })}
        >
          <Sparkles size={20} />
          <strong>语言模型</strong>
          <span>
            兼容 Chat Completions 的服务
            <br />
            本机模型或自行配置的远程模型
          </span>
        </button>
      </div>
      {provider.mode === 'compatible' && (
        <>
          <label htmlFor="provider-url">API Base URL</label>
          <input
            id="provider-url"
            type="url"
            required
            value={provider.baseUrl}
            onChange={(e) =>
              setProvider({ ...provider, baseUrl: e.target.value, remoteConsent: false })
            }
          />
          <label htmlFor="provider-model">模型名称</label>
          <input
            id="provider-model"
            required
            placeholder="填写服务中实际可用的模型 ID"
            value={provider.model}
            onChange={(e) => setProvider({ ...provider, model: e.target.value })}
          />
          <p className="form-note">
            密钥仅在服务端读取：项目根目录 .env 中的 MIRROR_API_KEY。不会保存在浏览器或写入
            Vault。保存后点击“重新映照”发起分析。
          </p>
          {remote && (
            <label className="checkbox-label consent">
              <input
                type="checkbox"
                required
                checked={provider.remoteConsent}
                onChange={(e) => setProvider({ ...provider, remoteConsent: e.target.checked })}
              />
              <span>
                我同意将所选 Vault
                中的引用片段、文件名、当前模型和决策内容发送至上方服务。原始文件仍保留在本机。
              </span>
            </label>
          )}
        </>
      )}
      <div className="settings-info">
        <span>当前 Vault</span>
        <code>{state.config.vault || '尚未连接'}</code>
        <span>长期记忆</span>
        <p>Markdown + YAML · 每次更新保存新快照</p>
        <span>生成记录的引擎</span>
        <p>{state.model?.generated_by || '尚未建立模型'}</p>
      </div>
      <button className="primary" disabled={busy}>
        保存设置
        <Check size={15} />
      </button>
    </form>
  );
}

export function EvidenceDrawer({
  ids,
  state,
  onClose,
}: {
  ids: string[];
  state: AppState;
  onClose: () => void;
}) {
  const [sources, setSources] = useState<
    (Evidence & { changed: boolean; missing: boolean; excerpt: string })[]
  >([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    Promise.all(
      [...new Set(ids)].map((id) =>
        api<Evidence & { changed: boolean; missing: boolean; excerpt: string }>(
          '/evidence/' + encodeURIComponent(id),
        ),
      ),
    )
      .then((r) => {
        if (alive) setSources(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [ids]);
  return (
    <ModalShell title="为什么这样判断？" onClose={onClose} drawer>
      <div className="modal-content">
        <p className="modal-description">
          每个判断都应该有来处。以下是建立判断时引用的原始片段，自述尚未经独立核验。
        </p>
        {loading && (
          <div className="loading">
            <Loader2 size={20} className="spin" />
            正在读取本机原文…
          </div>
        )}
        {error && <div className="alert">{error}</div>}
        {sources.map((e, i) => (
          <article className="source-card" key={e.id}>
            <div className="source-card-top">
              <span>依据 {String(i + 1).padStart(2, '0')}</span>
              <Pill kind={e.kind} />
            </div>
            <h3>{e.title}</h3>
            <span className="source-date">
              {e.date || '未标注日期'} · 第 {e.line} 行
            </span>
            <blockquote>{e.quote}</blockquote>
            <div className="source-path">
              <FileText size={14} />
              <span>{e.path}</span>
            </div>
            {e.changed && (
              <div className="source-warning">
                <Info size={15} />
                {e.missing
                  ? '原文件已移动或删除。上方保留生成时的引用，请更新模型。'
                  : '原文件已发生变化。上方是生成时的引用，下方为当前位置的原文。'}
              </div>
            )}
            <details>
              <summary>
                查看原文上下文
                <Plus size={13} />
              </summary>
              <pre>{e.excerpt || '无法读取原文'}</pre>
            </details>
            <a
              className="text-button"
              href={`obsidian://open?path=${encodeURIComponent(state.config.vault + '/' + e.path)}`}
            >
              在 Obsidian 中打开
              <ArrowUpRight size={13} />
            </a>
            <small className="source-hash">内容指纹 {e.hash.slice(0, 16)}</small>
          </article>
        ))}
      </div>
    </ModalShell>
  );
}
