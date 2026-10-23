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
    const line = (g) => `${g.kind} ${g.label} «${g.text}» ×${Math.max(g.before, g.after)} ${g.tells.join(' ')} ${g.changes.map((c) => c.join(' → ')).join('; ')}`
    const items = page.items.map(line)
    const has = (re) => items.filter((t) => re.test(t)).length
    assert.equal(has(/^removed span\.chip «Active» ×5 L10/), 1, items.join('\n'))
    assert.equal(has(/^changed main > h1 «People in Remit» ×1 +text → People → People in Remit$/), 1, items.join('\n'))
    assert.equal(has(/^changed span\.empty «No team» ×1 +color → rgb\(180, 186, 193\) → rgb\(89, 99, 110\)$/), 1, items.join('\n'))
    assert.equal(has(/^changed tr > td «Active» ×5/), 1, items.join('\n'))
    assert.equal(items.length, 4, items.join('\n'))
    // Boxes: the chips on the before screenshot only, each changed element on both.
    const html = readFileSync(join(dir, 'd', 'diff.html'), 'utf8')
    assert.equal(html.match(/class="box /g).length, 5 + 2 * (1 + 1 + 5))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
