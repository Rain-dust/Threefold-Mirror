# Record schema v1

`record.schema.json` is the portable JSON Schema for YAML frontmatter, exported by `npm run schema`. `core/schema.ts` is the source. Unknown fields and versions are rejected. [Data contract](../references/data-contract.md) and [temporal model](../references/temporal-model.md) define cross-record meaning.

| Record | Additional fields |
| --- | --- |
| Event | event_kind, occurred_at, statement, epistemic_status, decision, simulation, option_id, action, review_on, influenced_by_simulation |
| State | key, claim, value, unit, trend and assertion lifecycle fields |
| Pattern | key, claim, alternative_explanations, test_against and assertion lifecycle fields |
| Decision | question, context, constraints, resources, options, review_on |
| Simulation | mode, epistemic_status, decision, model_as_of, model_fingerprint, state_refs, pattern_refs, branches, cross_temporal_reflection |
| Outcome | decision, choice, simulation, occurred_at, statement, epistemic_status, interventions, influenced_by_simulation |
| Reflection | decision, simulation, outcome, epistemic_status, confidence, comparison, lessons, intervention_analysis, prediction_assessment, proposed_updates |
| Correction | target, statement, reason, epistemic_status; authored_by must be user |

Common fields: schema_version, id, type, title, created_at, authored_by, data_origin, evidence, counter_evidence, source_period.

Assertion lifecycle fields: epistemic_status, confidence, temporal_scale, valid_from, review_after, expires_at, supersedes, update_reason, correction. State and Pattern have immutable revision chains. Pattern always includes alternatives and a question for testing it.

Evidence fields: source locator, optional source_id (absent only for internal Memory wikilinks), sha256, line_start, line_end, quote, source_period (from/to, null only when unknown). Obtain actual citations with `cite`; never fill invented hashes.

Branch fields: option_id, assumptions, evidence, historical_analogues (evidence, similarity, differences), historical_evidence_status, horizons (months, expected_changes, uncertainty), risks, opportunities, unknowns, confidence, future_reflection. At least two branches cover exactly the Decision's distinct options. An empty analogue list requires insufficient status. Evidence-free branches require unknown confidence. Each significant claim must be semantically justified by the Agent.

Machine checks include exact quotes/hashes, chronology, direct primary evidence, matching Decision/choice/Outcome links, correction targets, competing successors, state review/expiry, increasing uncertainty and current model fingerprint. Structural validation cannot authenticate user statements or prove causality. Keep those boundaries explicit.

## Bootstrap records and grants

| Record | Additional fields |
| --- | --- |
| Life Fragment | fragment_kind, actual statement, occurred_at (nullable), question (only interview_answer), self_report |
| Interview Turn | one question, reason, focus, gap, based_on; subsequent questions link the latest answer |
| Prior Self Knowledge | derived, source_label, user_provided import_method, preserved statement, low/unknown confidence, supersedes/correction/update_reason |
| Self Model | version 0.1, summary, assertion_refs, prior_refs, optional calibration_focus, readiness_reason, all 15 coverage domains (unknown is valid), unknowns, contradictions |
| Calibration | user-authored self_report, model, one or more actual feedback items on reviewed claims/priors; non-correct responses link Corrections |

calibration_focus is a nonempty unique subset of reviewed refs; omitted means all refs for compatibility. Multiple Calibration records accumulate actual feedback on the latest Self Model's focus before ready. No item outside that focus is automatically confirmed. New models need new feedback. Structural validation does not prove interview quality or evidence entailment; Human Map, Broad/Deep and the five stages live in the Skill/Workflow.

Optional assertion prior_refs carry derived-model dependencies, not Evidence. See [bootstrap templates](../templates/bootstrap-payloads.md). source-grant.schema.json is generated from core/schema.ts and defines source_id, capabilities, scope, permission and consent. Concrete adapter configuration stays outside Core; only local_markdown is composed by the CLI.
