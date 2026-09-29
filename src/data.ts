import { Compass, Feather, GitBranch, History, Orbit, Sparkles } from 'lucide-react';
import { type Provenance } from '../shared/schema';

export type Page = 'mirror' | 'present' | 'past' | 'future' | 'decisions' | 'journal';
export type Modal = 'connect' | 'checkin' | 'settings' | null;
export const NAV: { id: Page; label: string; sub: string; icon: typeof Orbit }[] = [
  { id: 'mirror', label: '三世镜', sub: 'THE MIRROR', icon: Orbit },
  { id: 'present', label: '现在的我', sub: 'PRESENT STATE', icon: Compass },
  { id: 'past', label: '过去的轨迹', sub: 'PAST PATTERNS', icon: History },
  { id: 'future', label: '未来的回声', sub: 'FUTURE SELF', icon: Sparkles },
  { id: 'decisions', label: '决策镜', sub: 'DECISION MIRROR', icon: GitBranch },
  { id: 'journal', label: '此刻的记录', sub: 'CHECK-IN', icon: Feather },
];
export const KIND: Record<Provenance, string> = {
  fact: '事实',
  self_report: '用户自述',
  inference: '模型推断',
  hypothesis: '未来假设',
};
export const CONF = { low: '低置信度', medium: '中等置信度', high: '高置信度', unknown: '待补充' };
export const date = (s: string) =>
  s ? new Date(s).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) : '日期未标注';
export const fullDate = (s: string) => new Date(s).toLocaleString('zh-CN', { hour12: false });
export async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(
    '/api' + url,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '请求失败');
  return result;
}
