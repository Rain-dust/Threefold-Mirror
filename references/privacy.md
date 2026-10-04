# Privacy Boundary

Threefold Mirror = public Mirror Core + private Personal Instance. A clone gives the method for creating a Mirror, never the author's model.

| Boundary | Contents |
| --- | --- |
| PUBLIC | Core, Skills, schemas, workflows, adapters, evidence/interview protocols, templates, tests, explicitly fictional examples |
| PRIVATE | Self Model, States, Patterns, Decisions, Simulations, Outcomes, Corrections, imported profiles, private evidence references, Life Fragments, user-specific settings |
| NEVER COMMIT | API keys, absolute private paths, personal model data, private cache, embeddings, identifiers, source configuration |

Production initialization rejects an instance inside Public Core, any instance containing Public Core, any instance inside a Git repository, and symlink/junction paths. The local composition layer rejects overlapping Life Source / Store directories. It checks only supplied paths and exact ancestor `.git` sentinels, never enumerates user directories to find a source. Public tests use isolated fictional temporary instances; the original co-located Golden Path is confined to its legacy fixture harness.

An ignored `.threefold-mirror.local.*` file can point to `instance_path`, `configured_sources`, scopes and grants. Default configuration has no sources. Public examples contain placeholders, not real absolute paths. The Instance's Markdown and `.mirror-cache` live outside this repository. Keep drafts there too, outside the canonical `ThreefoldMirror/` tree until validated.

`.gitignore` protects local config, caches, root framework records, common private folders, keys and embedding files. `npm run privacy:audit` inspects Git-tracked and unignored files in this repository for obvious private paths, personal records, configurations and key-like values. It allows the exact blank template and explicitly fictional examples. Tests cover the guard and `git check-ignore` behavior. This lightweight audit cannot recognize every personal sentence, identifier, credential, copied quote or leak in existing Git history. It neither deletes files nor claims to be DLP.

Ordinary clone/pull/push therefore does not include the external Instance by default. Force-adding ignored files or manually copying private content can still leak data. Review changes before publication. No public publishing or real-data migration is performed by the golden scripts.

Reading sources does not grant writing to them. Source adapters have no write method. Core stores only needed quotations/references and structured understanding, not a replicated life archive. Source revocation stops future access, makes dependent assertions stale, and leaves the user's existing private history intact.

This implementation does not call a remote model. The invoking Agent's runtime determines whether conversation or retrieved evidence is sent to a remote model. Local storage alone is not a claim of end-to-end offline processing.
