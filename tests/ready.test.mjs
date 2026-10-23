// A --setup module's ready() runs after load, so what a screen shows only after a click is measured;
// the hash that selects it keeps the two scans of one file apart in the report.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'skills/sloplint/checker/cli.mjs')

test('ready() opens the tab before the page is measured', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sloplint-ready-'))
  try {
    const page = pathToFileURL(join(ROOT, 'fixtures/ready/index.html')).href
    try {
      execFileSync(process.execPath, [CLI, 'scan', page, `${page}#tab=Trends`, '--viewports', '1440', '--setup', 'fixtures/ready/hooks.mjs', '--out', dir], { cwd: ROOT, encoding: 'utf8' })
    } catch (e) { if (e.status !== 1) throw e }
    const [plain, opened] = JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8')).results
    assert.ok(!plain.findings.some((f) => f.id === 'C2'), 'C2 found before the tab was opened')
    assert.ok(opened.findings.some((f) => f.id === 'C2'), 'C2 not found after ready() opened the tab')
    assert.notEqual(plain.shot, opened.shot)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
