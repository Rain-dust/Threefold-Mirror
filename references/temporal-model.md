# Minimal temporal Self Model

A model is a time-specific projection of State/Pattern revisions, not an identity definition. Create only dimensions justified by the question and evidence. The example uses `body.energy`, `resources.weekly_hours`, `values.usefulness`. Other keys can represent cognition, commitments, relationships, environment or skills without new entity types.

State includes key, claim, value (category, measured number, boolean or null), unit, trend, epistemic status, confidence, evidence and time bounds. Numeric values require units; no invented personality scores. Rising/falling/steady/mixed trends need comparison; otherwise use unknown.

| Scale | Interpretation | v1 conservative guardrail |
| --- | --- | --- |
| transient | Hours/days | Expire within 7 days |
| short_term | Days/weeks | Expire within 45 days |
| medium_term | Weeks/months | Expire within 180 days |
| long_term | Repeated longitudinal tendency | At least 2 independent dated sources over 90 days; review required |
| stable | Relatively objective information or explicit enduring self-report | Only fact/self_report; review required |

These are engineering guardrails, **not psychological validity thresholds**. Meeting them does not establish a trait. Hypothesis is epistemic status, independent of temporal scale. No automatic state-to-trait promotion. Values can change and be superseded.

Projection at `as_of`:

1. Only records written by that instant are visible; later knowledge does not rewrite an old model.
2. A visible successor makes its predecessor superseded. A Correction makes an unreplaced target corrected and removes it from the current model immediately.
3. Before valid_from it is not_yet_valid; on/after expires_at it is expired.
4. Missing/changed evidence makes it evidence_stale and excludes it until a grounded revision is appended.
5. On/after review_after it is decayed: effective confidence drops one ordinal level, while historical confidence stays unchanged. Flag this context as needing review.
6. Otherwise it is active. All previous assertions remain in history.

Expired/corrected/stale dimensions become unknowns, not default healthy states. Long-term assertions still need review. Expiry may be null for justified stable/long-term information; there is no automatic renewal.

One revision chain per type/key; new records explicitly supersede its current head. Competing successors fail. Strengthened requires higher confidence and new evidence; weakened requires lower confidence. Corrected requires a linked user Correction targeting the predecessor. Confidence can become unknown. Time alone never strengthens a claim.

Corrections commit separately so a crash before replacement cannot leave a known-wrong assertion current. Simulation stores exact State/Pattern links and the fingerprint at its creation instant. Appending requires a matching snapshot; later questions need new projections and simulations. Old simulations are never recomputed in place.
