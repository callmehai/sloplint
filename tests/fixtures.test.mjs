// Contract tests for the checker. In the slop fixtures every element marked data-tell="ID" must be
// reported with that id (on itself, an ancestor or a descendant); page-level tells must appear at
// all. The clean fixtures must score 0 at desktop and phone width.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { scanStatic } from '../skills/sloplint/checker/static.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DETECT = readFileSync(join(ROOT, 'skills/sloplint/checker/detect.js'), 'utf8')
const REGISTRY = JSON.parse(readFileSync(join(ROOT, 'skills/sloplint/tells.json'), 'utf8'))
const TELLS = Object.fromEntries(REGISTRY.tells.map((t) => [t.id, t]))
const fixture = (name) => pathToFileURL(join(ROOT, 'fixtures', name)).href

let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser?.close() })

async function run(name, { width = 1440, height = 900, mobile = false, hover = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile })
  await page.goto(fixture(name))
  await page.waitForTimeout(300)
  await page.mouse.move(1, 1)
  const result = await page.evaluate(`(${DETECT})({ mark: true, limit: 1000 })`)
  // For every marked element: which expected ids were found on it, an ancestor, or a descendant.
  const marked = await page.evaluate(() =>
    [...document.querySelectorAll('[data-tell]')].map((e) => {
      const near = new Set()
      const collect = (n) => (n.getAttribute('data-slop-found') ?? '').split(/\s+/).filter(Boolean).forEach((id) => near.add(id))
      for (let n = e; n && n.nodeType === 1; n = n.parentElement) collect(n)
      e.querySelectorAll('[data-slop-found]').forEach(collect)
      return { expect: e.getAttribute('data-tell').split(/\s+/), found: [...near], html: e.outerHTML.slice(0, 120) }
    }),
  )
  await page.close()
  return { ...result, marked }
}

/** Distinct tells that count toward the score, applying each tell's threshold the way the CLI does. */
function counted(findings) {
  const n = {}
  for (const f of findings) n[f.id] = (n[f.id] ?? 0) + 1
  return [...new Set(findings.filter((f) => f.strong || n[f.id] >= (TELLS[f.id]?.min ?? 1)).map((f) => f.id))].sort()
}

for (const name of ['slop-app.html', 'slop-landing.html']) {
  test(`${name}: every marked tell is detected`, async () => {
    const r = await run(name)
    const pageIds = new Set(r.findings.map((f) => f.id))
    const missed = []
    for (const m of r.marked) {
      for (const id of m.expect) {
        if (!TELLS[id] || !TELLS[id].detect.includes('dom')) continue
        // Page-level tells (no element) only need to be present somewhere on the page.
        const pageLevel = r.findings.some((f) => f.id === id && !f.selector)
        if (!m.found.includes(id) && !pageLevel) missed.push(`${id} on ${m.html}`)
      }
    }
    assert.deepEqual(missed, [], `missed:\n${missed.join('\n')}`)
    assert.ok(pageIds.size >= 10, `only ${pageIds.size} tells found`)
  })
}

for (const name of ['clean-app.html', 'clean-landing.html']) {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844, mobile: true }]) {
    test(`${name} at ${vp.width}: no counted tells`, async () => {
      const r = await run(name, vp)
      const ids = counted(r.findings)
      const detail = r.findings.filter((f) => ids.includes(f.id)).map((f) => `${f.id} ${f.label} ${f.detail}`)
      assert.deepEqual(ids, [], detail.join('\n'))
    })
  }
}

test('static scanner: every static tell marked in the slop sources is found; the clean source is clean', () => {
  const found = scanStatic(join(ROOT, 'fixtures/static/slop'))
  const ids = new Set(found.map((f) => f.id))
  const marked = new Set()
  for (const file of ['slop.css', 'slop.tsx']) for (const m of readFileSync(join(ROOT, 'fixtures/static/slop', file), 'utf8').matchAll(/tell:\s*([A-Z]\d+)/g)) marked.add(m[1])
  const missing = [...marked].filter((id) => TELLS[id]?.detect.includes('static') && !ids.has(id))
  assert.deepEqual(missing, [], `static scanner missed ${missing.join(', ')}`)
  const clean = scanStatic(join(ROOT, 'fixtures/static/clean'))
  assert.deepEqual(clean.map((f) => `${f.id} ${f.file}:${f.line} ${f.text}`), [])
})
