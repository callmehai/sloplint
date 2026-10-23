# sloplint

Find the UI patterns that make a web front-end look AI-generated, and replace them with what
professional design systems actually do. Works on product UIs (admin screens, dashboards, tables,
forms) and on landing pages.

[Tiếng Việt](README.vi.md)

> **Status: early.** The tell list, the weights and the checker are young. Expect false positives
> and changes to IDs before 1.0. If the checker flags something it should not, open an issue with
> the page, the tell ID and what you expected.

## What "AI slop" is

Language models write front-ends by sampling the most likely choice at every step, and the most
likely choice is whatever was safest and most common in their training data: Inter, an indigo
button, a purple gradient, three icon cards under a centred hero. Anthropic calls this
*distributional convergence*; the result is a UI that could belong to any product, which readers
have learned to recognise as "AI slop".

None of these patterns is wrong on its own, and many templates looked like this before AI. What
gives a page away is several of them together, with nothing specific to the product in their
place.

## What the kit gives you

- **A registry of 54 tells** (`skills/sloplint/tells.json`), each with an ID, scope (app,
  landing or both), weight and a concrete fix.
- **A DOM checker** (`skills/sloplint/checker/detect.js`) that runs inside the rendered page
  and measures computed styles, so it sees what your CSS framework actually produced.
- **A CLI** that loads pages in Chromium at desktop and phone width, scores them and writes an
  HTML report with annotated screenshots, plus a static scanner for source files.
- **A before/after diff** that boxes every change between two scans with the same number on both
  screenshots: tells removed, tells added, and every other visible change, so no fix goes unseen.
- **An agent skill** (`skills/sloplint/SKILL.md`) for Claude Code, Codex, Cursor and other
  agents, so the tells are avoided while the code is written, not only caught afterwards.
- **References** with the evidence behind every fix:
  - `references/tells.md`: each tell, why it reads as generated, how to fix it
  - `references/design-systems.md`: what Cloudscape, Carbon, Atlassian, Primer, Fluent 2,
    Material 3 and Apple HIG agree on, with numbers and links
  - `references/copy.md`: buzzwords, generic CTAs, template leaks and error messages, in English
    and Vietnamese
  - `references/sources.md`: the research, community skills and design systems this kit draws on

## Quick start

> `sloplint` is not on npm yet. Until it is, run it straight from GitHub with
> `npx github:callmehai/sloplint <command>`, or from a clone with
> `node skills/sloplint/checker/cli.mjs <command>`. Both take the same commands as `npx sloplint` below.

`scan` drives Chromium through Playwright, which you install once:

```bash
npm i -D playwright && npx playwright install chromium
```

Scan a running page:

```bash
npx sloplint scan http://localhost:5173 --scope app
```

Full usage:

```text
npx sloplint scan <url...> [--viewports 1440,390] [--scope app|landing|both]
                               [--config .slop.json] [--out slop-report] [--hover]
                               [--setup login.mjs] [--storage-state auth.json] [--wait 600]
```

`scan` loads each URL in Chromium at each viewport width (390 runs with touch emulation), runs the
in-page checker and writes:

- `slop-report/report.json`: findings per page and viewport
- `slop-report/report.html`: the readable report
- annotated screenshots showing where each tell was found

`--hover` also hovers interactive elements at desktop widths and measures whether they move, which
M2 needs. If a `.slop.json` sits in the current directory it is read without `--config`.

Signed-in screens: `--setup login.mjs` runs a module in every fresh browser context before the
page loads, so each page gets its own session (apps that rotate refresh tokens break a shared
storage state after the first page):

```js
// login.mjs
export default async ({ context, url }) => {
  await context.request.post(new URL('/api/auth/login', url).href, { data: { email: process.env.SCAN_EMAIL, password: process.env.SCAN_PASSWORD } })
}
```

Compare two scans of the same screens, taken before and after a change:

```bash
npx sloplint scan <urls> --out before     # on the old build
npx sloplint scan <urls> --out after      # on the new build, same URLs
npx sloplint diff before after --out slop-diff
```

`diff` pairs pages by path and width, then compares every visible element: its text, the computed
styles a reader can see (colour, size, weight, background, border, radius, shadow, spacing), its
`::before`/`::after`, its icon, and the tells found on it. Each change becomes a numbered card: one
sentence on what changed ("icon added, ::before marker removed, background removed") and the same
region cropped from both screenshots, outlined green where a tell was fixed, red where one
appeared, blue for any other change. The same change on many rows is one card, and a child added
or removed (an icon, a chip) is a change of its parent. Full screenshots with every change boxed
sit under each page. `slop-diff/diff.json` holds the same items for an agent to read. Each scan
keeps an element snapshot and a 2x screenshot with scrolling panels opened for this;
`--no-snapshot` skips them.

Scan source files without a browser:

```bash
npx sloplint static src
```

`static <dir>` reads CSS, SCSS, TSX, JSX, HTML, Vue and Svelte files for the tells marked `static`
in the table below and prints `file:line` findings.

### Without the CLI

The checker is a single arrow function, so any tool that can run script in a page can use it.

Playwright:

```js
import { readFileSync } from 'node:fs';

const detect = readFileSync('skills/sloplint/checker/detect.js', 'utf8');
const options = { ignore: ['.third-party-widget'], allow: {} };
const result = await page.evaluate(`(${detect})(${JSON.stringify(options)})`);
// result.findings: [{ id, label, selector, rect, detail, allowed?, reason? }]
```

chrome-devtools MCP: pass the text of `detect.js` as the `function` argument of
`evaluate_script`.

The options take the `ignore` and `allow` entries of `.slop.json`. The comment at the top of
`detect.js` lists the rest, including `copy`, which takes the word lists from the JSON block at
the end of `references/copy.md` (the CLI passes them for you; without them the checker uses a
shorter built-in list). The raw checker returns findings, not a score: add up the weights from
`tells.json` as described below.

## How the score works

Each tell has a **weight measured on real pages** (see [docs/calibration.md](docs/calibration.md)):
how much more often it appears on pages made with an AI site builder than on sites by professional
design teams.

- **3**: at least 4× more common on AI-built pages (one face for everything, one big radius on
  everything, a pill badge above the hero)
- **2**: 2–4× more common (indigo primary, gradient text, a soft shadow under every card)
- **1**: somewhat more common
- **0, advice**: just as common on professional sites (decorative gradients, endless motion,
  tracked caps, low contrast). Still reported with its fix, but not scored: it is a design-quality
  note, not a sign of generation.

A tell counts once it reaches its threshold (`min` in `tells.json`; for example, one gradient is
not a pattern, two are). The score for a page is the **sum of the weights of the distinct tells
present**, after exceptions. Each page is scored separately at each viewport.

| Score | Band |
|---|---|
| 0–2 | clean |
| 3–6 | some slop |
| 7+ | slop |

How well it separates (held-out pages, `--scope landing`, 1440px):

| Set | Median | Clean | Slop |
|---|---:|---:|---:|
| 33 professional sites | 3 | 42% | 6% |
| 36 AI-built pages (`*.lovable.app`) | 11 | 6% | 78% |
| 78 Show HN pages | 4 | 31% | 23% |

An AI-built page outscores a professional one 93% of the time on held-out pages. The calibration
covers the site-builder look; the newer coding-agent look (eyebrows, mono labels, middle dots)
is shared with professional sites and only reported as advice for now.

A clean score means the page avoids the generic defaults. It does not mean the page is good:
a page with every tell removed and nothing put in its place is still empty.

## Project exceptions

Some tells are deliberate choices. A brand that really is violet, or a table style with uppercase
headings, is not slop. Record those in `.slop.json` (read from the current directory, or pass
another path with `--config`):

```json
{
  "scope": "app",
  "allow": {
    "C1": "Sidebar gradient is part of the brand (ADR-12)",
    "T3": { "selector": "th", "reason": "Uppercase column headings are our table style" }
  },
  "ignore": [".third-party-widget"]
}
```

- `scope`: which tells count. `app` skips landing-only tells, `landing` skips app-only tells;
  tells scoped `both` always count. `--scope` on the command line wins over this field.
- `allow`: tells the project accepts, each with a reason. A string allows the tell everywhere; an
  object with a `selector` allows it only on matching elements. Allowed findings still appear in
  the report, marked as allowed, but add nothing to the score.
- `ignore`: selectors whose elements are not checked at all, for embedded widgets you do not
  control.

Every exception carries a reason, so a reviewer can see why a pattern stays. The agent skill reads
the same file and will not "fix" what it allows.

## Install as a skill

**Claude Code.** Copy the skill folder into your user or project skills:

```bash
cp -r skills/sloplint ~/.claude/skills/    # every project
cp -r skills/sloplint .claude/skills/      # this project only
```

**Codex and other agents that read AGENTS.md.** Keep `skills/sloplint` in the repository and
point at it:

```markdown
## UI
Before building or reviewing any UI, read `skills/sloplint/SKILL.md` and follow it.
```

**Cursor.** Copy `integrations/cursor/sloplint.mdc` into `.cursor/rules/`. The rule loads for
style and component files and points Cursor at `skills/sloplint/SKILL.md`, so keep the skill
folder at that path or edit the path in the rule.

## The tells

Generated from `skills/sloplint/tells.json`. Scope: `app` = product UI, `landing` = marketing
pages. Detect: `dom` = the in-page checker, `static` = the source scanner, `manual` = needs a person
or an agent reading the screen. Fixes are in `references/tells.md`.

| ID | Tell | Scope | Weight | Detect |
|---|---|---|---|---|
| C1 | Decorative gradient | both | 0 | dom, static |
| C2 | Gradient text | both | 2 | dom, static |
| C3 | Default indigo/violet primary | both | 2 | dom, static |
| C4 | Accent sprawl | both | 0 | dom |
| C5 | Neon on near-black | landing | 0 | dom |
| C6 | Untouched framework palette | both | 1 | static |
| C7 | Cream + serif + terracotta | landing | 2 | dom |
| T1 | Default face as the whole identity | both | 3 | dom |
| T2 | Trend display face | landing | 2 | dom |
| T3 | Eyebrows and tracked caps | both | 0 | dom, static |
| T4 | One accented word in a headline | landing | 2 | dom |
| T5 | Monospace as costume | both | 0 | dom |
| T6 | Many near-equal sizes | both | 0 | dom |
| T7 | Text under 12px | both | 0 | dom |
| T8 | Stranded last word | landing | 0 | dom |
| S1 | One big radius on everything | both | 3 | dom |
| S2 | Mixed chip shapes and heights | both | 0 | dom |
| S3 | Coloured side stripe | both | 0 | dom, static |
| S4 | Soft shadow under every card | both | 2 | dom |
| S5 | Border + shadow on one resting box | both | 2 | dom |
| S6 | Glow and dramatic shadow | both | 1 | dom, static |
| S7 | Glassmorphism | both | 1 | dom, static |
| S8 | Cards inside cards | both | 0 | dom |
| S9 | Aurora/blob background | landing | 1 | dom, static |
| L1 | KPI tile row | app | 2 | dom |
| L2 | Icon in a tinted tile | both | 1 | dom |
| L3 | Icon soup chip | both | 1 | dom |
| L4 | Centred hero, then three icon cards | landing | 0 | dom |
| L5 | Pill badge above the hero | landing | 3 | dom |
| L6 | 01 / 02 / 03 markers | landing | 0 | dom |
| L7 | Fake window chrome | landing | 1 | dom |
| L8 | Emoji and sparkles as icons | both | 0 | dom, static |
| L9 | Decorative status dots | both | 2 | dom |
| L10 | Same badge on every row | app | 1 | dom |
| L11 | Middle-dot meta strings and glued arrows | both | 0 | dom, static |
| L12 | Dash for an empty value | app | 1 | dom |
| L13 | Competing primary buttons | both | 0 | dom |
| L14 | Hero or welcome banner inside the app | app | 2 | manual |
| L15 | Charts standing in for content | app | 2 | manual |
| M1 | Endless motion | both | 0 | dom, static |
| M2 | Hover lift and scale | both | 0 | dom, static |
| M3 | `transition: all` | both | 1 | dom, static |
| M4 | Fade-up on every section | landing | 2 | dom, static |
| M5 | Motion without a reduced-motion path | both | 1 | dom, static |
| W1 | Buzzword copy | both | 2 | dom |
| W2 | Generic call to action | both | 0 | dom |
| W3 | Copy that explains the screen | both | 1 | dom, manual |
| W4 | Exclamation marks and cheer | both | 0 | dom |
| W5 | Template leakage | both | 2 | dom |
| W6 | Invented social proof | landing | 0 | dom, manual |
| A1 | Low-contrast text | both | 0 | dom |
| A2 | Focus ring removed | both | 2 | static |
| A3 | Only the happy path | both | 2 | manual |
| A4 | A toast for every action | app | 1 | manual |

## Credits

This kit stands on other people's work. Full notes are in
[references/sources.md](skills/sloplint/references/sources.md).

- **Adrian Krebs** for the only measured study of these patterns, and its method of checking
  computed styles in a real browser.
- **Anthropic** for the "distributional convergence" explanation, the frontend aesthetics cookbook
  and the `frontend-design` skill.
- **Nielsen Norman Group** for its work on AI prototyping and the sparkle icon.
- Community skills: **taste-skill** (Leonxlnx), **Impeccable** (Paul Bakaus), **Hallmark**
  (Nutlope / Together AI), **Uncodixfy** (cyxzdev), **antislop** (miqdadbadjuber), **DeSlop**
  (nate-zz), **Anti-AI-UI** (Vanszs), **no-slop-ui** (LeoStehlik) and **anti-ai-slop**
  (Vinayak-Shukla-03).
- The design system teams behind **Cloudscape, Carbon, Atlassian, Primer, Fluent 2, Material 3**
  and **Apple HIG**, whose public guidance is the baseline for every fix.

No text was copied from these projects; short quotes are attributed where they appear.

## Licence

MIT. See [LICENSE](LICENSE).
