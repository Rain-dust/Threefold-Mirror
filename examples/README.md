# Fictional Golden Path

All people, journals, choices and outcomes here are fictional. The question is realistic, but no action was chosen for the actual user. October records simulate later reality; do not copy them into a real personal vault.

`fixture.ts` contains an Agent-authored case and a fixture-specific conditional scenario. It is not a general reasoning engine. The actual framework asks the invoking Agent to reason using the Skill and workflows. The fixture proves parsing, provenance, lifecycle, linkage, changed-state branches and repeatability.

Run `npm run golden`. It reads `golden-vault/`, executes the full chain, validates every record, reconstructs the model and repeats the chain without duplicate writes. Inspect [GOLDEN_PATH_REPORT.md](GOLDEN_PATH_REPORT.md), then follow the linked records.

The initial novelty hypothesis is deliberately weak and disputed, with an available counterexample and an overlooked environmental explanation. The case exercises explicit user correction and preservation of the original judgment; it is not a recommended inference about the user.

The additional [Bootstrap Golden Path](BOOTSTRAP_GOLDEN_REPORT.md) executes conversation-only, imported-prior and scoped-source scenarios in private temporary directories outside the public repository. Its entire run is repeated for idempotency. The original co-located golden-vault remains a legacy fictional regression layout only; production CLI never uses its loader and requires separate Memory.

## Phase 3 protocol example

[Interview fixture](interview-fixture.ts) and [its generated report](INTERVIEW_GOLDEN_REPORT.md) exercise the five-stage methodology with scripted fiction, unknown/skip, temporary states and progressive calibration. Run `npm run golden:interview`; it uses an isolated temporary instance outside Public Core and checks replay idempotence. It is neither a fixed questionnaire nor evidence that an Agent understands real people. [User Zero](../USER_ZERO_PROTOCOL.md) has not yet been run.
