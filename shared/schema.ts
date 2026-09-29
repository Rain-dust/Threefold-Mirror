import { z } from 'zod';

export const provenanceSchema = z.enum(['fact', 'self_report', 'inference', 'hypothesis']);
export type Provenance = z.infer<typeof provenanceSchema>;
export const evidenceSchema = z.object({
  id: z.string(),
  path: z.string(),
  line: z.number().int().positive(),
  quote: z.string(),
  hash: z.string(),
  date: z.string(),
  title: z.string(),
  kind: z.enum(['fact', 'self_report']),
  observed_at: z.string().optional(),
});
export type Evidence = z.infer<typeof evidenceSchema>;
export const claimSchema = z.object({
  id: z.string(),
  dimension: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  kind: provenanceSchema,
  confidence: z.enum(['low', 'medium', 'high', 'unknown']),
  trend: z.enum(['rising', 'falling', 'steady', 'unknown']),
  evidence: z.array(z.string()),
});
export type Claim = z.infer<typeof claimSchema>;
export const patternSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  kind: z.literal('inference'),
  confidence: z.enum(['low', 'medium', 'high']),
  evidence: z.array(z.string()),
  category: z.string(),
});
export type Pattern = z.infer<typeof patternSchema>;
export const futureSchema = z.object({
  title: z.string(),
  narrative: z.string(),
  voice: z.string(),
  assumptions: z.array(z.string()),
  risks: z.array(z.string()),
  uncertainties: z.array(z.string()),
  evidence: z.array(z.string()),
  confidence: z.enum(['low', 'medium']),
  kind: z.literal('hypothesis'),
});
export type Future = z.infer<typeof futureSchema>;
export const modelSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  source_hash: z.string(),
  generated_by: z.string(),
  note_count: z.number(),
  evidence: z.array(evidenceSchema),
  claims: z.array(claimSchema),
  patterns: z.array(patternSchema),
  future: futureSchema,
  tensions: z.array(z.string()),
  changes: z.array(z.string()),
  gaps: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type SelfModel = z.infer<typeof modelSchema>;
export const branchSchema = z.object({
  id: z.string(),
  label: z.string(),
  allocation: z.string(),
  horizons: z
    .array(
      z.object({
        months: z.union([z.literal(1), z.literal(3), z.literal(12)]),
        title: z.string(),
        description: z.string(),
      }),
    )
    .length(3),
  voice: z.string(),
  assumptions: z.array(z.string()),
  variables: z.array(z.string()),
  risks: z.array(z.string()),
  uncertainties: z.array(z.string()),
  evidence: z.array(z.string()),
  confidence: z.enum(['low', 'medium']),
  kind: z.literal('hypothesis'),
});
export type Branch = z.infer<typeof branchSchema>;
export const decisionSchema = z.object({
  id: z.string(),
  title: z.string(),
  context: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  model_id: z.string(),
  source_hash: z.string(),
  generated_by: z.string(),
  status: z.enum(['open', 'acting', 'reflected']),
  past: z.string(),
  present: z.string(),
  evidence: z.array(z.string()),
  evidence_snapshot: z.array(evidenceSchema),
  branches: z.array(branchSchema).min(2).max(4),
  intervention: z
    .object({ branch_id: z.string(), action: z.string(), created_at: z.string() })
    .nullable(),
  outcome: z
    .object({ text: z.string(), created_at: z.string(), kind: z.literal('self_report') })
    .nullable(),
  reflection: z
    .object({
      text: z.string(),
      changed_by_prediction: z.boolean(),
      created_at: z.string(),
      kind: z.literal('self_report'),
    })
    .nullable(),
});
export type Decision = z.infer<typeof decisionSchema>;
export interface Note {
  path: string;
  title: string;
  date: string;
  observed_at?: string;
  hash: string;
  body: string;
  raw: string;
  frontmatter: Record<string, unknown>;
  bodyLine: number;
}
export interface Config {
  vault: string | null;
  demo: boolean;
  ignored: string[];
  provider: {
    mode: 'offline' | 'compatible';
    baseUrl: string;
    model: string;
    remoteConsent: boolean;
  };
}
export interface AppState {
  config: Config;
  model: SelfModel | null;
  decisions: Decision[];
  connected: boolean;
  stale: boolean;
  provider: string;
  warnings: string[];
}
export const checkinSchema = z.object({
  text: z.string().trim().min(3).max(8000),
  energy: z.enum(['low', 'medium', 'high']).optional(),
  focus: z.enum(['low', 'medium', 'high']).optional(),
  sleep: z.number().min(0).max(24).optional(),
});
export const decisionInputSchema = z.object({
  title: z.string().trim().min(4).max(200),
  context: z.string().max(3000).default(''),
  options: z.array(z.string().trim().min(1).max(60)).min(2).max(4).optional(),
});
