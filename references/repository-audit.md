# Repository audit and direction change

Audit date: 2026-09-29.

The starting directory contained an uncommitted App demo, with no Git commits at all. Before removal, source code was captured in local commit `3cef472` (`chore: preserve superseded UI demo before framework rebuild`). This is the archival boundary; the working tree does not retain a viewer or compatibility path.

Removed: React pages/components/navigation/state, mirror visuals and SVG, browser entry, Vite configuration/build, local HTTP API, browser tests, launcher, mock/demo seeding, offline keyword personality engine, model Provider layer, old configuration and documentation. Generated build output, browser results and local fictional demo vaults were also removed. No real personal vault was connected; the old local config pointed to its own fictional demo vault.

Pruned UI/server dependencies including React, React DOM, Express, Vite, Playwright and icon libraries. Current runtime dependencies are tsx, yaml and zod; development dependencies are TypeScript and Node types. There is no frontend build/start command.

The reusable design ideas retained are exact source hashing, safe vault path checks and atomic append. Their old App-specific implementation and schema were replaced with `core/` protocol primitives. No provider compatibility layer remains.

The final repository's product is its Agent protocol, schemas, workflows, provenance, temporal lifecycle and validated Markdown loop. The fictional Golden Path is integration evidence with adversarial counter-evidence and correction, not UI display data or a claim about the real user.

## Second architecture convergence · 2026-09-29

Baseline: all 20 protocol tests and the 16-record Temporal Golden Path passed before edits. The previous coupling was core/vault.ts scanning both source notes and framework records, mandatory --vault CLI input, same-directory write-back, and a Skill requiring a Vault before use.

Current boundary: core/store.ts reads only private Memory; core/sources.ts exposes opaque evidence operations; adapters/local-markdown.ts alone handles scoped source paths; core/session.ts composes the two. The original broad loader is retained solely in examples/legacy-vault.ts for immutable fictional regression data. Production no longer accepts --vault. Bootstrap is reconstructible from Interview, Fragment, Self Model and Calibration records; Prior is explicitly derived. Public/private path and consent guards plus a lightweight repository audit cover the new boundary.

No real data source was discovered, connected or migrated in this refactor. New cases and tests use fictional temporary directories. No UI, server, cloud account/OAuth, provider SDK or additional third-party integration was added.
