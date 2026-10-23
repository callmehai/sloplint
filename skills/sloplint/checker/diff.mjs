// `sloplint diff`: compares two scan reports of the same screens, taken before and after a change,
// and draws a numbered box around every place that changed, on both screenshots. A score that went
// from 9 to 4 says little; the boxes show which tells went away, which appeared, and every other
// visible change (a colour, a text, a removed chip), so a reviewer can check each fix and see none
// is missing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const registry = JSON.parse(readFileSync(join(SKILL, 'tells.json'), 'utf8'))
const TELLS = Object.fromEntries(registry.tells.map((t) => [t.id, t]))
const MAX_ITEMS = 80

const parentKey = (k) => (k.includes('>') ? k.slice(0, k.lastIndexOf('>')) : null)
const counted = (r) => new Set([...(r.tells ?? []), ...(r.advice ?? [])])

/**
 * Compares two scan results of one screen (with their element snapshots) and returns numbered items:
 * { n, kind: 'fixed'|'new'|'changed'|'removed'|'added', label, text, changes, tells, before: [rect], after: [rect] }.
 */
export function diffPage(b, a) {
  const B = new Map(b.snapshot.elements.map((e) => [e.key, e]))
  const A = new Map(a.snapshot.elements.map((e) => [e.key, e]))
  const props = b.snapshot.props
  const inherited = new Set(props.slice(0, b.snapshot.inherited))
  const cb = counted(b), ca = counted(a)
  const tellsOf = (e, set) => (e?.tells ?? []).filter((id) => set.has(id))

  // 1. Per matched element: what a reader can see that differs.
  const entries = new Map()
  for (const [k, eb] of B) {
    const ea = A.get(k)
    if (!ea) continue
    const list = []
    if (eb.text !== ea.text) list.push(['text', eb.text, ea.text])
    props.forEach((p, i) => {
      if (eb.style[i] === ea.style[i]) return
      // A border colour follows the text colour by default; it only shows when the border has a width.
      const side = p.match(/^border-(top|left)-color$/)?.[1]
      if (side && [eb, ea].every((e) => e.style[props.indexOf(`border-${side}-width`)] === '0px')) return
      list.push([p, eb.style[i], ea.style[i]])
    })
    for (const p of new Set([...Object.keys(eb.pseudo ?? {}), ...Object.keys(ea.pseudo ?? {})])) {
      const x = eb.pseudo?.[p] ?? 'none', y = ea.pseudo?.[p] ?? 'none'
      if (x !== y) list.push([p, x, y])
    }
    if (eb.icon !== ea.icon) list.push(['icon', eb.icon ?? 'none', ea.icon ?? 'none'])
    entries.set(k, list)
  }
  // An inherited change shows on every descendant: keep it on the topmost element only.
  const same = (x, y) => x[0] === y[0] && x[1] === y[1] && x[2] === y[2]
  for (const [k, list] of entries) {
    const pl = entries.get(parentKey(k))
    if (pl) entries.set(k, list.filter((x) => !(inherited.has(x[0]) && pl.some((y) => same(x, y)))))
  }

  const raw = []
  for (const [k, list] of entries) {
    const eb = B.get(k), ea = A.get(k)
    const tb = tellsOf(eb, cb), ta = tellsOf(ea, ca)
    const fixed = tb.filter((id) => !ta.includes(id)), added = ta.filter((id) => !tb.includes(id))
    if (fixed.length) raw.push({ kind: 'fixed', el: eb, tells: fixed, changes: list, before: eb.rect, after: ea.rect })
    if (added.length) raw.push({ kind: 'new', el: ea, tells: added, changes: fixed.length ? [] : list, before: eb.rect, after: ea.rect })
    if (!fixed.length && !added.length && list.length) raw.push({ kind: 'changed', el: ea, tells: [], changes: list, before: eb.rect, after: ea.rect })
  }
  // 2. Elements only on one side: report the topmost one (its parent still exists on the other side).
  for (const [k, eb] of B) {
    if (A.has(k) || (parentKey(k) && B.has(parentKey(k)) && !A.has(parentKey(k)))) continue
    raw.push({ kind: 'removed', el: eb, tells: tellsOf(eb, cb), changes: [], before: eb.rect })
  }
  for (const [k, ea] of A) {
    if (B.has(k) || (parentKey(k) && A.has(parentKey(k)) && !B.has(parentKey(k)))) continue
    raw.push({ kind: 'added', el: ea, tells: tellsOf(ea, ca), changes: [], after: ea.rect })
  }

  // 3. The same change on many elements (a chip on every row) is one item with many boxes.
  const groups = new Map()
  for (const r of raw) {
    const gone = r.kind === 'removed' || r.kind === 'added'
    const sig = [r.kind, r.el.label, gone ? r.el.text : r.tells.join(' '),
      r.changes.map((c) => (c[0] === 'text' ? 'text' : c.join('|'))).join(';')].join('#')
    const g = groups.get(sig) ?? { kind: r.kind, label: r.el.label, text: r.el.text, tells: [], changes: r.changes, before: [], after: [] }
    g.tells = [...new Set([...g.tells, ...r.tells])]
    if (r.before) g.before.push(r.before)
    if (r.after) g.after.push(r.after)
    groups.set(sig, g)
  }
  const ORDER = { fixed: 0, new: 1, removed: 2, added: 2, changed: 3 }
  const top = (g) => Math.min(...[...g.before, ...g.after].map((r) => r.y))
  const items = [...groups.values()].sort((x, y) => ORDER[x.kind] - ORDER[y.kind] || top(x) - top(y))
  items.forEach((g, i) => { g.n = i + 1 })

  const pageFixed = [...cb].filter((id) => !ca.has(id)).sort()
  const pageNew = [...ca].filter((id) => !cb.has(id)).sort()
  const matched = [...B.keys()].filter((k) => A.has(k)).length
  return {
    items: items.slice(0, MAX_ITEMS), more: Math.max(0, items.length - MAX_ITEMS), pageFixed, pageNew,
    // Inserting one element shifts the keys of its later siblings; a low match rate means the
    // structure changed so much that the element pairing below is unreliable.
    matchRate: matched / Math.max(B.size, A.size, 1),
  }
}

/** Pairs results of two reports by path and viewport, falling back to order for renamed paths. */
function pair(before, after) {
  const key = (r) => { try { const u = new URL(r.url); return `${u.pathname}${u.search}${u.hash}@${r.viewport.tag}` } catch { return `${r.url}@${r.viewport.tag}` } }
  const left = [...after.results]
  const pairs = []
  for (const b of before.results) {
    const i = left.findIndex((a) => key(a) === key(b))
    if (i >= 0) pairs.push([b, left.splice(i, 1)[0]])
    else pairs.push([b, null])
  }
  for (const p of pairs) if (!p[1]) { const i = left.findIndex((a) => a.viewport.tag === p[0].viewport.tag); if (i >= 0) { p[1] = left.splice(i, 1)[0]; p[2] = true } }
  return pairs.filter((p) => p[1])
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const swatch = (v) => (/^rgba?\(/.test(v) ? `<i class="sw" style="background:${esc(v)}"></i>` : '')
const value = (v) => `${swatch(v)}<code>${esc(v === '' ? '""' : v)}</code>`

export function diffReports(beforeDir, afterDir, outDir) {
  const load = (d) => {
    const p = join(resolve(d), 'report.json')
    if (!existsSync(p)) throw new Error(`no report.json in ${d}: run sloplint scan --out ${d} first`)
    return JSON.parse(readFileSync(p, 'utf8'))
  }
  const before = load(beforeDir), after = load(afterDir)
  const out = resolve(outDir)
  mkdirSync(out, { recursive: true })
  const pages = []
  for (const [b, a, byOrder] of pair(before, after)) {
    if (b.error || a.error || !b.snap || !a.snap) { pages.push({ b, a, skipped: b.error || a.error || 'scanned without element snapshots: rescan with this version' }); continue }
    b.snapshot = JSON.parse(readFileSync(join(resolve(beforeDir), b.snap), 'utf8'))
    a.snapshot = JSON.parse(readFileSync(join(resolve(afterDir), a.snap), 'utf8'))
    pages.push({ b, a, byOrder, ...diffPage(b, a), shotB: relative(out, join(resolve(beforeDir), b.clean)), shotA: relative(out, join(resolve(afterDir), a.clean)) })
    delete b.snapshot; delete a.snapshot
  }
  const summary = pages.map((p) => ({ path: p.a.url, before: p.byOrder ? p.b.url : undefined, viewport: p.a.viewport.tag, score: [p.b.score, p.a.score], fixed: p.pageFixed, new: p.pageNew, skipped: p.skipped,
    items: p.items?.map((g) => ({ n: g.n, kind: g.kind, label: g.label, text: g.text, tells: g.tells, changes: g.changes, before: g.before.length, after: g.after.length })) ?? [] }))
  writeFileSync(join(out, 'diff.json'), JSON.stringify({ tool: 'sloplint', generated: new Date().toISOString(), pages: summary }, null, 2))
  writeFileSync(join(out, 'diff.html'), html(pages))
  return summary
}

const KIND = {
  fixed: 'tell fixed', new: 'new tell', changed: 'changed', removed: 'removed', added: 'added',
}

function html(pages) {
  const docs = pathToFileURL(join(SKILL, 'references', 'tells.md')).href
  const tellLinks = (ids) => ids.map((id) => `<a href="${docs}#${TELLS[id]?.slug ?? ''}" title="${esc(TELLS[id]?.title)}">${id}</a>`).join(' ')
  const rows = pages.map((p, i) => `<tr><td><a href="#p${i}">${esc(p.a.url)}</a></td><td class="num">${p.a.viewport.tag}</td><td class="num">${p.b.score} → ${p.a.score}</td><td>${tellLinks(p.pageFixed ?? [])}</td><td>${tellLinks(p.pageNew ?? [])}</td><td class="num">${p.skipped ? '–' : p.items.length + (p.more ? `+${p.more}` : '')}</td></tr>`).join('')
  // Plain changes are drawn first so the boxes about tells sit on top of them.
  const boxes = (p, side) => [...p.items].reverse().flatMap((g) => g[side].map((r, j) => {
    const tell = g.tells.length > 0
    const cls = g.kind === 'fixed' ? (side === 'before' ? 'k-bad' : 'k-ok') : g.kind === 'new' ? (side === 'after' ? 'k-bad' : 'k-chg')
      : g.kind === 'removed' && tell ? 'k-bad k-dash' : g.kind === 'changed' ? 'k-chg' : 'k-dash'
    // One number per group: on a list of rows, a label on every row would cover the rows.
    return `<a class="box ${cls}" href="#p${pages.indexOf(p)}-${g.n}" data-n="${g.n}" data-r="${r.x},${r.y},${r.w},${r.h}">${j === 0 ? `<span>${g.n}</span>` : ''}</a>`
  })).join('')
  const sections = pages.map((p, i) => {
    const head = `<h2>${esc(p.a.url)} <small>${p.a.viewport.tag}px · score ${p.b.score} → ${p.a.score}</small></h2>`
    if (p.skipped) return `<section id="p${i}">${head}<p class="error">${esc(p.skipped)}</p></section>`
    const warn = (p.byOrder ? `<p class="error">Paired by order: no page at ${esc(p.b.url)} in the after scan. If these are different screens, rescan with the same URLs.</p>` : '') + (p.matchRate < 0.6 ? `<p class="error">Only ${Math.round(p.matchRate * 100)}% of elements could be paired: the structure changed a lot, so some items below may be moves, not changes. Check the screenshots.</p>` : '')
    const items = p.items.map((g) => {
      const n = Math.max(g.before.length, g.after.length)
      const what = g.changes.slice(0, 6).map((c) => `<li><b>${esc(c[0])}</b> ${value(c[1])} → ${value(c[2])}</li>`).join('') + (g.changes.length > 6 ? `<li>… ${g.changes.length - 6} more properties</li>` : '')
      const tells = g.tells.length ? ` · ${g.kind === 'new' ? 'adds' : g.kind === 'fixed' ? 'fixes' : 'had'} ${g.tells.map((id) => `${tellLinks([id])} <span class="meta">${esc(TELLS[id]?.title)}</span>`).join(', ')}` : ''
      return `<li id="p${i}-${g.n}" data-n="${g.n}"><span class="n k-${g.kind}">${g.n}</span><div><b>${KIND[g.kind]}</b> <code>${esc(g.label)}</code>${g.text ? ` «${esc(g.text.slice(0, 50))}»` : ''}${n > 1 ? ` <span class="meta">× ${n}</span>` : ''}${tells}${what ? `<ul>${what}</ul>` : ''}</div></li>`
    }).join('')
    return `<section id="p${i}">${head}
<p class="meta">Tells gone: ${tellLinks(p.pageFixed) || 'none'} · new: ${tellLinks(p.pageNew) || 'none'}</p>${warn}
<div class="pair"><ol class="items">${items || '<li>No visible change.</li>'}${p.more ? `<li>… ${p.more} more changes not boxed</li>` : ''}</ol>
<figure><figcaption>Before</figcaption><div class="shot"><img src="${esc(p.shotB)}" alt="Before, ${esc(p.b.url)} at ${p.b.viewport.tag}px">${boxes(p, 'before')}</div></figure>
<figure><figcaption>After</figcaption><div class="shot"><img src="${esc(p.shotA)}" alt="After, ${esc(p.a.url)} at ${p.a.viewport.tag}px">${boxes(p, 'after')}</div></figure></div></section>`
  }).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>sloplint diff</title>
<style>
:root { --ink:#1b1f24; --muted:#59636e; --line:#d8dee4; --bg:#fff; --soft:#f6f8fa; --accent:#0b57d0; --ok:#1a7f37; --bad:#cf222e; --chg:#0b57d0; }
* { box-sizing:border-box } body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif }
main { max-width:1600px; margin:0 auto; padding:24px 16px 64px } h1 { margin:0 0 4px; font-size:22px } h2 { margin:0 0 4px; font-size:16px; overflow-wrap:anywhere }
h2 small, .meta, .lead { color:var(--muted); font-weight:400 } a { color:var(--accent) } .error { color:var(--bad) }
table { width:100%; border-collapse:collapse; margin:16px 0 32px } th, td { padding:8px 10px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; overflow-wrap:anywhere } th { font-weight:600; color:var(--muted) }
.num { text-align:right; font-variant-numeric:tabular-nums }
.legend { display:flex; flex-wrap:wrap; gap:16px; margin:8px 0 0 } .legend span::before { content:""; display:inline-block; width:14px; height:10px; margin-right:6px; vertical-align:-1px; border:2px solid }
.legend .l-bad::before { border-color:var(--bad) } .legend .l-ok::before { border-color:var(--ok) } .legend .l-chg::before { border-color:var(--chg) } .legend .l-dash::before { border:2px dashed var(--chg) }
section { padding:24px 0; border-top:1px solid var(--line) }
.pair { display:grid; grid-template-columns:minmax(260px,0.8fr) minmax(0,1fr) minmax(0,1fr); gap:16px; align-items:start; margin-top:12px }
.items { list-style:none; margin:0; padding:0; max-height:85vh; overflow:auto; position:sticky; top:8px } .items > li { display:flex; gap:8px; padding:6px 4px; border-bottom:1px solid var(--line); scroll-margin-top:8px }
.items > li.hl, .items > li:target { background:var(--soft) } .items ul { margin:4px 0 0; padding-left:16px } code { font-size:12px; overflow-wrap:anywhere }
.n { flex:none; min-width:22px; height:20px; padding:0 4px; color:#fff; font:600 12px/20px system-ui,sans-serif; text-align:center; border-radius:3px; background:var(--chg) }
.n.k-fixed { background:var(--ok) } .n.k-new { background:var(--bad) }
.sw { display:inline-block; width:10px; height:10px; margin-right:3px; border:1px solid var(--line); vertical-align:-1px }
figure { margin:0; min-width:0 } figcaption { font-weight:600; margin-bottom:4px } .shot { position:relative; border:1px solid var(--line); border-radius:6px; overflow:hidden }
.shot img { display:block; width:100% } .shot { cursor:zoom-in } .shot.zoom { overflow:auto; max-height:85vh; cursor:zoom-out } .shot.zoom img { width:auto; max-width:none }
.box { position:absolute; border:2px solid var(--chg); text-decoration:none } .box span { position:absolute; left:-2px; top:-18px; padding:0 4px; color:#fff; background:inherit; font:600 11px/16px system-ui,sans-serif }
.box.k-bad { border-color:var(--bad) } .box.k-bad span { background:var(--bad) } .box.k-ok { border-color:var(--ok) } .box.k-ok span { background:var(--ok) }
.box.k-chg span, .box.k-dash span { background:var(--chg) } .box.k-dash { border-style:dashed } .box.k-bad.k-dash span { background:var(--bad) }
.box.hl { outline:3px solid #f2c94c; z-index:1 } .box:not(:has(span)) { border-width:1.5px }
@media (max-width: 1100px) { .pair { grid-template-columns:1fr 1fr } .items { grid-column:1 / -1; position:static; max-height:none } }
@media (max-width: 640px) { .pair { grid-template-columns:1fr } }
</style></head><body><main>
<h1>sloplint diff</h1><p class="lead">Every visible change between two scans of the same screens, numbered on both screenshots. Hover an item or a box to light up its pair; click a screenshot for actual size.</p>
<p class="legend"><span class="l-bad">tell present</span><span class="l-ok">tell fixed here</span><span class="l-chg">other change</span><span class="l-dash">removed or added</span></p>
<table><thead><tr><th>Page</th><th class="num">Width</th><th class="num">Score</th><th>Tells gone</th><th>New tells</th><th class="num">Changes</th></tr></thead><tbody>${rows}</tbody></table>
${sections}</main>
<script>
// Boxes are stored in page pixels; scale them to the screenshot as drawn.
function place() {
  for (const shot of document.querySelectorAll('.shot')) {
    const img = shot.querySelector('img')
    if (!img.naturalWidth) continue
    const s = shot.classList.contains('zoom') ? 1 : img.clientWidth / img.naturalWidth
    const out = {}
    for (const b of shot.querySelectorAll('.box')) {
      const [x, y, w, h] = b.dataset.r.split(',').map(Number)
      // Rows inside a scrolling panel lie past the screenshot: say so instead of a clipped box.
      b.hidden = y >= img.naturalHeight || x >= img.naturalWidth
      if (b.hidden) out[b.dataset.n] = (out[b.dataset.n] ?? 0) + 1
      Object.assign(b.style, { left: x * s + 'px', top: y * s + 'px', width: Math.max(w * s, 4) + 'px', height: Math.max(h * s, 4) + 'px' })
    }
    const sec = shot.closest('section'), side = shot.closest('figure').querySelector('figcaption').textContent.toLowerCase()
    for (const [n, k] of Object.entries(out)) {
      const li = sec.querySelector('.items > li[data-n="' + n + '"] > div')
      if (li && !li.querySelector('.off-' + side)) li.insertAdjacentHTML('beforeend', '<div class="meta off-' + side + '">' + k + ' outside the ' + side + ' screenshot (scrolled panel)</div>')
    }
  }
}
document.querySelectorAll('.shot img').forEach((img) => img.complete ? place() : img.addEventListener('load', place))
addEventListener('resize', place)
for (const shot of document.querySelectorAll('.shot')) shot.addEventListener('click', (e) => {
  if (e.target.closest('.box')) return
  shot.classList.toggle('zoom')
  place()
})
// Hovering an item lights up its boxes in both screenshots, and the reverse.
const light = (sec, n, on) => sec.querySelectorAll('[data-n="' + n + '"]').forEach((e) => e.classList.toggle('hl', on))
for (const el of document.querySelectorAll('.items > li[data-n], .box')) {
  el.addEventListener('mouseenter', () => light(el.closest('section'), el.dataset.n, true))
  el.addEventListener('mouseleave', () => light(el.closest('section'), el.dataset.n, false))
}
</script></body></html>`
}
