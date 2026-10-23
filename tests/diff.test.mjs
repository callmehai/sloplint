// `sloplint diff` on a fixture pair whose differences are known: every one must come out as a
// numbered item with a box on the right screenshot, and nothing else may.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'skills/sloplint/checker/cli.mjs')
const sloplint = (...args) => execFileSync(process.execPath, [CLI, ...args], { cwd: ROOT, encoding: 'utf8' })

test('diff: the removed chips, the new text and the darker empty value are each boxed once', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sloplint-diff-'))
  try {
    // A scan exits 1 when it finds slop; the fixture is not meant to be clean.
    for (const [side, file] of [['b', 'before.html'], ['a', 'after.html']]) {
      try { sloplint('scan', `fixtures/diff/${file}`, '--out', join(dir, side), '--viewports', '1440', '--scope', 'app') } catch (e) { if (e.status !== 1) throw e }
    }
    sloplint('diff', join(dir, 'b'), join(dir, 'a'), '--out', join(dir, 'd'))
    const [page] = JSON.parse(readFileSync(join(dir, 'd', 'diff.json'), 'utf8')).pages
    assert.deepEqual(page.fixed, ['L10'])
    assert.deepEqual(page.new, [])
    const line = (g) => `${g.kind} ${g.label} «${g.text}» ×${Math.max(g.before, g.after)} fixes:${g.fixes.join(' ')} | ${g.summary.join('; ')}`
    const items = page.items.map(line)
    const has = (re) => items.filter((t) => re.test(t)).length
    // The chip removed from each status cell is one change of the cell, which fixes L10.
    assert.equal(has(/^fixed tr > td «Active» ×5 fixes:L10 \| span\.chip «Active» removed; text «» → «Active»$/), 1, items.join('\n'))
    assert.equal(has(/^changed main > h1 «People in Remit» ×1 fixes: \| text «People» → «People in Remit»$/), 1, items.join('\n'))
    assert.equal(has(/^changed span\.empty «No team» ×1 fixes: \| text colour$/), 1, items.join('\n'))
    assert.equal(items.length, 3, items.join('\n'))
    // Every card has a crop on both sides.
    const html = readFileSync(join(dir, 'd', 'diff.html'), 'utf8')
    assert.equal(html.match(/<article class="card"/g).length, 3)
    assert.equal(html.match(/class="crop"/g).length, 6)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
