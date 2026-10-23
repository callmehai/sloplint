# Calibration

The weights in `tells.json` are measured, not guessed: each tell's weight comes from how much more
often it appears on pages made with an AI site builder than on sites by professional design teams.

- **AI-built** (positive): 36 pages hosted on `*.lovable.app`, posted to Hacker News.
- **Reference** (negative): 33 sites of design systems and product companies.
- **Show HN** (context): 78 recent Show HN landing pages, the population Adrian Krebs measured.

Each page was scanned at 1440px with `--scope landing`; a tell counts on a page once it reaches its
threshold (`min`). Pages with fewer than 30 rendered elements (dead links, blank shells) were dropped.

## Result

| Set | Pages | Median score | Clean (0–2) | Some slop (3–6) | Slop (7+) |
|---|---:|---:|---:|---:|---:|
| Reference | 33 | 3 | 42% | 52% | 6% |
| AI-built | 36 | 11 | 6% | 17% | 78% |
| Show HN | 78 | 4 | 31% | 46% | 23% |

An AI-built page outscores a reference page **93%** of the time on held-out pages
(AUC, weights learned on the other half; 50% would be chance). On the full sets: 88% with the
calibrated weights, 61% with the research-based weights used before calibration.

## Per tell

Lift = how many times more common on AI-built pages than on reference pages (add-one smoothed).
Weight rule: lift ≥ 4 → 3, ≥ 2 → 2, ≥ 1.2 → 1, below → 0 (still reported as advice, not scored).
Tells too rare in both sets keep their research-based weight.

| Tell | AI-built | Reference | Show HN | Lift | Weight | Basis |
|---|---:|---:|---:|---:|---:|---|
| S1 One big radius on everything | 22% | 0% | 1% | 8.3 | 3 | measured |
| T1 Default face as the whole identity | 75% | 9% | 31% | 6.4 | 3 | measured |
| L5 Pill badge above the hero | 14% | 0% | 8% | 5.5 | 3 | measured |
| C3 Default indigo/violet primary | 19% | 3% | 0% | 3.7 | 2 | measured |
| T2 Trend display face | 14% | 3% | 14% | 2.8 | 2 | measured |
| T4 One accented word in a headline | 22% | 6% | 17% | 2.8 | 2 | measured |
| L9 Decorative status dots | 6% | 0% | 12% | 2.8 | 2 | measured |
| M4 Fade-up on every section | 22% | 6% | 13% | 2.8 | 2 | measured |
| W5 Template leakage | 6% | 0% | 3% | 2.8 | 2 | measured |
| C2 Gradient text | 39% | 15% | 9% | 2.3 | 2 | measured |
| S4 Soft shadow under every card | 39% | 15% | 5% | 2.3 | 2 | measured |
| S5 Border + shadow on one resting box | 53% | 24% | 33% | 2.0 | 2 | measured |
| L2 Icon in a tinted tile | 39% | 18% | 10% | 2.0 | 1 | measured |
| S9 Aurora/blob background | 25% | 12% | 10% | 1.8 | 1 | measured |
| W1 Buzzword copy | 3% | 0% | 0% | 1.8 | 2 | prior (too rare to measure) |
| W3 Copy that explains the screen | 8% | 3% | 9% | 1.8 | 1 | measured |
| S6 Glow and dramatic shadow | 33% | 18% | 37% | 1.7 | 1 | measured |
| M3 transition: all | 69% | 39% | 13% | 1.7 | 1 | measured |
| S7 Glassmorphism | 58% | 39% | 36% | 1.4 | 1 | measured |
| L7 Fake window chrome | 8% | 6% | 1% | 1.2 | 1 | measured |
| L8 Emoji and sparkles as icons | 47% | 39% | 22% | 1.2 | 0 | measured: not a discriminator, advice only |
| C1 Decorative gradient | 50% | 42% | 9% | 1.2 | 0 | measured: not a discriminator, advice only |
| W4 Exclamation marks and cheer | 11% | 9% | 4% | 1.2 | 0 | measured: not a discriminator, advice only |
| L4 Centred hero, then three icon cards | 19% | 18% | 8% | 1.1 | 0 | measured: not a discriminator, advice only |
| M2 Hover lift and scale | 28% | 27% | 27% | 1.0 | 0 | measured: not a discriminator, advice only |
| C4 Accent sprawl | 8% | 9% | 1% | 0.9 | 0 | measured: not a discriminator, advice only |
| C7 Cream + serif + terracotta | 0% | 0% | 3% | 0.9 | 2 | prior (too rare to measure) |
| L1 KPI tile row | 0% | 0% | 0% | 0.9 | 2 | prior (too rare to measure) |
| L3 Icon soup chip | 3% | 3% | 5% | 0.9 | 1 | prior (too rare to measure) |
| L6 01 / 02 / 03 markers | 14% | 15% | 24% | 0.9 | 0 | measured: not a discriminator, advice only |
| L10 Same badge on every row | 0% | 0% | 0% | 0.9 | 1 | prior (too rare to measure) |
| L12 Dash for an empty value | 0% | 0% | 0% | 0.9 | 1 | prior (too rare to measure) |
| W2 Generic call to action | 6% | 6% | 1% | 0.9 | 0 | measured: not a discriminator, advice only |
| A1 Low-contrast text | 47% | 55% | 41% | 0.9 | 0 | measured: not a discriminator, advice only |
| C5 Neon on near-black | 6% | 9% | 6% | 0.7 | 0 | measured: not a discriminator, advice only |
| M1 Endless motion | 28% | 42% | 27% | 0.7 | 0 | measured: not a discriminator, advice only |
| T3 Eyebrows and tracked caps | 19% | 33% | 59% | 0.6 | 0 | measured: not a discriminator, advice only |
| T5 Monospace as costume | 19% | 36% | 37% | 0.6 | 0 | measured: not a discriminator, advice only |
| T8 Stranded last word | 8% | 18% | 10% | 0.5 | 0 | measured: not a discriminator, advice only |
| L11 Middle-dot meta strings and glued arrows | 8% | 18% | 44% | 0.5 | 0 | measured: not a discriminator, advice only |
| T7 Text under 12px | 14% | 33% | 53% | 0.5 | 0 | measured: not a discriminator, advice only |
| S2 Mixed chip shapes and heights | 6% | 15% | 22% | 0.5 | 0 | measured: not a discriminator, advice only |
| S8 Cards inside cards | 3% | 9% | 4% | 0.5 | 0 | measured: not a discriminator, advice only |
| M5 Motion without a reduced-motion path | 0% | 3% | 4% | 0.5 | 1 | prior (too rare to measure) |
| S3 Coloured side stripe | 3% | 12% | 10% | 0.4 | 0 | measured: not a discriminator, advice only |
| L13 Competing primary buttons | 11% | 36% | 12% | 0.4 | 0 | measured: not a discriminator, advice only |
| W6 Invented social proof | 3% | 15% | 0% | 0.3 | 0 | measured: not a discriminator, advice only |
| T6 Many near-equal sizes | 0% | 12% | 33% | 0.2 | 0 | measured: not a discriminator, advice only |

## Two families of generated look

The data separates two families, and this calibration only learns the first.

- **Site-builder template** (the AI-built set): the default face as the whole identity (T1, 75%),
  one big radius on everything (S1), a pill badge above the hero (L5), an indigo primary (C3),
  gradient text (C2), a soft shadow under every card (S4). These are rare on professional sites,
  so they carry the weight.
- **Coding-agent "tasteful" look** (Show HN, 2026): eyebrows and tracked caps (T3, 59%), middle-dot
  meta strings and glued arrows (L11, 44%), text under 12px (T7, 53%), mono labels (T5), many
  near-equal sizes (T6), 01/02/03 markers (L6). These are *more* common on Show HN than on
  AI-builder pages, but professional sites use them too (Linear, Vercel and others set this
  style). So they score 0 here and are reported as advice.

Telling an agent-built page from a professional one that shares its style needs a labelled set of
agent-built pages. That is the next calibration to add.

## Limits

- The reference set is not slop-free: big product sites follow trends too, and several design
  system home pages are marketing pages. A tell that professional teams also use gets a low weight
  here, which is the point: the score measures *generated-looking*, not *bad*.
- Static-only and manual tells (A2, A3, A4, C6, L14, L15) are not measured here and keep their prior weight.
- The sets are small (33 and 36 pages after dropping dead links), so treat single-tell rates
  as rough; the overall separation is the robust result.
- Re-run after changing the checker: `node calibration/calibrate.mjs <ref> <ai> [<hn>] --write`.
