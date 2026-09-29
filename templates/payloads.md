# Type-specific frontmatter payloads

Merge one of these into [record.md](record.md). Values marked REPLACE are draft placeholders. All fields shown are required except where the schema explicitly says otherwise; nullable values remain explicit null.

## Event

```yaml
type: event
authored_by: user
event_kind: experience # experience | choice | intervention
occurred_at: REPLACE_DATE
epistemic_status: self_report
statement: REPLACE_ACTUAL_USER_WORDS
decision: null # required full-path link for choice/intervention
simulation: null # required for choice/intervention
option_id: null # a real Decision option, required for choice/intervention
action: null # required for choice/intervention
review_on: null # required for choice
influenced_by_simulation: unknown
```

## State

```yaml
type: state
key: body.energy
claim: REPLACE_SUPPORTED_CLAIM_OR_EXPLICIT_UNKNOWN
value: null
unit: null # numeric values require actual measured units
trend: unknown
epistemic_status: hypothesis
confidence: unknown
temporal_scale: short_term
valid_from: REPLACE_DATE
review_after: REPLACE_REVIEW_DATE
expires_at: REPLACE_EXPIRY_DATE
supersedes: null # use the current head when updating this key
update_reason: initial
correction: null
```

## Pattern

```yaml
type: pattern
key: projects.continuation
claim: REPLACE_EVIDENCE_BACKED_PATTERN
epistemic_status: hypothesis
confidence: low
temporal_scale: medium_term
valid_from: REPLACE_DATE
review_after: REPLACE_REVIEW_DATE
expires_at: REPLACE_EXPIRY_DATE
supersedes: null
update_reason: initial
correction: null
alternative_explanations:
  - REPLACE_PLAUSIBLE_ALTERNATIVE
test_against: REPLACE_FALSIFICATION_QUESTION
```

## Decision

```yaml
type: decision
question: REPLACE_REAL_QUESTION
context: REPLACE_CONTEXT
constraints: []
resources: []
options:
  - id: A
    label: REPLACE_OPTION_A
  - id: B
    label: REPLACE_OPTION_B
review_on: REPLACE_DATE
```

## Simulation

Read the model at the exact intended creation instant, which must be later than the latest record. Copy the fingerprint and all current refs. Prepare one branch per Decision option; the block below shows one branch shape and must be duplicated and filled for the other actual options.

```yaml
type: simulation
epistemic_status: hypothesis
mode: conditional
decision: '[[ThreefoldMirror/Decisions/REPLACE_ID]]'
model_as_of: REPLACE_SAME_INSTANT_AS_CREATED_AT
model_fingerprint: REPLACE_ACTUAL_MODEL_FINGERPRINT
state_refs: []
pattern_refs: []
branches:
  - option_id: A
    assumptions: [REPLACE_ASSUMPTION]
    evidence: [] # insert actual primary citations
    historical_analogues: [] # or evidence + similarity + differences per analogue
    historical_evidence_status: insufficient
    horizons:
      - months: 1
        expected_changes: [REPLACE_CONDITIONAL_CHANGE]
        uncertainty: high
      - months: 3
        expected_changes: [REPLACE_CONDITIONAL_CHANGE]
        uncertainty: very_high
      - months: 12
        expected_changes: [REPLACE_CONDITIONAL_CHANGE]
        uncertainty: unknown
    risks: [REPLACE_RISK]
    opportunities: [REPLACE_OPPORTUNITY]
    unknowns: [REPLACE_UNKNOWN]
    confidence: unknown
    future_reflection: REPLACE_NONAUTHORITATIVE_REFLECTION
cross_temporal_reflection: REPLACE_PAST_PRESENT_FUTURE_COMPARISON
```

## Outcome

```yaml
type: outcome
authored_by: user
decision: '[[ThreefoldMirror/Decisions/REPLACE_ID]]'
choice: '[[ThreefoldMirror/Events/REPLACE_CHOICE_ID]]'
simulation: '[[ThreefoldMirror/Simulations/REPLACE_ID]]'
occurred_at: REPLACE_ACTUAL_DATE
statement: REPLACE_ACTUAL_USER_REPORT
epistemic_status: self_report
interventions: []
influenced_by_simulation: unknown
```

## Reflection

```yaml
type: reflection
decision: '[[ThreefoldMirror/Decisions/REPLACE_ID]]'
simulation: '[[ThreefoldMirror/Simulations/REPLACE_ID]]'
outcome: '[[ThreefoldMirror/Outcomes/REPLACE_ID]]'
epistemic_status: inference
confidence: low
comparison: REPLACE_EXPECTED_VS_OBSERVED
lessons:
  - claim: REPLACE_TENTATIVE_LESSON
    epistemic_status: hypothesis
    confidence: low
    evidence: [] # at least one actual primary citation required
    counter_evidence: []
    alternative_explanations: [REPLACE_ALTERNATIVE]
intervention_analysis: REPLACE_INFLUENCE_AND_LIMITS
prediction_assessment: not_assessable
proposed_updates: []
```

## Correction

```yaml
type: correction
authored_by: user
epistemic_status: self_report
target: '[[ThreefoldMirror/States/REPLACE_ID]]' # or Patterns
statement: REPLACE_ACTUAL_USER_CORRECTION
reason: REPLACE_REASON
```
