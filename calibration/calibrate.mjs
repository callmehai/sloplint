// Turns scan reports of three corpora into per-tell prevalence, lift and suggested weights.
//   node calibration/calibrate.mjs <reference report.json[,…]> <ai-built report.json[,…]> [<show-hn report.json[,…]>] [--write]
// Positive set: pages made with an AI site builder (ground truth: generated). Negative set: sites
// by professional design teams. Show HN is a mixed population, shown for context (Krebs' corpus).
// --write updates the weights in tells.json and rewrites docs/calibration.md.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REG_PATH = join(ROOT, 'skills/anti-ai-slop/tells.json')
const registry = JSON.parse(readFileSync(REG_PATH, 'utf8'))
const TELLS = Object.fromEntries(registry.tells.map((t) => [t.id, t]))
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const write = process.argv.includes('--write')
const [refPath, aiPath, hnPath] = args

/** Per page: the set of tells that count (threshold applied), from raw findings. */
function pages(paths) {
  // A set may be split across several reports (parallel scans): pass them comma-separated.
  const results = paths.split(',').flatMap((p) => JSON.parse(readFileSync(p, 'utf8')).results)
  return results
    .filter((r) => !r.error && r.findings && r.stats?.elements > 30) // dead or empty pages say nothing
    .map((r) => {
      const n = {}
      for (const f of r.findings) n[f.id] = (n[f.id] ?? 0) + 1
      const ids = new Set(r.findings.filter((f) => f.strong || n[f.id] >= (TELLS[f.id]?.min ?? 1)).map((f) => f.id))
      return { url: r.url, ids }
    })
}
const rate = (set, id) => set.filter((p) => p.ids.has(id)).length / set.length

const ref = pages(refPath)
const ai = pages(aiPath)
const hn = hnPath ? pages(hnPath) : []

// Lift with add-one smoothing so a tell absent from the reference set does not divide by zero.
const liftOf = (A, R, id) => (rate(A, id) * A.length + 1) / (A.length + 2) / ((rate(R, id) * R.length + 1) / (R.length + 2))
const lift = (id) => liftOf(ai, ref, id)
const weightFrom = (A, R, id) => {
  const a = rate(A, id), r = rate(R, id)
  if (a < 0.05 && r < 0.05) return { weight: TELLS[id].weight, basis: 'prior (too rare to measure)' }
  const l = liftOf(A, R, id)
  if (l >= 4) return { weight: 3, basis: 'measured' }
  if (l >= 2) return { weight: 2, basis: 'measured' }
  if (l >= 1.2) return { weight: 1, basis: 'measured' }
  return { weight: 0, basis: 'measured: not a discriminator, advice only' }
}
const suggest = (id) => {
  const a = rate(ai, id), r = rate(ref, id)
  if (a < 0.05 && r < 0.05) return { weight: TELLS[id].weight, basis: 'prior (too rare to measure)' }
  const l = lift(id)
  if (l >= 4) return { weight: 3, basis: 'measured' }
  if (l >= 2) return { weight: 2, basis: 'measured' }
  if (l >= 1.2) return { weight: 1, basis: 'measured' }
  return { weight: 0, basis: 'measured: not a discriminator, advice only' }
}

const domTells = registry.tells.filter((t) => t.detect.includes('dom'))
const rows = domTells.map((t) => ({ t, ai: rate(ai, t.id), ref: rate(ref, t.id), hn: hn.length ? rate(hn, t.id) : null, lift: lift(t.id), ...suggest(t.id) }))

// Score distribution with the suggested weights.
const weights = Object.fromEntries(rows.map((r) => [r.t.id, r.weight]))
const scoreOf = (p) => [...p.ids].reduce((s, id) => s + (weights[id] ?? TELLS[id]?.weight ?? 0), 0)
const dist = (set) => {
  const s = set.map(scoreOf).sort((a, b) => a - b)
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))]
  const band = (lo, hi) => s.filter((v) => v >= lo && v <= hi).length / s.length
  return { n: s.length, median: q(0.5), p25: q(0.25), p75: q(0.75), clean: band(0, 2), some: band(3, 6), slop: band(7, Infinity) }
}
const D = { ref: dist(ref), ai: dist(ai), hn: hn.length ? dist(hn) : null }
// How often an AI-built page scores above a reference page (AUC).
let wins = 0
for (const a of ai) for (const r of ref) wins += scoreOf(a) > scoreOf(r) ? 1 : scoreOf(a) === scoreOf(r) ? 0.5 : 0
const auc = wins / (ai.length * ref.length)

// Held-out check: weights learned on even-indexed pages, AUC measured on odd-indexed ones.
const half = (set, odd) => set.filter((_, i) => i % 2 === (odd ? 1 : 0))
const trainW = Object.fromEntries(domTells.map((t) => [t.id, weightFrom(half(ai, false), half(ref, false), t.id).weight]))
const scoreW = (p, w) => [...p.ids].reduce((s, id) => s + (w[id] ?? TELLS[id]?.weight ?? 0), 0)
let hw = 0
const ta = half(ai, true), tr = half(ref, true)
for (const a of ta) for (const r of tr) hw += scoreW(a, trainW) > scoreW(r, trainW) ? 1 : scoreW(a, trainW) === scoreW(r, trainW) ? 0.5 : 0
const heldOut = hw / (ta.length * tr.length)
// And with the research-based prior weights, before any calibration.
const priorW = Object.fromEntries(registry.tells.map((t) => [t.id, t.weight]))
let pw = 0
for (const a of ai) for (const r of ref) pw += scoreW(a, priorW) > scoreW(r, priorW) ? 1 : scoreW(a, priorW) === scoreW(r, priorW) ? 0.5 : 0
const priorAuc = pw / (ai.length * ref.length)

const pct = (v) => (v === null ? '' : `${Math.round(v * 100)}%`)
const md = `# Calibration

The weights in \`tells.json\` are measured, not guessed: each tell's weight comes from how much more
often it appears on pages made with an AI site builder than on sites by professional design teams.

- **AI-built** (positive): ${ai.length} pages hosted on \`*.lovable.app\`, posted to Hacker News.
- **Reference** (negative): ${ref.length} sites of design systems and product companies.
${hn.length ? `- **Show HN** (context): ${hn.length} recent Show HN landing pages, the population Adrian Krebs measured.\n` : ''}
Each page was scanned at 1440px with \`--scope landing\`; a tell counts on a page once it reaches its
threshold (\`min\`). Pages with fewer than 30 rendered elements (dead links, blank shells) were dropped.

## Result

| Set | Pages | Median score | Clean (0–2) | Some slop (3–6) | Slop (7+) |
|---|---:|---:|---:|---:|---:|
| Reference | ${D.ref.n} | ${D.ref.median} | ${pct(D.ref.clean)} | ${pct(D.ref.some)} | ${pct(D.ref.slop)} |
| AI-built | ${D.ai.n} | ${D.ai.median} | ${pct(D.ai.clean)} | ${pct(D.ai.some)} | ${pct(D.ai.slop)} |
${D.hn ? `| Show HN | ${D.hn.n} | ${D.hn.median} | ${pct(D.hn.clean)} | ${pct(D.hn.some)} | ${pct(D.hn.slop)} |\n` : ''}
An AI-built page outscores a reference page **${pct(heldOut)}** of the time on held-out pages
(AUC, weights learned on the other half; 50% would be chance). On the full sets: ${pct(auc)} with the
calibrated weights, ${pct(priorAuc)} with the research-based weights used before calibration.

## Per tell

Lift = how many times more common on AI-built pages than on reference pages (add-one smoothed).
Weight rule: lift ≥ 4 → 3, ≥ 2 → 2, ≥ 1.2 → 1, below → 0 (still reported as advice, not scored).
Tells too rare in both sets keep their research-based weight.

| Tell | AI-built | Reference | ${hn.length ? 'Show HN | ' : ''}Lift | Weight | Basis |
|---|---:|---:|${hn.length ? '---:|' : ''}---:|---:|---|
${rows.sort((a, b) => b.lift - a.lift).map((r) => `| ${r.t.id} ${r.t.title} | ${pct(r.ai)} | ${pct(r.ref)} | ${hn.length ? pct(r.hn) + ' | ' : ''}${r.lift.toFixed(1)} | ${r.weight} | ${r.basis} |`).join('\n')}

## Limits

- The reference set is not slop-free: big product sites follow trends too, and several design
  system home pages are marketing pages. A tell that professional teams also use gets a low weight
  here, which is the point: the score measures *generated-looking*, not *bad*.
- Static-only and manual tells (A2, A3, A4, C6, L14, L15) are not measured here and keep their prior weight.
- Re-run after changing the checker: \`node calibration/calibrate.mjs <ref> <ai> [<hn>] --write\`.
`

console.log(md)
if (write) {
  for (const r of rows) {
    const t = registry.tells.find((x) => x.id === r.t.id)
    t.weight = r.weight
  }
  writeFileSync(REG_PATH, JSON.stringify(registry, null, 2) + '\n')
  writeFileSync(join(ROOT, 'docs/calibration.md'), md)
  console.error('tells.json weights and docs/calibration.md updated')
}
