# Evidence and epistemic protocol

A prior interpretation may supply a question, never independent corroboration.

| Status | Meaning | Example |
| --- | --- | --- |
| fact | Reliable evidence establishes a narrow fact. | A dated release record confirms a release date. |
| self_report | The user explicitly reported it. | “我最近精力偏低。” |
| observation | Multiple records exhibit a pattern without causality. | Three project periods coincide with shorter reported sleep. |
| inference | An explanation supported by evidence and alternatives. | Available time may constrain sustainable project scope. |
| hypothesis | A provisional, testable claim. | Interest might fall when technical novelty disappears. |

A diary entry is not independent verification of everything it says. A self-report can be credible while its causal explanation remains uncertain. `unknown / low / medium / high` describe confidence in a claim, never measured personality intensity. Citation count does not mechanically produce high confidence.

Use `cite` after reading full context. Each citation has a full-path wikilink, exact complete body line(s), one-based original line range, complete-file SHA-256 and source period. The resolver accepts full paths, unambiguous basenames, headings and block IDs; generated citations use full paths.

Validation checks existence, ambiguity, hash, quote/lines and temporal ordering. It cannot prove a quote entails a claim. Inspect negation, qualifications, adjacent sentences, alternative causes and counterexamples. If a source is edited/renamed, retain the historical citation and append a freshly grounded revision. Do not just replace old hashes. Quotes remain available in historical records even if original sources later disappear.

Default citation periods use the note date. If text clearly describes a broader period, identify and explain it; don't invent dates. Undated evidence can provide background, but a known current State also needs dated support. Unknown State uses `value: null`, `confidence: unknown` and no invented evidence.

Primary evidence: original notes and actual user Event/Outcome/Correction testimony. Outside notes explicitly marked `authored_by: agent` or `generated_by: agent`/`ai` are excluded. Unmarked notes still need Agent inspection; the filesystem cannot prove authorship.

Context only: AI State, Pattern, Simulation, Decision and Reflection. Structural links preserve the reasoning graph; the validator rejects them as primary citations. A lesson updating a State must cite actual Outcome/original notes. A choice establishes what was chosen, not that the action was completed. A Correction establishes disagreement, not necessarily a new causal fact.

Attach evidence, available counter-evidence, time ranges and related Decision/Outcome references to important claims. Multiple quotes from one document are not independent sources. Distinguish correlated events from a causal explanation.

If sources are absent, conflicting or not comparable, say **Insufficient historical evidence**. Retrieval is lexical candidate search: use multiple terms, synonyms and linked records before treating absence as meaningful. Disclose search scope and skipped files. Unknown is a valid output.
