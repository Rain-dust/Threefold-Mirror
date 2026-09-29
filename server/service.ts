import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  modelSchema,
  decisionSchema,
  checkinSchema,
  decisionInputSchema,
  type Config,
  type SelfModel,
  type Decision,
} from '../shared/schema.js';
import {
  scanVault,
  validateVault,
  readRecords,
  writeRecord,
  uid,
  now,
  safePath,
  hash,
} from './vault.js';
import { buildOfflineModel, simulateOffline, stateChanges } from './engine.js';
import { getProvider, validateEndpoint } from './provider.js';
import { seedDemo } from './demo.js';

const configSchema = z.object({
  vault: z.string().nullable(),
  demo: z.boolean(),
  ignored: z.array(z.string()),
  provider: z.object({
    mode: z.enum(['offline', 'compatible']),
    baseUrl: z.string(),
    model: z.string(),
    remoteConsent: z.boolean(),
  }),
});
const defaults: Config = {
  vault: null,
  demo: false,
  ignored: [],
  provider: {
    mode: 'offline',
    baseUrl: 'http://localhost:11434/v1',
    model: '',
    remoteConsent: false,
  },
};
export class MirrorService {
  config: Config = structuredClone(defaults);
  model: SelfModel | null = null;
  decisions: Decision[] = [];
  warnings: string[] = [];
  constructor(readonly localDir: string) {}
  async init() {
    await fs.mkdir(this.localDir, { recursive: true });
    try {
      this.config = configSchema.parse(
        JSON.parse(await fs.readFile(path.join(this.localDir, 'config.json'), 'utf8')),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
        this.warnings.push('本地连接配置损坏，已回到未连接状态；Vault 文件未修改。');
    }
    if (this.config.vault) {
      try {
        await validateVault(this.config.vault);
        await this.loadRecords();
      } catch (e) {
        this.warnings.push(`无法恢复 Vault：${(e as Error).message}`);
        this.config.vault = null;
      }
    }
  }
  async saveConfig() {
    const file = path.join(this.localDir, 'config.json');
    await fs.writeFile(file + '.tmp', JSON.stringify(this.config, null, 2), 'utf8');
    await fs.rename(file + '.tmp', file);
  }
  requireVault() {
    if (!this.config.vault) throw new Error('请先连接 Vault 或打开示例');
    return this.config.vault;
  }
  async loadRecords() {
    const vault = this.requireVault();
    this.model = null;
    this.decisions = [];
    for (const item of await readRecords(vault, 'Models')) {
      const result = modelSchema.safeParse(item.data.model);
      if (result.success) {
        this.model = result.data;
        break;
      }
      this.warnings.push(`跳过损坏的模型快照：${item.path}`);
    }
    const seen = new Set<string>();
    for (const item of await readRecords(vault, 'Decisions')) {
      const result = decisionSchema.safeParse(item.data.decision);
      if (result.success && !seen.has(result.data.id)) {
        seen.add(result.data.id);
        this.decisions.push(result.data);
      } else if (!result.success) this.warnings.push(`跳过损坏的决策：${item.path}`);
    }
    // Human-authored events are authoritative even if the process stopped before writing a decision revision.
    const interventions = await readRecords(vault, 'Interventions');
    const reflections = await readRecords(vault, 'Reflections');
    for (const d of this.decisions) {
      const action = interventions.find(
        (r) => r.data.decision_id === d.id && r.data.generated_by === 'user',
      );
      if (action && d.status === 'open') {
        const value = z
          .object({ branch_id: z.string(), action: z.string(), created_at: z.string() })
          .safeParse(action.data);
        if (value.success && d.branches.some((b) => b.id === value.data.branch_id)) {
          d.intervention = value.data;
          d.status = 'acting';
          d.updated_at = value.data.created_at;
        }
      }
      const reflection = reflections.find(
        (r) => r.data.decision_id === d.id && r.data.generated_by === 'user',
      );
      if (reflection && d.status === 'acting') {
        const value = z
          .object({
            outcome: z.string(),
            reflection: z.string(),
            changed_by_prediction: z.boolean(),
            created_at: z.string(),
          })
          .safeParse(reflection.data);
        if (value.success) {
          d.outcome = {
            text: value.data.outcome,
            created_at: value.data.created_at,
            kind: 'self_report',
          };
          d.reflection = {
            text: value.data.reflection,
            changed_by_prediction: value.data.changed_by_prediction,
            created_at: value.data.created_at,
            kind: 'self_report',
          };
          d.status = 'reflected';
          d.updated_at = value.data.created_at;
        }
      }
    }
    this.decisions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async state() {
    let stale = false;
    const warnings = [...this.warnings];
    if (this.config.vault) {
      try {
        stale =
          (await scanVault(this.config.vault, this.config.ignored)).fingerprint !==
          this.model?.source_hash;
      } catch (e) {
        stale = true;
        warnings.push((e as Error).message);
      }
    }
    return {
      config: this.config,
      model: this.model,
      decisions: this.decisions,
      connected: !!this.config.vault,
      stale,
      provider: getProvider(this.config).name,
      warnings,
    };
  }
  async preview(input: unknown) {
    const data = z
      .object({ path: z.string().min(1), ignored: z.array(z.string()).default([]) })
      .parse(input);
    const vault = await validateVault(data.path);
    const result = await scanVault(vault, data.ignored);
    return {
      path: vault,
      count: result.notes.length,
      notes: result.notes.slice(0, 40).map((n) => ({ path: n.path, title: n.title, date: n.date })),
      warnings: result.warnings,
    };
  }
  async connect(input: unknown) {
    const data = z
      .object({
        path: z.string().optional(),
        demo: z.boolean().default(false),
        ignored: z.array(z.string()).default([]),
      })
      .parse(input);
    const vault = data.demo
      ? path.join(this.localDir, 'demo-vault')
      : await validateVault(data.path || '');
    if (data.demo) await seedDemo(vault);
    await scanVault(vault, data.ignored);
    this.config = {
      ...this.config,
      vault,
      demo: data.demo,
      ignored: data.ignored,
      provider: { ...this.config.provider, mode: 'offline', remoteConsent: false },
    };
    await this.saveConfig();
    await this.loadRecords();
    await this.rebuild();
    return this.state();
  }
  async rebuild() {
    const vault = this.requireVault();
    const { notes, fingerprint, warnings } = await scanVault(vault, this.config.ignored);
    const baseline = buildOfflineModel(notes, fingerprint, this.model, warnings);
    const model = modelSchema.parse(await getProvider(this.config).model(baseline));
    model.changes = stateChanges(model.claims, this.model);
    await writeRecord(
      vault,
      'Models',
      model.id,
      {
        type: 'temporal_self_model',
        source: 'vault',
        created_at: model.created_at,
        updated_at: model.created_at,
        confidence: 'low',
        evidence: model.evidence.map((e) => e.id),
        status: 'active',
        generated_by: model.generated_by,
        model,
      },
      `# 时间自我模型\n\n生成于 ${model.created_at}。所有判断请结合来源核对。\n\n## 现在\n\n${model.claims
        .map(
          (c) =>
            `### ${c.label}\n\n${c.value}\n\n${c.detail}\n\n类型：${c.kind}；置信度：${c.confidence}\n\n${c.evidence
              .map((id) => {
                const e = model.evidence.find((e) => e.id === id)!;
                return `- [[${e.path.replace(/\.md$/, '')}]] · 第 ${e.line} 行：${e.quote}`;
              })
              .join('\n')}`,
        )
        .join(
          '\n\n',
        )}\n\n## 过去的线索\n\n${model.patterns.map((p) => `### ${p.title}\n\n${p.description}`).join('\n\n')}\n\n## 未来假设\n\n${model.future.narrative}\n\n${model.future.voice}`,
    );
    this.model = model;
    return this.state();
  }
  async checkin(input: unknown) {
    const data = checkinSchema.parse(input);
    const id = uid('checkin');
    const labels = { low: '偏低', medium: '一般', high: '充足' };
    const text = [
      data.text,
      data.energy ? `当前精力${labels[data.energy]}。` : '',
      data.focus ? `当前专注${labels[data.focus]}。` : '',
      data.sleep !== undefined ? `最近睡眠${data.sleep}小时。` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    const file = await writeRecord(
      this.requireVault(),
      'Checkins',
      id,
      {
        id,
        type: 'checkin',
        title: '此刻的记录',
        kind: 'self_report',
        source: 'user',
        generated_by: 'user',
        created_at: now(),
        updated_at: now(),
        date: now().slice(0, 10),
        confidence: 'unknown',
        evidence: [],
        status: 'recorded',
        ...data,
      },
      `# 此刻的记录\n\n${text}`,
    );
    try {
      await this.rebuild();
      return { ...(await this.state()), saved: file };
    } catch (e) {
      return {
        ...(await this.state()),
        saved: file,
        notice: `记录已保存，建模未完成：${(e as Error).message}`,
      };
    }
  }
  async decide(input: unknown) {
    const data = decisionInputSchema.parse(input);
    if (!this.model) throw new Error('请先建立当前状态模型');
    const current = await scanVault(this.requireVault(), this.config.ignored);
    if (current.fingerprint !== this.model.source_hash)
      throw new Error('资料已有变化，请先更新三世镜再推演');
    const baseline = simulateOffline(this.model, data);
    const decision = decisionSchema.parse(
      await getProvider(this.config).decision(baseline, this.model),
    );
    await this.persistDecision(decision);
    this.decisions.unshift(decision);
    return { ...(await this.state()), decisionId: decision.id };
  }
  async persistDecision(d: Decision) {
    await writeRecord(
      this.requireVault(),
      'Decisions',
      uid('revision'),
      {
        type: 'decision',
        source: d.model_id,
        created_at: d.created_at,
        updated_at: d.updated_at,
        confidence: 'low',
        evidence: d.evidence,
        generated_by: d.generated_by,
        status: d.status,
        decision: d,
      },
      `# ${d.title}\n\n${d.context}\n\n## 过去的依据\n\n${d.past}\n\n## 现在的状态\n\n${d.present}\n\n## 未来分支（Prediction / hypothesis）\n\n${d.branches.map((b) => `### ${b.label}\n\n${b.horizons.map((h) => `**${h.months} 个月**：${h.description}`).join('\n\n')}\n\n提醒：${b.voice}\n\n假设：${b.assumptions.join('；')}\n\n风险：${b.risks.join('；')}\n\n不确定性：${b.uncertainties.join('；')}`).join('\n\n')}\n\n## Intervention / 行动\n\n${d.intervention?.action || '尚未行动'}\n\n## Outcome / 真实结果（用户自述）\n\n${d.outcome?.text || '等待现实发生'}\n\n## Reflection / 复盘（用户自述）\n\n${d.reflection?.text || '尚未复盘'}\n\n预测是否改变行动：${d.reflection ? (d.reflection.changed_by_prediction ? '是' : '否') : '未知'}`,
    );
  }
  async act(id: string, input: unknown) {
    const data = z
      .object({ branch_id: z.string(), action: z.string().trim().min(3).max(3000) })
      .parse(input);
    const original = this.decisions.find((d) => d.id === id);
    if (!original || original.status !== 'open') throw new Error('只能为尚未行动的决策选择分支');
    if (!original.branches.some((b) => b.id === data.branch_id)) throw new Error('分支不存在');
    const time = now();
    const record = await writeRecord(
      this.requireVault(),
      'Interventions',
      uid('intervention'),
      {
        title: `行动计划：${original.title}`,
        type: 'intervention',
        decision_id: id,
        kind: 'self_report',
        source: 'user',
        generated_by: 'user',
        created_at: time,
        updated_at: time,
        date: time.slice(0, 10),
        confidence: 'unknown',
        evidence: [],
        status: 'planned',
        ...data,
      },
      `# 行动计划（尚未验证）\n\n面对「${original.title}」，我决定选择「${original.branches.find((b) => b.id === data.branch_id)!.label}」。\n\n行动计划：${data.action}`,
    );
    const next: Decision = {
      ...original,
      updated_at: time,
      status: 'acting',
      intervention: { ...data, created_at: time },
    };
    try {
      await this.persistDecision(next);
    } catch {
      this.warnings.push('行动原文已保存；决策修订快照写入失败，可从用户事件恢复。');
    }
    this.decisions = this.decisions.map((d) => (d.id === id ? next : d));
    try {
      await this.rebuild();
      return { ...(await this.state()), saved: record };
    } catch (e) {
      return {
        ...(await this.state()),
        saved: record,
        notice: `行动已保存，建模未完成：${(e as Error).message}`,
      };
    }
  }
  async reflect(id: string, input: unknown) {
    const data = z
      .object({
        outcome: z.string().trim().min(3).max(5000),
        reflection: z.string().trim().min(3).max(5000),
        changed_by_prediction: z.boolean(),
      })
      .parse(input);
    const original = this.decisions.find((d) => d.id === id);
    if (!original || original.status !== 'acting')
      throw new Error('请先选择分支并记录行动，再复盘结果');
    const time = now();
    // The human-authored reflection is the authoritative outcome record. Recovery is safe if later modeling fails.
    const record = await writeRecord(
      this.requireVault(),
      'Reflections',
      uid('reflection'),
      {
        title: `决策复盘：${original.title}`,
        type: 'reflection',
        decision_id: id,
        kind: 'self_report',
        source: 'user',
        generated_by: 'user',
        created_at: time,
        updated_at: time,
        date: time.slice(0, 10),
        confidence: 'unknown',
        evidence: [],
        status: 'recorded',
        ...data,
      },
      `# 决策复盘\n\n决策：${original.title}\n\n真实结果：${data.outcome}\n\n反思与变化：${data.reflection}\n\n预测是否改变了我的行动：${data.changed_by_prediction ? '是' : '否'}`,
    );
    const next: Decision = {
      ...original,
      updated_at: time,
      status: 'reflected',
      outcome: { text: data.outcome, created_at: time, kind: 'self_report' },
      reflection: {
        text: data.reflection,
        changed_by_prediction: data.changed_by_prediction,
        created_at: time,
        kind: 'self_report',
      },
    };
    try {
      await this.persistDecision(next);
    } catch {
      this.warnings.push('复盘原文已保存；决策修订快照写入失败，可从用户事件恢复。');
    }
    this.decisions = this.decisions.map((d) => (d.id === id ? next : d));
    try {
      await this.rebuild();
      return { ...(await this.state()), saved: record };
    } catch (e) {
      return {
        ...(await this.state()),
        saved: record,
        notice: `复盘已保存，建模未完成：${(e as Error).message}`,
      };
    }
  }
  async settings(input: unknown) {
    const provider = configSchema.shape.provider.parse(input);
    if (provider.mode === 'compatible') {
      validateEndpoint(provider.baseUrl, provider.remoteConsent);
      if (!provider.model.trim()) throw new Error('请填写模型名称');
    }
    this.config.provider = provider;
    await this.saveConfig();
    return this.state();
  }
  async evidence(id: string) {
    const e = [
      ...(this.model?.evidence || []),
      ...this.decisions.flatMap((d) => d.evidence_snapshot),
    ].find((e) => e.id === id);
    if (!e) throw new Error('证据不存在');
    const file = await safePath(this.requireVault(), e.path);
    try {
      if ((await fs.stat(file)).size > 512000)
        return {
          ...e,
          changed: true,
          missing: false,
          excerpt: '原文件现已超过读取限制，请在 Obsidian 中查看。',
        };
      const raw = await fs.readFile(file, 'utf8');
      const lines = raw.split(/\r?\n/);
      return {
        ...e,
        changed: hash(raw) !== e.hash,
        missing: false,
        excerpt: lines
          .slice(Math.max(0, e.line - 3), e.line + 3)
          .map((line, i) => `${Math.max(1, e.line - 2) + i}  ${line}`)
          .join('\n'),
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT')
        return { ...e, changed: true, missing: true, excerpt: '' };
      throw err;
    }
  }
}
