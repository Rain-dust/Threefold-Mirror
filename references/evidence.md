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

Use `cite` after reading full context. Internal citations have a full-path Memory wikilink; external citations have a source ID and adapter-owned opaque locator. Both include exact complete body line(s), one-based original line range, complete-file SHA-256 and source period. The internal Markdown resolver accepts full paths, unambiguous basenames, headings and block IDs. External canonical references are resolved only by their explicitly authorized adapter.

Validation checks existence, ambiguity, hash, quote/lines and temporal ordering. It cannot prove a quote entails a claim. Inspect negation, qualifications, adjacent sentences, alternative causes and counterexamples. If a source is edited/renamed, retain the historical citation and append a freshly grounded revision. Do not just replace old hashes. Quotes remain available in historical records even if original sources later disappear.

Default citation periods use the note date. If text clearly describes a broader period, identify and explain it; don't invent dates. Undated evidence can provide background, but a known current State also needs dated support. Unknown State uses `value: null`, `confidence: unknown` and no invented evidence.

Primary evidence: explicitly supplied/authorized original documents and actual user Fragment/Event/Outcome/Correction/Calibration testimony. Outside notes explicitly marked `authored_by: agent` or `generated_by: agent`/`ai` are excluded. Unmarked notes still need Agent inspection; the filesystem cannot prove authorship.

Context only: AI State, Pattern, Simulation, Decision and Reflection. Structural links preserve the reasoning graph; the validator rejects them as primary citations. A lesson updating a State must cite actual Outcome/original notes. A choice establishes what was chosen, not that the action was completed. A Correction establishes disagreement, not necessarily a new causal fact.

Attach evidence, available counter-evidence, time ranges and related Decision/Outcome references to important claims. Multiple quotes from one document are not independent sources. Distinguish correlated events from a causal explanation.

For important interview interpretations, keep a short evidence note in the assertion's Markdown: evidence type, source independence, time/context diversity, counter-evidence, alternatives and what would disconfirm it. Self-report of recent behavior is still testimony; actual decisions and Outcomes have different evidential roles. Several answers from one conversation or copied accounts of one event are not independent corroboration. Agreement after an AI suggestion is calibration, not an independent discovery of the same pattern. No evidence-count threshold establishes a hypothesis's validity.

Verify consequential self-reports through a recent example, failure conditions, duration or a counterexample, one question at a time. An unresolved claim stays self_report/unverified; inability to recall an example never proves the opposite. Knowledge is what can be explained, Experience is what has been tried, Skill needs repeatable performance in specified conditions. Keep them separate in claims and simulations. Prior Self Knowledge remains high-information / low-authority even when it suggests a useful question.

If sources are absent, conflicting or not comparable, say **Insufficient historical evidence**. Retrieval is lexical candidate search: use multiple terms, synonyms and linked records before treating absence as meaningful. Disclose search scope and skipped files. Unknown is a valid output.

Prior Self Knowledge is a derived model, kept in the private Instance with provenance and unknown dates intact. It can support only explicitly provisional assertions via prior_refs, never raw-fact evidence or independent corroboration. Correction/supersession makes dependent claims unavailable. Consumption Fragments reflect reported attention; one consumed work cannot establish stable values.

Sources are user-controlled, not a single application as source of truth. Authorization and scopes are rechecked at each source operation. No source discovery, implicit whole-folder access, or cached-evidence fallback after revocation. Historical private quotes are retained, but do not make a revoked source available again.
