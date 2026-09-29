import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCheck,
  ChevronRight,
  FolderOpen,
  Info,
  Loader2,
  Menu,
  RefreshCw,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { type AppState } from '../shared/schema';
import { type Page, type Modal, NAV, api } from './data';
import { Logo, ModalShell } from './ui';
import { Onboarding, MirrorHome, PresentPage, PastPage, FuturePage, JournalPage } from './temporal';
import { DecisionsPage } from './decisions';
import { ConnectForm, CheckinForm, SettingsForm, EvidenceDrawer } from './forms';

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [page, setPage] = useState<Page>('mirror');
  const [modal, setModal] = useState<Modal>(null);
  const [evidenceIds, setEvidenceIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const [fatal, setFatal] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [createDecision, setCreateDecision] = useState(false);
  const busyRef = useRef(false);
  const notify = useCallback((text: string, error = false) => setToast({ text, error }), []);
  const refresh = useCallback(async () => {
    try {
      setState(await api<AppState>('/state'));
      setFatal('');
    } catch (e) {
      setFatal((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (!busyRef.current && document.visibilityState === 'visible') void refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    setMobileNav(false);
  }, [page]);
  async function run(
    url: string,
    body: unknown,
    success: string,
  ): Promise<(AppState & { decisionId?: string }) | null> {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await api<AppState & { notice?: string; decisionId?: string }>(url, body);
      setState(result);
      notify(result.notice || success, !!result.notice);
      return result;
    } catch (e) {
      notify((e as Error).message, true);
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const go = (next: Page) => {
    if (!state?.connected && next !== 'mirror') {
      setModal('connect');
      return;
    }
    setPage(next);
  };
  const newDecision = () => {
    setCreateDecision(true);
    setPage('decisions');
  };
  const evidence = (ids: string[]) => setEvidenceIds(ids);
  if (!state)
    return (
      <div className="boot">
        <Logo />
        {fatal ? (
          <>
            <p>{fatal}</p>
            <button className="primary" onClick={refresh}>
              重试连接
            </button>
          </>
        ) : (
          <>
            <Loader2 className="spin" />
            <p>让时间，慢慢显影。</p>
          </>
        )}
      </div>
    );
  const model = state.model;
  const currentNav = NAV.find((n) => n.id === page)!;
  return (
    <div className="app-shell">
      {mobileNav && <div className="nav-backdrop" onClick={() => setMobileNav(false)} />}
      <aside className={'sidebar ' + (mobileNav ? 'open' : '')}>
        <Logo />
        <div className="workspace-name">
          <span className="workspace-dot" />
          我的时间空间<span className="version">α 0.1</span>
        </div>
        <nav>
          {NAV.map((n, i) => (
            <div key={n.id}>
              {i === 4 && (
                <div className="nav-divider">
                  <span>让改变发生</span>
                </div>
              )}
              <button className={page === n.id ? 'active' : ''} onClick={() => go(n.id)}>
                <n.icon size={18} strokeWidth={1.55} />
                <span>{n.label}</span>
                {page === n.id && <span className="nav-active-dot" />}
                {n.id === 'decisions' &&
                  !!state.decisions.filter((d) => d.status === 'acting').length && (
                    <small>{state.decisions.filter((d) => d.status === 'acting').length}</small>
                  )}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-thought">
          <span>“</span>
          <p>
            我们不是时间的旁观者。
            <br />
            我们是它的参与者。
          </p>
          <div className="small-line" />
        </div>
        <div className="sidebar-bottom">
          <button className="vault-status" onClick={() => setModal('connect')}>
            <div className="vault-icon">
              <FolderOpen size={17} />
            </div>
            <div>
              <strong>
                {state.connected
                  ? state.config.demo
                    ? '示例 Obsidian Vault'
                    : 'Obsidian 已连接'
                  : '连接你的 Obsidian'}
              </strong>
              <span>
                <i />
                {state.connected ? 'Markdown · 保存在本机' : '从你的真实记录开始'}
              </span>
            </div>
            <ChevronRight size={14} />
          </button>
          <button className="settings-link" onClick={() => setModal('settings')}>
            <Settings2 size={16} />
            <span>模型与设置</span>
            <span className="offline-dot" />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="打开导航"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">我的空间</span>
            <ChevronRight size={12} />
            <strong>{currentNav.label}</strong>
          </div>
          <div>
            <span className="local-indicator">
              <ShieldCheck size={13} />
              本地优先
            </span>
            <span className="header-divider" />
            <time>
              {new Date()
                .toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
                .replaceAll('/', '.')}
            </time>
            <span className="avatar">我</span>
          </div>
        </header>
        <main>
          {state.config.demo && (
            <div className="demo-banner">
              <span>
                <Info size={13} />
                <b>示例空间</b> · 你正在探索一段虚构人生，所有记录均不代表你。
              </span>
              <button onClick={() => setModal('connect')}>
                连接我的资料 <ArrowRight size={13} />
              </button>
            </div>
          )}
          {fatal && (
            <div className="alert">
              本地服务暂时不可用：{fatal}
              <button onClick={refresh}>重试</button>
            </div>
          )}
          {state.warnings.map((w, i) => (
            <div className="alert" key={i}>
              {w}
            </div>
          ))}
          {state.stale && state.connected && (
            <div className="update-banner">
              <span>
                <RefreshCw size={14} /> 你的记录有了变化。让过去、现在和未来重新映照。
              </span>
              <button
                disabled={busy}
                onClick={() => run('/rebuild', {}, '三世镜已依据最新资料更新')}
              >
                {busy ? '正在更新…' : '更新三世镜'}
                <ArrowRight size={13} />
              </button>
            </div>
          )}
          {!state.connected ? (
            <Onboarding
              onDemo={() =>
                run('/vault/connect', { demo: true }, '示例人生已就绪。每一条判断都可以追溯原文。')
              }
              onConnect={() => setModal('connect')}
              busy={busy}
            />
          ) : (
            model && (
              <>
                {page === 'mirror' && (
                  <MirrorHome
                    model={model}
                    state={state}
                    go={go}
                    onEvidence={evidence}
                    onCheckin={() => setModal('checkin')}
                    newDecision={newDecision}
                    onDecision={(id) => {
                      setSelectedDecision(id);
                      setCreateDecision(false);
                      setPage('decisions');
                    }}
                    busy={busy}
                    onRebuild={() => run('/rebuild', {}, '当前状态与未来已重新生成')}
                  />
                )}
                {page === 'present' && (
                  <PresentPage
                    model={model}
                    onEvidence={evidence}
                    onCheckin={() => setModal('checkin')}
                  />
                )}
                {page === 'past' && <PastPage model={model} onEvidence={evidence} />}
                {page === 'future' && (
                  <FuturePage model={model} onEvidence={evidence} newDecision={newDecision} />
                )}
                {page === 'decisions' && (
                  <DecisionsPage
                    state={state}
                    busy={busy}
                    run={run}
                    onEvidence={evidence}
                    selectedId={selectedDecision}
                    setSelectedId={setSelectedDecision}
                    creating={createDecision}
                    setCreating={setCreateDecision}
                  />
                )}
                {page === 'journal' && (
                  <JournalPage
                    model={model}
                    onCheckin={() => setModal('checkin')}
                    onEvidence={evidence}
                  />
                )}
              </>
            )
          )}
          <footer>
            <Logo compact />
            <span>过去已成回响，现在仍有可能。</span>
            <span className="footer-right">
              THREEFOLD MIRROR <i /> A LIFE, IN BECOMING
            </span>
          </footer>
        </main>
      </div>
      {modal && (
        <ModalShell
          title={
            modal === 'connect'
              ? '让真实的记录，走进三世镜'
              : modal === 'checkin'
                ? '此刻，你怎么样？'
                : '模型与本地空间'
          }
          onClose={() => {
            if (!busy) setModal(null);
          }}
          busy={busy}
        >
          {modal === 'connect' && (
            <ConnectForm
              state={state}
              busy={busy}
              notify={notify}
              connect={async (data) => {
                const result = await run(
                  '/vault/connect',
                  data,
                  'Vault 已连接，初始模型已写入 ThreefoldMirror',
                );
                if (result) {
                  setModal(null);
                  setPage('mirror');
                  setSelectedDecision(null);
                }
              }}
            />
          )}
          {modal === 'checkin' && (
            <CheckinForm
              model={model}
              busy={busy}
              submit={async (data) => {
                if (await run('/checkins', data, '此刻已保存。新的状态，正在改变未来。'))
                  setModal(null);
              }}
            />
          )}
          {modal === 'settings' && (
            <SettingsForm
              state={state}
              busy={busy}
              submit={async (data) => {
                if (
                  await run(
                    '/settings/provider',
                    data,
                    '模型设置已保存。点击更新三世镜以使用新设置。',
                  )
                )
                  setModal(null);
              }}
            />
          )}
        </ModalShell>
      )}
      {evidenceIds && (
        <EvidenceDrawer ids={evidenceIds} state={state} onClose={() => setEvidenceIds(null)} />
      )}
      {toast && (
        <div
          className={'toast ' + (toast.error ? 'error' : '')}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.error ? <Info size={18} /> : <CheckCheck size={18} />}
          <span>{toast.text}</span>
          <button className="icon-button" aria-label="关闭提示" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      {busy && (
        <div className="working-bar" role="status">
          <Loader2 size={14} className="spin" />
          正在处理并写入本地记录…
        </div>
      )}
    </div>
  );
}
