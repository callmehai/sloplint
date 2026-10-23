# AGENTS.md

This repository is a kit for finding and fixing the patterns that make a web UI look AI-generated.

- The skill an agent follows is [skills/sloplint/SKILL.md](skills/sloplint/SKILL.md). Read it
  before building or reviewing any front-end screen in a project that uses this kit.
- The registry of tells is [skills/sloplint/tells.json](skills/sloplint/tells.json). Ids are
  stable: the checker, the scanner, the report and `references/tells.md` key on them.
- Changing the checker (`skills/sloplint/checker/`) means running `npm test` (fixture
  contract) and, for anything that changes what is detected, re-running the calibration in
  [docs/calibration.md](docs/calibration.md).
- Fixtures in `fixtures/` are the contract: every `data-tell` element in a slop page must be
  detected, and the clean pages must score 0 at 1440 and 390.
