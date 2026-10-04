# Bootstrap payloads

Merge these fields into the common [record template](record.md) **in a private draft directory**. Replace placeholders using actual testimony; never fabricate a calibration or consume this list as a questionnaire. The CLI `ask`, `answer`, `capture` and `import-prior` cover common inputs; `append --file` validates complete Markdown records.

## Life Fragment

```yaml
type: life_fragment
authored_by: user
epistemic_status: self_report
statement: REPLACE_ACTUAL_USER_WORDS
occurred_at: null
fragment_kind: consumption # interview_answer | event | observation | state_evidence | interest_signal | decision_context | consumption
question: null # full Interview link required only for interview_answer
```

Keep unknown occurrence/source dates null. An interview answer is current testimony, not proof that a historical event occurred today. The Markdown body repeats statement verbatim.

## Interview turn

```yaml
type: interview_turn
authored_by: agent
question: REPLACE_ONE_QUESTION
reason: REPLACE_STAGE_BROAD_OR_DEEP_GAP_BASIS_AND_COGNITIVE_LOAD
focus: resources
gap: unknown # contradiction | low_confidence
based_on: [] # subsequent question must include latest answer's full link
```

Use reason for a concise decision note: stage, Broad/Deep, why this uncertainty or blind spot matters now, evidence limitations and question abstraction. This is not a schema or a fixed scoring formula. Put exactly one intent in question; multiple requests with one question mark are still multiple questions. Actual unknown/difficult/skip responses use normal interview_answer records and allow the next question; do not manufacture a response for silence. Keep private Human Map notes with the private instance if needed for resuming.

## Prior Self Knowledge

```yaml
type: prior_self_knowledge
authored_by: agent
epistemic_status: derived
source_label: REPLACE_USER_PROVIDED_PROVENANCE
import_method: user_provided
statement: REPLACE_SUPPLIED_SUMMARY_VERBATIM
confidence: low
supersedes: null
correction: null
update_reason: initial
```

Original source dates may be unknown. `created_at` is import time, not evidence date. `evidence` and `counter_evidence` are empty for an imported derived model. When revising, preserve the old record and use a new ID. State/Pattern can use `prior_refs: ['[[ThreefoldMirror/PriorKnowledge/ID]]']`, only with inference/hypothesis, low/unknown confidence and temporary validity; never manufacture primary evidence from the prior.

## Self Model v0.1

```yaml
type: self_model
version: '0.1'
summary: REPLACE_READABLE_PROVISIONAL_UNDERSTANDING
readiness_reason: REPLACE_WHY_THIS_LIMITED_MODEL_IS_USEFUL_NOW
assertion_refs: [] # all current State/Pattern refs, at least one
prior_refs: [] # any reviewed prior models
calibration_focus: ['[[ThreefoldMirror/States/REPLACE_KEY_CLAIM_ID]]'] # nonempty subset of the refs above; omission means all refs
unknowns: [REPLACE_EXPLICIT_UNKNOWN]
contradictions: [] # explicitly describe any contradiction below
coverage:
  - {domain: identity, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: current_situation, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: values, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: important_history, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: motivations, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: decision_style, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: constraints, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: relationships, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: body_energy, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: work_vocation, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: knowledge_skills, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: resources, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: current_goals, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: recurring_patterns, status: unknown, explanation: REPLACE_GAP, refs: []}
  - {domain: desired_future, status: unknown, explanation: REPLACE_GAP, refs: []}
```

Replace statuses with known/uncertain/contradictory/unknown where warranted. Known coverage links its reviewed assertions/priors. Explain current claims, their direct evidence or derived basis, confidence and uncertainty by reading the linked State/Pattern. The Markdown body must include summary; make that reviewable by the user.

Choose focus before calibration: usually 2–4 high-impact judgments, or only one when that is all the evidence supports. This is no minimum count and never permission to invent claims. All current assertions remain in assertion_refs even when outside focus. Mark unreviewed items as provisional. The coverage array is a storage index, not an interview checklist.

Use this human-readable summary outline selectively; merge unsupported areas into Unknowns instead of filling every heading:

| View | Include only what is supported |
| --- | --- |
| Present Reality / Current Trajectory | Recent life and what is changing, with time ranges |
| Known / Self-reports | Verified facts separated from what the user reports, including oral behavior accounts |
| Likely Patterns / Working Hypotheses | Few, scoped, testable explanations; evidence, alternatives, counter-evidence |
| Developmental Transition | The local change process, or unknown; no development level |
| Knowledge / Experience / Skill Gaps | What is understood, what was tried, what is repeatably doable; each separately grounded |
| Channels | Onset/intensity/costs where known; temporary, not a stable interest |
| Regression Risks | Previously supported ability, pressure conditions and present limits |
| Cross-domain Dynamics / Core Tension | Supported connections; distinguish co-occurrence from causal hypotheses |
| Unknowns / Contradictions | Missing or declined areas, unresolved verification and competing accounts |

Attach a compact evidence-quality note to important State/Pattern bodies: evidence types, independence, time/context diversity, contrary evidence and test/unknowns. Several answers in one session do not become independent sources. Use State keys for scoped knowledge, experience, skill, channel or transition; Pattern already carries alternative_explanations and test_against for regression/dynamics/tension. A name is not evidence. No new entity is needed.

## Calibration

```yaml
type: calibration
authored_by: user
epistemic_status: self_report
model: '[[ThreefoldMirror/SelfModels/REPLACE_ID]]'
feedback:
  - target: '[[ThreefoldMirror/States/REPLACE_ID]]'
    response: correct # wrong | partially_correct | outdated | not_sure
    statement: REPLACE_ACTUAL_FEEDBACK
    correction: null # REQUIRED preceding Correction for every non-correct response
```

Save one or more actually received responses, each target once per record, and repeat each statement in Markdown. Additional calibration records for the same model preserve later responses. Never infer acceptance from silence. Append any Correction immediately before waiting for other feedback. Corrected revisions remain separate immutable records. Accumulated feedback must cover calibration_focus to become ready; a legacy model without focus still requires all reviewed references. Wrong/partial/outdated/not_sure responses require preceding Correction; not_sure remains unresolved. Unselected assertions can be reviewed later and are never auto-confirmed. Do not use an old calibration record to revive a withdrawn claim.
