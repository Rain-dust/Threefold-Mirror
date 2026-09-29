import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowUpRight, FileText, Sprout, X } from 'lucide-react';
import { type Provenance } from '../shared/schema';
import { type Page, KIND } from './data';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={'logo ' + (compact ? 'compact' : '')}>
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <ellipse cx="16" cy="24" rx="7" ry="16" transform="rotate(-15 16 24)" />
        <ellipse cx="24" cy="24" rx="7" ry="17" />
        <ellipse cx="32" cy="24" rx="7" ry="16" transform="rotate(15 32 24)" />
      </svg>
      {!compact && (
        <div>
          <strong>三世镜</strong>
          <span>THREEFOLD MIRROR</span>
        </div>
      )}
    </div>
  );
}
export function Pill({ kind, children }: { kind?: Provenance; children?: ReactNode }) {
  return (
    <span className={'pill ' + (kind || '')}>
      {kind && <span className="tiny-dot" />}
      {children || (kind && KIND[kind])}
    </span>
  );
}
export function EvidenceButton({
  ids,
  onOpen,
  label,
}: {
  ids: string[];
  onOpen: (ids: string[]) => void;
  label?: string;
}) {
  return (
    <button className="evidence-link" disabled={!ids.length} onClick={() => onOpen(ids)}>
      <FileText size={13} />
      {label || (ids.length ? `${ids.length} 条依据` : '暂无直接依据')}
      <ArrowUpRight size={12} />
    </button>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {right}
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Sprout size={29} strokeWidth={1.2} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function MirrorScene({
  onSelect,
  active = 'present',
  empty = false,
}: {
  onSelect: (page: Page) => void;
  active?: string;
  empty?: boolean;
}) {
  return (
    <div className="mirror-scene">
      <div className="scene-topline">
        <span>
          <span className="tiny-dot" /> TEMPORAL SELF MODEL
        </span>
        <span>你的时间，彼此映照</span>
      </div>
      <svg
        className="mirror-art"
        viewBox="0 0 900 340"
        aria-label="过去、现在、未来三个镜面彼此交叠，只有现在的行动可以改变轨迹"
        role="img"
      >
        <defs>
          <linearGradient id="past-fill" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#d0d4c6" stopOpacity=".75" />
            <stop offset=".5" stopColor="#ecede3" stopOpacity=".45" />
            <stop offset="1" stopColor="#bec7b5" stopOpacity=".65" />
          </linearGradient>
          <linearGradient id="present-fill" x1="0" y1="0" x2="1" y2=".9">
            <stop stopColor="#e9eddb" />
            <stop offset=".35" stopColor="#f9faef" />
            <stop offset=".75" stopColor="#c5d6ba" stopOpacity=".85" />
            <stop offset="1" stopColor="#91ab8e" stopOpacity=".8" />
          </linearGradient>
          <linearGradient id="future-fill" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#c8d9cd" stopOpacity=".7" />
            <stop offset="1" stopColor="#f2f5e9" stopOpacity=".15" />
          </linearGradient>
          <linearGradient id="shine" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".75" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="ground">
            <stop stopColor="#738e6c" stopOpacity=".17" />
            <stop offset="1" stopColor="#93aa80" stopOpacity="0" />
          </radialGradient>
          <filter id="blur">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <pattern id="lines" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M0 0V4" stroke="#667760" strokeOpacity=".1" strokeWidth=".5" />
          </pattern>
        </defs>
        <ellipse cx="450" cy="276" rx="320" ry="52" fill="url(#ground)" />
        <g fill="none" stroke="#98a78d" opacity=".2">
          <ellipse cx="448" cy="278" rx="295" ry="31" />
          <ellipse cx="448" cy="278" rx="233" ry="24" />
          <ellipse cx="448" cy="278" rx="165" ry="16" />
        </g>
        <path
          d="M120 228C265 335 610 334 785 209"
          stroke="#9da996"
          strokeWidth=".8"
          strokeDasharray="3 5"
          fill="none"
        />
        <g
          className={'lens past-lens ' + (active === 'past' ? 'selected' : '')}
          onClick={() => onSelect('past')}
          style={{ cursor: 'pointer' }}
        >
          <ellipse
            cx="331"
            cy="163"
            rx="82"
            ry="119"
            transform="rotate(-26 331 163)"
            fill="url(#past-fill)"
            stroke="#a9b29e"
            strokeWidth="1"
          />
          <ellipse
            cx="331"
            cy="163"
            rx="77"
            ry="115"
            transform="rotate(-26 331 163)"
            fill="url(#lines)"
            stroke="#f6f7ec"
            strokeWidth="2"
          />
          <ellipse
            cx="331"
            cy="163"
            rx="66"
            ry="107"
            transform="rotate(-26 331 163)"
            fill="none"
            stroke="#879e80"
            strokeOpacity=".23"
          />
          <path d="M263 114C319 69 370 118 393 202" fill="none" stroke="#fff" strokeOpacity=".5" />
        </g>
        <g
          className={'lens future-lens ' + (active === 'future' ? 'selected' : '')}
          onClick={() => onSelect('future')}
          style={{ cursor: 'pointer' }}
        >
          <ellipse
            cx="568"
            cy="163"
            rx="83"
            ry="120"
            transform="rotate(26 568 163)"
            fill="url(#future-fill)"
            stroke="#9ab29b"
            strokeDasharray="3 4"
          />
          <ellipse
            cx="568"
            cy="163"
            rx="77"
            ry="114"
            transform="rotate(26 568 163)"
            fill="none"
            stroke="#f9fcf5"
            strokeWidth="2"
          />
          <ellipse
            cx="568"
            cy="163"
            rx="66"
            ry="107"
            transform="rotate(26 568 163)"
            fill="none"
            stroke="#a4b89a"
            strokeOpacity=".35"
          />
          <path
            d="M510 220Q532 142 608 114M510 220Q564 176 644 171M510 220Q555 216 621 232"
            stroke="#839f84"
            strokeWidth=".8"
            strokeOpacity=".4"
            fill="none"
          />
          <g fill="#7e997e">
            <circle cx="608" cy="114" r="2" />
            <circle cx="644" cy="171" r="2" />
            <circle cx="621" cy="232" r="2" />
          </g>
        </g>
        <g
          className="lens present-lens"
          onClick={() => onSelect('present')}
          style={{ cursor: 'pointer' }}
        >
          <ellipse
            cx="449"
            cy="164"
            rx="81"
            ry="133"
            fill="url(#present-fill)"
            stroke="#708a68"
            strokeWidth="1.2"
          />
          <ellipse
            cx="449"
            cy="164"
            rx="76"
            ry="127"
            fill="url(#shine)"
            stroke="#fff"
            strokeWidth="2.5"
          />
          <ellipse
            cx="449"
            cy="164"
            rx="70"
            ry="122"
            fill="none"
            stroke="#96ac89"
            strokeOpacity=".25"
          />
          <path
            d="M403 76Q464 66 478 137T477 243"
            stroke="#fff"
            strokeOpacity=".75"
            strokeWidth="10"
            filter="url(#blur)"
            fill="none"
          />
          <path
            d="M449 109V200M439 191L449 202L459 191"
            fill="none"
            stroke="#496b4e"
            strokeWidth=".8"
            strokeOpacity=".3"
          />
          <circle cx="449" cy="163" r="5" fill="#426c51" />
          <circle cx="449" cy="163" r="11" stroke="#496b4e" strokeOpacity=".25" fill="none" />
        </g>
        <g stroke="#96a38d" strokeWidth=".75" fill="none">
          <path d="M259 174H174V155" />
          <path d="M642 174H729V155" />
          <path d="M449 298V318" />
        </g>
        <g fill="#65785f" fontSize="10" fontFamily="sans-serif" letterSpacing="2">
          <text x="134" y="140">
            MEMORY
          </text>
          <text x="696" y="140">
            POSSIBILITY
          </text>
          <text x="463" y="319">
            YOU ARE HERE
          </text>
        </g>
        <g fill="#627e5d">
          <circle cx="259" cy="174" r="2" />
          <circle cx="642" cy="174" r="2" />
        </g>
      </svg>
      <div className="mirror-labels">
        <button onClick={() => onSelect('past')}>
          <span>01 / PAST</span>
          <strong>
            过去的我 <ArrowUpRight size={13} />
          </strong>
          <small>{empty ? '那些让你成为你的经历' : '从真实经历，看见重复的线索'}</small>
        </button>
        <button className="current" onClick={() => onSelect('present')}>
          <span>
            02 / PRESENT <i />
          </span>
          <strong>
            现在的我 <ArrowUpRight size={13} />
          </strong>
          <small>唯一能够改变轨迹的时刻</small>
        </button>
        <button onClick={() => onSelect('future')}>
          <span>03 / FUTURE</span>
          <strong>
            未来的我 <ArrowUpRight size={13} />
          </strong>
          <small>尚未发生，也尚未注定</small>
        </button>
      </div>
    </div>
  );
}

export function ModalShell({
  title,
  onClose,
  children,
  busy = false,
  drawer = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
      if (e.key === 'Tab') {
        const els = [
          ...ref.current!.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]',
          ),
        ];
        if (!els.length) {
          e.preventDefault();
          return;
        }
        const first = els[0],
          last = els.at(-1)!;
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', listener);
      previous?.focus();
    };
  }, [busy, onClose]);
  return (
    <div
      className={'modal-backdrop ' + (drawer ? 'drawer-backdrop' : '')}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className={'modal ' + (drawer ? 'drawer' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">THREEFOLD MIRROR</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" aria-label="关闭窗口" disabled={busy} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
