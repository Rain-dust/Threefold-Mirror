# Obsidian data contract · v1

Existing notes need no migration or special fields. Read ordinary Markdown with optional YAML. Dates come from `occurred_at`, `date`, `observed_at`, `created_at`, then YYYY-MM-DD filename; never filesystem mtime. Unknown date stays unknown. Invalid source YAML is reported as a warning; invalid framework records stop loading.

| Type / folder | Durable meaning |
| --- | --- |
| event / Events | Actual testimony about experience, explicit choice or intervention. A plan remains a plan. |
| state / States | One dated, revisable assertion about a state key. |
| pattern / Patterns | A revisable interpretation with alternatives and a falsification question. |
| decision / Decisions | Question, alternatives, constraints, resources, review date. |
| simulation / Simulations | Conditional branches from a specific model and Decision. |
| outcome / Outcomes | Actual result linked to Decision, choice, simulation and interventions. |
| reflection / Reflections | Comparison and lessons with direct Outcome evidence. |
| correction / Corrections | User correction of a State/Pattern; immediately invalidates it. |

Every record has `schema_version: 1`, unique ID, type, title, UTC `created_at`, `authored_by`, `data_origin`, source period, evidence and counter-evidence. `data_origin` is real or fictional; fictional evidence cannot support a real record. `authored_by: user` means actual testimony, not an Agent assigning this label to its own theory. The CLI cannot authenticate authorship; this is an Agent responsibility.

`created_at` is when knowledge was recorded. Historical time belongs in `source_period`/`occurred_at`. Strictly increasing write timestamps prevent retroactive contamination of old simulations. Use UTC ISO instants with milliseconds; local event dates and expiry use ISO calendar days. No timezone is inferred from a filename.

Files live at `ThreefoldMirror/<folder>/<id>.md`; links use full vault-relative wikilinks. Frontmatter contains structured fields. Markdown body explains the record and repeats any primary `statement` verbatim. Frontmatter is authoritative for structured interpretation; contradictory body edits are not revisions.

New IDs publish complete files atomically by same-volume hard link. Same ID/content is a no-op; differing content is rejected. Revisions use `supersedes`; Correction uses `target`; corrected revisions link both the prior record and Correction. Nothing deletes the predecessor.

The writer uses `ThreefoldMirror/.write-lock/`. If a crash leaves it, verify no writer is active, remove only the empty lock directory, then retry the same ID. No automatic lock stealing. This is a cooperative local writer protocol, not protection against hostile concurrent filesystem mutation. Filesystems without hard-link support fail safely without a partial publish.

Multi-record workflows commit one valid record at a time. After Correction, the old state is already invalidated even if the replacement fails. After Outcome, reality is saved even if reflection fails. Resume missing work using existing IDs. Symlinks/junctions, escaping paths and overwrites are rejected. Hidden directories are skipped. Scan limits: 10,000 notes/directories, 2 MB per note, 100 MB total; exceeding a limit fails clearly.

`model` reconstructs State/Pattern projection and history. `rebuild` optionally writes `.mirror-cache/index.json`. No command reads that cache as authority; deleting it loses no information. It can contain private material and should not be committed. No external database or global connection registry is needed.

JSON Schema is generated from `core/schema.ts`. Other runtimes can implement this protocol. Schema validation alone cannot enforce chronology, evidence hashes, model fingerprints, expiry or graph integrity: use the CLI or reproduce those checks. Unknown schema versions fail; future migration must be explicit and confined to framework records.
