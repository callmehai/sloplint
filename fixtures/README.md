# Fixtures

Test pages for the checker (`checker/detect.js`) and the static scanner (`checker/static.mjs`).
The ids are the ones in [`skills/sloplint/tells.json`](../skills/sloplint/tells.json).

| File | What it is |
|---|---|
| `slop-app.html` | An invoicing admin dashboard as generators write it: gradient sidebar, KPI tiles, a badge on every row, nested cards, a form, AI-style copy. |
| `slop-landing.html` | The same product's marketing page as generators write it: pill above a centred dark hero, accent word, three icon cards, 01/02/03 steps, stat banner, "Trusted by" wall, fake window chrome, blobs, glass, fade-ups, emoji. |
| `clean-app.html` | The same dashboard done properly. Doubles as the kit's "what good looks like" example. |
| `clean-landing.html` | The same landing page done properly. |
| `static/slop.css`, `static/slop.tsx` | Source files covering every tell whose `detect` includes `static`. |
| `static/clean.css` | The stylesheet of `clean-app.html`, kept identical to it. |

Every page is self-contained: inline CSS, no fonts, scripts or network access. Fonts named in the
CSS (Inter, Space Grotesk, Avenir Next…) do not need to load; the checker reads the computed
`font-family`.

## The marking contract

These rules are what the tests assert. Keep them true when you edit a fixture.

**Slop pages.** Each element that shows a tell carries `data-tell="ID"`, with several ids
space-separated (`data-tell="C1 S6 M1"`). Page-wide tells (T1, T6, S1, M5) sit on `<body>`.

- Every tell whose `detect` includes `dom` is marked at least once across the two slop pages,
  on a page whose type matches its `scope`: `app` tells only in `slop-app.html`, `landing` tells
  only in `slop-landing.html`, `both` tells in either.
- Test: scan each slop page at 1440×900 and assert that **every id in its `data-tell`
  attributes is among the checker's findings** for that page. The checker may find more than
  is marked, but a fixture should not contain tells it does not mark.
- Tells that are only `manual` (L14, L15, A3, A4) appear in `slop-app.html` too, but are marked
  `data-tell-manual="ID"` so no test expects the checker to find them.
- Each instance is meant to be unambiguous and typical: the way a generator actually produces
  it, not a borderline case. Borderline cases belong in their own unit tests, not here.

**Clean pages.** They carry no `data-tell` at all.

- Test: scan each clean page at 1440×900 and at 390×844 and assert **zero findings**.
- Both must also fit 390px with no horizontal scroll (`scrollWidth === clientWidth`).
- What they hold to, so an edit does not quietly break it: neutral palette plus one brand colour
  (`#1a5fb4`); one solid button per page; borders, no resting shadows; no gradients, glows,
  glass or looping motion; a `prefers-reduced-motion` rule because hover colours transition;
  sentence-case labels, no uppercase tracking; nothing under 12px; at most five font sizes
  per viewport (app 12/14/16/20, landing 14/16/20/32/48, or 28/36 on a phone); radius 6px on
  controls and 8px on panels; status as text plus an icon whose shape differs per state;
  empty values in words ("Not provided", "Set when sent"); no "·", "—" or "→" joins; no
  exclamation marks; contrast at least 4.5:1 for all text; `tabular-nums` on every figure.

**Static files.** Above each instance in `slop.css` and `slop.tsx` is a comment naming the tell:
`/* tell: C1 */` in CSS and in JS/TS, `{/* tell: C1 */}` inside JSX children. Several ids are
space-separated. The comment marks the rule, declaration, element or line that starts right
below it. M5 is file-wide (animations with no reduced-motion rule) and is marked at its first
cause.

- Test: for every `tell:` comment, the scanner reports that id within the next few lines.
- Test: `static/clean.css` produces no findings.
- `slop.tsx` is valid TSX but is never compiled or run; its imports need not resolve.

## Changing a fixture

- Adding a tell to `tells.json` with `dom` or `static` in `detect` means adding a marked instance
  here in the same change.
- When the checker misses a marked instance, fix the checker unless the instance is genuinely
  atypical. Do not delete the mark to make a test pass.
- After editing a page, open it in a browser at 1440 and 390 and look at it: the clean pages should look
  like something a careful product team ships; the slop pages like typical 2025–2026 AI output.
