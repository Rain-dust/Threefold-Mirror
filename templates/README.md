# Record drafting templates

These are **drafts**, not evidence or ready-to-append records. Replace every `REPLACE_*`, choose appropriate dates and epistemic status, and use actual user testimony. Never invent a choice/Outcome to fill a template. `data_origin: real` is appropriate only for real evidence; use fictional for simulations of a test subject.

All record types use the common fields in [record.md](record.md). Merge exactly one type-specific payload from [payloads.md](payloads.md) into the same frontmatter. No nested `payload` key. The schema rejects incomplete/unrecognized fields.

For each evidence entry, paste actual output from `npm run mirror -- cite`; repeat entries for counter-evidence where available. For a complete populated example of each type, see the [fictional Vault](../examples/golden-vault/ThreefoldMirror/). Do not reuse its fictional citations for a real person.

Write a readable body: assertion and limits for State/Pattern, options and tradeoffs for Decision, branches with assumptions/risks for Simulation, actual testimony for Event/Outcome/Correction, and sourced comparison/lessons for Reflection. Primary `statement` must appear verbatim in the body.

Prepare drafts in the private Instance outside its canonical ThreefoldMirror tree and outside Public Core; then `append --file` into the Memory path. Draft or half-filled notes must not enter `ThreefoldMirror/`, where malformed records stop loading. A fixed ID supports safe retries.

For onboarding fields, use [bootstrap payloads](bootstrap-payloads.md). [Local config](local-config.example.json) and [source grant](source-grant.example.json) are placeholder templates only; the default config has no sources.
